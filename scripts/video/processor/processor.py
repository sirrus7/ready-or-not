"""
Main MediaProcessor class that orchestrates the download, compression, and upload workflow.
"""

import tempfile
import threading
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Union
from enum import Enum

import requests
from supabase import create_client, Client

from utils.compression import VideoCompressor, ImageCompressor
from utils.logging_utils import setup_logging
from utils.stats import CompressionStats, StatsManager
from utils.file_utils import get_file_extension

class UploadResult:
    """Class to represent upload results with specific error types."""
    
    class ErrorType(Enum):
        SUCCESS = "success"
        FILE_TOO_LARGE = "file_too_large"
        DUPLICATE = "duplicate"
        OTHER_ERROR = "other_error"
    
    def __init__(self, success: bool, url: str = "", error_type: ErrorType = ErrorType.SUCCESS, error_message: str = ""):
        self.success = success
        self.url = url
        self.error_type = error_type
        self.error_message = error_message
    
    @classmethod
    def success_result(cls, url: str):
        return cls(True, url, cls.ErrorType.SUCCESS)
    
    @classmethod
    def file_too_large_error(cls, error_message: str):
        return cls(False, "", cls.ErrorType.FILE_TOO_LARGE, error_message)
    
    @classmethod
    def duplicate_error(cls, error_message: str):
        return cls(False, "", cls.ErrorType.DUPLICATE, error_message)
    
    @classmethod
    def other_error(cls, error_message: str):
        return cls(False, "", cls.ErrorType.OTHER_ERROR, error_message)

class MediaProcessor:
    """Main processor for downloading, compressing, and uploading media files."""
    
    def __init__(self, supabase_url: str, supabase_key: str, bucket_name: str = "slide-content", 
                 video_rf: int = 28, max_video_rf: int = 35, workers: int = 10, overwrite: bool = False):
        # Configure connection settings before creating client
        import httpx
        from supabase.lib.client_options import ClientOptions
        
        # Create a custom httpx client with better timeout and retry settings
        httpx_client = httpx.Client(
            timeout=httpx.Timeout(
                connect=60.0,      # Connection timeout
                read=300.0,        # Read timeout (5 minutes for large files)
                write=300.0,       # Write timeout
                pool=60.0          # Pool timeout
            ),
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=10,
                keepalive_expiry=60.0
            ),
            follow_redirects=True
        )
        
        # Create client options with custom httpx client
        options = ClientOptions()
        options.postgrest_client_timeout = 300  # 5 minutes
        
        # Create Supabase client with custom options
        self.supabase: Client = create_client(
            supabase_url, 
            supabase_key,
            options=options
        )
        
        # Replace the storage client's session with our custom httpx client
        # This is a workaround since supabase-py doesn't directly support custom httpx clients for storage
        if hasattr(self.supabase.storage, '_client'):
            self.supabase.storage._client._session = httpx_client
        
        self.bucket_name = bucket_name
        self.video_rf = video_rf
        self.max_video_rf = max_video_rf
        self.workers = workers
        self.base_temp_dir = tempfile.mkdtemp()
        self.overwrite = overwrite
        self.httpx_client = httpx_client  # Keep reference for cleanup
        
        # Set up logging
        self.logger = setup_logging()
        
        # Initialize processors
        self.video_compressor = VideoCompressor(self.logger)
        self.image_compressor = ImageCompressor(self.logger)
        self.stats_manager = StatsManager()
        
        # Thread-safe progress tracking
        self._progress_lock = threading.Lock()
        self._processed_count = 0
        self._total_count = 0
        
        # Connection limiter to prevent overwhelming the server
        self._upload_semaphore = threading.Semaphore(min(5, workers))  # Max 5 concurrent uploads
        
        self._log_initialization()
        
    def _log_initialization(self):
        """Log initialization details."""
        self.logger.info(f"MediaProcessor initialized")
        self.logger.info(f"Base working directory: {self.base_temp_dir}")
        self.logger.info(f"Video compression: RF {self.video_rf} (max: {self.max_video_rf})")
        self.logger.info(f"Parallel workers: {self.workers}")
        self.logger.info(f"Bucket: {self.bucket_name}")
        
        print(f"Base working directory: {self.base_temp_dir}")
        print(f"Video compression rate factor: {self.video_rf} (max: {self.max_video_rf})")
        print(f"Parallel workers: {self.workers}")
        print(f"Log file: Check current directory for timestamped log files")
    
    def _extract_slide_name_from_url(self, url: str) -> str:
        """Extract slide name (e.g., 'Slide_001') from URL."""
        # Match pattern like 'Slide_001.jpg' or 'Slide_001.mp4'
        match = re.search(r'(Slide_\d+)\.(jpg|jpeg|png|mp4)', url)
        if match:
            return match.group(1)
        else:
            # Fallback to extracting just the filename without extension
            filename = url.split('/')[-1].split('?')[0]
            return Path(filename).stem
    
    def _get_thread_temp_dirs(self, thread_id: str) -> Tuple[Path, Path]:
        """Get thread-specific temporary directories."""
        thread_base = Path(self.base_temp_dir) / f"thread_{thread_id}"
        download_dir = thread_base / "downloads"
        compressed_dir = thread_base / "compressed"
        
        download_dir.mkdir(parents=True, exist_ok=True)
        compressed_dir.mkdir(parents=True, exist_ok=True)
        
        return download_dir, compressed_dir
    
    def _update_progress(self, slide_name: str, success: bool):
        """Thread-safe progress update."""
        with self._progress_lock:
            self._processed_count += 1
            status = "✓" if success else "✗"
            print(f"[{self._processed_count}/{self._total_count}] {status} Completed {slide_name}")
    
    def download_file(self, url: str, filename: str, download_dir: Path) -> Path:
        """Download a file from URL to the specified directory."""
        filepath = download_dir / filename
        
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return filepath
    
    def _is_file_too_large_error(self, error) -> bool:
        """Check if error indicates file is too large for Supabase."""
        error_str = str(error).lower()
        # Don't treat 409 Duplicate as file size error!
        if 'duplicate' in error_str or '409' in error_str:
            return False
        return any(phrase in error_str for phrase in [
            'file too large', 
            'payload too large', 
            'entity too large',
            'exceeds maximum',
            'file size limit',
            'request entity too large',
            '413'  # HTTP 413 status code
        ])
    
    def _is_duplicate_error(self, error) -> bool:
        """Check if error indicates duplicate file."""
        error_str = str(error).lower()
        return 'duplicate' in error_str and '409' in error_str
    
    def _check_file_exists(self, remote_filename: str) -> bool:
        """Check if a file already exists in the bucket."""
        try:
            # List files in the bucket
            files = self.supabase.storage.from_(self.bucket_name).list()
            return any(file.get('name') == remote_filename for file in files)
        except Exception as e:
            self.logger.warning(f"Could not check if file exists: {e}")
            return False
    
    def upload_to_supabase(self, file_path: Path, remote_filename: str, slide_name: str, 
                          original_url: str = "", file_type: str = "", 
                          stats: Optional[CompressionStats] = None) -> UploadResult:
        """Upload file to Supabase storage with retry logic and connection throttling."""
        import time
        import mimetypes
        
        # Retry configuration
        max_retries = 3
        retry_delay = 2  # seconds
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            # Fallback based on extension
            ext = file_path.suffix.lower()
            mime_types = {
                '.mp4': 'video/mp4',
                '.avi': 'video/x-msvideo',
                '.mov': 'video/quicktime',
                '.mkv': 'video/x-matroska',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif'
            }
            mime_type = mime_types.get(ext, 'application/octet-stream')
        
        # Use semaphore to limit concurrent uploads
        with self._upload_semaphore:
            for attempt in range(max_retries):
                try:
                    remote_path = f"{remote_filename}"
                    
                    # Before attempting upload, check if file already exists
                    # This handles the case where a previous attempt succeeded but we didn't detect it
                    if attempt > 0 and self._check_file_exists(remote_filename):
                        self.logger.info(f"File {remote_filename} already exists (detected on retry attempt {attempt + 1})")
                        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                        self._log_successful_upload(remote_filename, slide_name, file_path, stats)
                        return UploadResult.success_result(public_url)
                    
                    # Check if file exists and delete it if overwrite is enabled
                    if self.overwrite and attempt == 0:  # Only check on first attempt
                        self._delete_existing_file(remote_path, remote_filename)
                    
                    # For large files, implement chunked upload
                    file_size = file_path.stat().st_size
                    file_size_mb = file_size / (1024 * 1024)
                    
                    self.logger.info(f"Uploading {remote_filename} ({file_size_mb:.1f} MB, {mime_type}) - Attempt {attempt + 1}/{max_retries}")
                    
                    # Read file in binary mode
                    with open(file_path, 'rb') as f:
                        file_data = f.read()
                    
                    # Add small delay between uploads to prevent server overload
                    if self._processed_count > 0:
                        time.sleep(0.5)  # 500ms delay between uploads
                    
                    # Try upload with timeout settings
                    try:
                        response = self.supabase.storage.from_(self.bucket_name).upload(
                            remote_path,
                            file_data,
                            file_options={
                                "content-type": mime_type,
                                "x-upsert": "false"  # Fail if exists (we handle overwrites explicitly)
                            }
                        )
                        
                        # Get the public URL
                        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                        
                        # Log successful upload
                        self._log_successful_upload(remote_filename, slide_name, file_path, stats)
                        
                        return UploadResult.success_result(public_url)
                        
                    except Exception as upload_error:
                        error_str = str(upload_error).lower()
                        
                        # If it's a duplicate error on retry, the file was uploaded successfully
                        if attempt > 0 and self._is_duplicate_error(upload_error):
                            self.logger.info(f"File {remote_filename} exists (duplicate error on attempt {attempt + 1}) - treating as success")
                            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                            return UploadResult.success_result(public_url)
                        
                        if attempt < max_retries - 1:
                            # Check if it's a connection error that we should retry
                            if any(phrase in error_str for phrase in ['server disconnected', 'connection', 'timeout', 'network', 'broken pipe']):
                                self.logger.warning(f"Upload attempt {attempt + 1} failed for {slide_name}: {upload_error}. Retrying in {retry_delay} seconds...")
                                time.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue
                        
                        # If we're here, either it's the last attempt or not a retriable error
                        raise upload_error
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    # On final attempt, log the error
                    if attempt == max_retries - 1:
                        self.logger.error(f"Upload failed for {slide_name} after {max_retries} attempts: {error_msg}")
                    
                    # Classify the error type
                    if self._is_duplicate_error(e):
                        # On the last attempt, if it's duplicate, treat as success
                        if attempt == max_retries - 1:
                            self.logger.info(f"File {remote_filename} exists (duplicate on final attempt) - treating as success")
                            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                            return UploadResult.success_result(public_url)
                        return UploadResult.duplicate_error(error_msg)
                    elif self._is_file_too_large_error(e):
                        return UploadResult.file_too_large_error(error_msg)
                    else:
                        # If it's the last attempt, return error
                        if attempt == max_retries - 1:
                            return UploadResult.other_error(error_msg)
            
            # Should not reach here, but just in case
            return UploadResult.other_error("Upload failed after all retry attempts")
    
    def _delete_existing_file(self, remote_path: str, remote_filename: str):
        """Delete existing file from Supabase storage."""
        try:
            existing_files = self.supabase.storage.from_(self.bucket_name).list("slide-media/")
            file_exists = any(file.get('name') == remote_filename for file in existing_files)
            
            if file_exists:
                self.logger.info(f"Deleting existing file before upload: {remote_filename}")
                self.supabase.storage.from_(self.bucket_name).remove([remote_path])
                print(f"🗑️  Deleted existing file: {remote_filename}")
                
        except Exception as check_error:
            self.logger.warning(f"Could not check/delete existing file: {check_error}")
    
    def _log_successful_upload(self, remote_filename: str, slide_name: str, file_path: Path, 
                             stats: Optional[CompressionStats]):
        """Log successful upload."""
        file_size = file_path.stat().st_size // 1024
        
        self.logger.info(f"Upload successful: {remote_filename} ({file_size}KB)")
        print(f"✅ Successfully uploaded {remote_filename} ({file_size}KB) for {slide_name}")
    
    def upload_with_retry(self, file_path: Path, remote_filename: str, slide_name: str, 
                         original_url: str, file_type: str, stats: CompressionStats,
                         download_dir: Path, compressed_dir: Path) -> str:
        """Upload with retry logic for file too large errors ONLY."""
        
        # Try initial upload
        result = self.upload_to_supabase(file_path, remote_filename, slide_name, original_url, file_type, stats)
        
        # Handle different result types
        if result.success:
            return result.url
        
        # Handle duplicate error
        if result.error_type == UploadResult.ErrorType.DUPLICATE:
            print(f"⚠️  File already exists for {slide_name}")
            if self.overwrite:
                print(f"⚠️ Attempting to overwrite {slide_name}")
                try:
                    # Force delete and retry upload
                    remote_path = f"slide-media/{remote_filename}"
                    self.supabase.storage.from_(self.bucket_name).remove([remote_path])
                    
                    # Retry upload after deletion
                    retry_result = self.upload_to_supabase(file_path, remote_filename, slide_name, original_url, file_type, stats)
                    if retry_result.success:
                        return retry_result.url
                    else:
                        print(f"✗ Could not overwrite existing file for {slide_name}: {retry_result.error_message}")
                        return ""
                except Exception as retry_error:
                    print(f"✗ Could not overwrite existing file for {slide_name}: {retry_error}")
                    return ""
            else:
                print(f"⚠️  No overwrite: Skipping {slide_name}")
                return ""
        
        # Handle file too large error (only for videos)
        if result.error_type == UploadResult.ErrorType.FILE_TOO_LARGE and file_type == "video":
            print(f"⚠️  File too large for {slide_name}, will retry with higher compression")
            return self._retry_with_higher_compression(slide_name, stats, download_dir, compressed_dir, original_url, file_type)
        
        # Handle other errors
        if result.error_type == UploadResult.ErrorType.FILE_TOO_LARGE:
            print(f"✗ File too large for {slide_name} (non-video, cannot compress further)")
        else:
            print(f"✗ Error uploading {slide_name}: {result.error_message}")
        
        return ""
    
    def _retry_with_higher_compression(self, slide_name: str, stats: CompressionStats, 
                                     download_dir: Path, compressed_dir: Path, 
                                     original_url: str, file_type: str) -> str:
        """Retry video compression with higher RF values."""
        current_rf = stats.final_rf if stats.final_rf else self.video_rf
        
        # Only proceed with retries if we haven't hit max RF
        if current_rf >= self.max_video_rf:
            self.logger.error(f"Cannot retry {slide_name} - already at max RF ({current_rf})")
            print(f"❌ Cannot compress {slide_name} further (already at max RF={current_rf})")
            return ""
        
        while current_rf < self.max_video_rf:
            retry_rf = min(current_rf + 2, self.max_video_rf)
            
            self.logger.info(f"Retrying compression for {slide_name} with higher RF: {retry_rf}")
            print(f"🔄 File too large, retrying {slide_name} with RF={retry_rf}")
            
            # Find original file for recompression
            original_file = self._find_original_video_file(download_dir, slide_name)
            if not original_file:
                self.logger.error(f"Could not find original file for {slide_name} retry")
                break
            
            # Re-compress with higher RF
            retry_compressed_path = compressed_dir / f"{slide_name}_retry_rf{retry_rf}.mp4"
            success, new_stats = self.video_compressor.compress(original_file, retry_compressed_path, slide_name, retry_rf)
            
            if success:
                new_stats.attempts = stats.attempts + 1
                retry_filename = f"{slide_name}.mp4"
                
                # Show retry compression stats
                print(f"   🔄 Retry compressed: {new_stats.original_size_kb}KB → {new_stats.compressed_size_kb}KB "
                      f"({new_stats.compression_ratio:.1f}% reduction, RF={retry_rf})")
                
                # Try uploading the re-compressed file
                retry_result = self.upload_to_supabase(retry_compressed_path, retry_filename, slide_name, 
                                                     original_url, file_type, new_stats)
                
                if retry_result.success:
                    self.logger.info(f"Retry successful for {slide_name} with RF={retry_rf}")
                    return retry_result.url
                elif retry_result.error_type != UploadResult.ErrorType.FILE_TOO_LARGE:
                    # If it's not a size error, don't continue retrying
                    print(f"✗ Retry failed for {slide_name} due to non-size error: {retry_result.error_message}")
                    break
            
            current_rf = retry_rf
        
        self.logger.error(f"All retry attempts failed for {slide_name} (max RF={self.max_video_rf})")
        print(f"❌ Could not compress {slide_name} small enough (tried up to RF={self.max_video_rf})")
        return ""
    
    def _find_original_video_file(self, download_dir: Path, slide_name: str) -> Optional[Path]:
        """Find the original video file for recompression."""
        for ext in ['.mp4', '.avi', '.mov', '.mkv']:
            candidate = download_dir / f"{slide_name}_original{ext}"
            if candidate.exists():
                return candidate
        return None
    
    def process_single_slide(self, slide_data: Dict) -> Dict:
        """Process a single slide (worker function for parallel execution)."""
        slide_id = slide_data['slide']  # Keep for reference
        original_url = slide_data['url']
        thread_id = threading.current_thread().ident
        
        # Extract the actual slide name from the URL
        slide_name = self._extract_slide_name_from_url(original_url)
        
        # Initialize processing status
        status = {
            'json_slide_id': slide_id,
            'extracted_slide_name': slide_name,
            'original_url': original_url,
            'new_url': '',
            'file_type': '',
            'download_success': False,
            'compression_success': False,
            'compression_details': {},
            'upload_success': False,
            'upload_attempts': 0,
            'error_message': '',
            'processing_time': 0
        }
        
        start_time = time.time()
        
        try:
            # Get thread-specific temp directories
            download_dir, compressed_dir = self._get_thread_temp_dirs(str(thread_id))
            
            # Determine file type and prepare filenames
            file_ext = get_file_extension(original_url)
            original_filename = f"{slide_name}_original{file_ext}"
            status['file_type'] = file_ext[1:] if file_ext else 'unknown'
            
            self.logger.info(f"Processing {slide_name} (id: {slide_id}): {original_url}")
            
            # Download original file
            try:
                downloaded_path = self.download_file(original_url, original_filename, download_dir)
                status['download_success'] = True
            except Exception as e:
                status['error_message'] = f"Download failed: {str(e)}"
                raise
            
            # Process based on file type
            upload_path, final_filename, file_type, compression_stats = self._process_file_by_type(
                downloaded_path, slide_name, file_ext, compressed_dir
            )
            
            # Update compression status
            if compression_stats.method != "none":
                status['compression_success'] = True
                status['compression_details'] = {
                    'original_size_kb': compression_stats.original_size_kb,
                    'compressed_size_kb': compression_stats.compressed_size_kb,
                    'compression_ratio': round(compression_stats.compression_ratio, 2),
                    'method': compression_stats.method,
                    'final_rf': compression_stats.final_rf if compression_stats.final_rf else None
                }
            
            # Store stats for reporting
            self.stats_manager.add_stats(slide_name, compression_stats)
            
            # Track upload attempts
            initial_attempts = compression_stats.attempts
            
            # Upload with retry logic
            new_url = self.upload_with_retry(
                upload_path, final_filename, slide_name, original_url, file_type, 
                compression_stats, download_dir, compressed_dir
            )
            
            status['upload_attempts'] = compression_stats.attempts
            
            if new_url:
                status['upload_success'] = True
                status['new_url'] = new_url
                self._update_progress(slide_name, True)
            else:
                status['upload_success'] = False
                status['error_message'] = status.get('error_message', '') or 'Upload failed'
                self._update_progress(slide_name, False)
                
        except Exception as e:
            self.logger.error(f"Error processing {slide_name}: {e}")
            print(f"✗ Error processing {slide_name}: {e}")
            status['error_message'] = status.get('error_message', '') or f"Processing error: {str(e)}"
            self._update_progress(slide_name, False)
        
        status['processing_time'] = round(time.time() - start_time, 2)
        return status
    
    def _process_file_by_type(self, downloaded_path: Path, slide_name: str, file_ext: str, 
                            compressed_dir: Path) -> Tuple[Path, str, str, CompressionStats]:
        """Process file based on its type (video, image, or unknown)."""
        
        if file_ext.lower() == '.mp4':
            return self._process_video(downloaded_path, slide_name, compressed_dir)
        elif file_ext.lower() in ['.jpg', '.jpeg', '.png']:
            return self._process_image(downloaded_path, slide_name, compressed_dir, file_ext)
        else:
            return self._process_unknown_file(downloaded_path, slide_name, file_ext)
    
    def _process_video(self, downloaded_path: Path, slide_name: str, compressed_dir: Path) -> Tuple[Path, str, str, CompressionStats]:
        """Process video file with compression."""
        compressed_path = compressed_dir / f"{slide_name}_compressed.mp4"
        success, stats = self.video_compressor.compress(downloaded_path, compressed_path, slide_name, self.video_rf)
        
        if success:
            return compressed_path, f"{slide_name}.mp4", "video", stats
        else:
            # Use original if compression fails, but rename it properly
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "video")
            # Copy the original file with the proper name (without _original)
            properly_named_path = compressed_dir / f"{slide_name}.mp4"
            import shutil
            shutil.copy2(downloaded_path, properly_named_path)
            return properly_named_path, f"{slide_name}.mp4", "video", stats
    
    def _process_image(self, downloaded_path: Path, slide_name: str, compressed_dir: Path, file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process image file with compression."""
        compressed_path = compressed_dir / f"{slide_name}_compressed.jpg"
        success, stats = self.image_compressor.compress(downloaded_path, compressed_path, slide_name)
        
        if success:
            return compressed_path, f"{slide_name}.jpg", "image", stats
        else:
            # Use original if compression fails, but rename it properly
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "image")
            # Determine the output extension (keep original format)
            output_ext = '.jpg' if file_ext.lower() in ['.jpg', '.jpeg'] else file_ext
            properly_named_path = compressed_dir / f"{slide_name}{output_ext}"
            import shutil
            shutil.copy2(downloaded_path, properly_named_path)
            return properly_named_path, f"{slide_name}{output_ext}", "image", stats
    
    def _process_unknown_file(self, downloaded_path: Path, slide_name: str, file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process unknown file type (no compression)."""
        stats = CompressionStats.create_no_compression_stats(downloaded_path, "unknown")
        # Copy with proper naming (without _original)
        properly_named_path = downloaded_path.parent / f"{slide_name}{file_ext}"
        import shutil
        shutil.copy2(downloaded_path, properly_named_path)
        return properly_named_path, f"{slide_name}{file_ext}", "unknown", stats
    
    def process_slides(self, slides_data: List[Dict]) -> Tuple[Dict[str, str], List[Dict]]:
        """Process all slides using parallel execution."""
        mapping = {}
        status_inventory = []
        self._total_count = len(slides_data)
        self._processed_count = 0
        
        print(f"Processing {self._total_count} slides with {self.workers} parallel workers...")
        print("=" * 60)
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            # Submit all slides for processing
            future_to_slide = {
                executor.submit(self.process_single_slide, slide_data): slide_data
                for slide_data in slides_data
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_slide):
                status = future.result()
                status_inventory.append(status)
                
                if status['upload_success'] and status['new_url']:
                    mapping[status['extracted_slide_name']] = status['new_url']
        
        print("=" * 60)
        print(f"Parallel processing complete!")
        print(f"Successfully processed: {len(mapping)}/{self._total_count} slides")
        
        return mapping, status_inventory
    
    def finalize_processing(self, slide_mapping: Dict[str, str], status_inventory: List[Dict], total_slides: int):
        """Generate reports and finalize processing."""
        print(f"\n{'='*50}")
        print("PROCESSING COMPLETE")
        print(f"{'='*50}")
        print(f"Successfully processed: {len(slide_mapping)}/{total_slides} slides")
        
        # Save mapping and generate reports
        self.stats_manager.save_mapping(slide_mapping)
        self.stats_manager.generate_reports()
        self.stats_manager.print_summary()
        
        # Generate and save status inventory report
        self._generate_status_inventory_report(status_inventory)
        
        self.stats_manager.print_metadata_info()
    
    def _generate_status_inventory_report(self, status_inventory: List[Dict]):
        """Generate comprehensive status inventory report."""
        import json
        from datetime import datetime
        
        # Sort by extracted slide name for better readability
        status_inventory.sort(key=lambda x: x['extracted_slide_name'])
        
        # Save detailed JSON report
        json_report_file = f"status_inventory_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_report_file, 'w') as f:
            json.dump(status_inventory, f, indent=2)
        print(f"Detailed status inventory saved to: {json_report_file}")
        
        # Generate human-readable report
        report_lines = []
        report_lines.append("STATUS INVENTORY REPORT")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Summary statistics
        total = len(status_inventory)
        successful = sum(1 for s in status_inventory if s['upload_success'])
        failed = total - successful
        
        report_lines.append("SUMMARY:")
        report_lines.append(f"  Total slides: {total}")
        report_lines.append(f"  Successful: {successful}")
        report_lines.append(f"  Failed: {failed}")
        report_lines.append("")
        
        # File type breakdown
        file_types = {}
        for status in status_inventory:
            ft = status['file_type']
            if ft not in file_types:
                file_types[ft] = {'total': 0, 'successful': 0, 'failed': 0}
            file_types[ft]['total'] += 1
            if status['upload_success']:
                file_types[ft]['successful'] += 1
            else:
                file_types[ft]['failed'] += 1
        
        report_lines.append("FILE TYPE BREAKDOWN:")
        for ft, counts in sorted(file_types.items()):
            report_lines.append(f"  {ft}: {counts['successful']}/{counts['total']} successful")
        report_lines.append("")
        
        # Detailed status for each slide
        report_lines.append("DETAILED STATUS:")
        report_lines.append("-" * 80)
        
        for status in status_inventory:
            report_lines.append(f"\nSlide: {status['extracted_slide_name']}")
            report_lines.append(f"  JSON ID: {status['json_slide_id']}")
            report_lines.append(f"  Original URL: {status['original_url']}")
            report_lines.append(f"  New URL: {status['new_url'] if status['new_url'] else 'N/A'}")
            report_lines.append(f"  File Type: {status['file_type']}")
            report_lines.append(f"  Status: {'✓ SUCCESS' if status['upload_success'] else '✗ FAILED'}")
            
            # Processing details
            report_lines.append(f"  Processing:")
            report_lines.append(f"    Download: {'✓' if status['download_success'] else '✗'}")
            report_lines.append(f"    Compression: {'✓' if status['compression_success'] else '✗ or N/A'}")
            
            if status['compression_details']:
                details = status['compression_details']
                report_lines.append(f"      - Original: {details['original_size_kb']} KB")
                report_lines.append(f"      - Compressed: {details['compressed_size_kb']} KB")
                report_lines.append(f"      - Reduction: {details['compression_ratio']}%")
                if details.get('final_rf'):
                    report_lines.append(f"      - Final RF: {details['final_rf']}")
            
            report_lines.append(f"    Upload: {'✓' if status['upload_success'] else '✗'}")
            if status['upload_attempts'] > 1:
                report_lines.append(f"      - Attempts: {status['upload_attempts']}")
            
            if status['error_message']:
                report_lines.append(f"  Error: {status['error_message']}")
            
            report_lines.append(f"  Processing Time: {status['processing_time']}s")
        
        # Failed slides summary
        if failed > 0:
            report_lines.append("\n" + "=" * 80)
            report_lines.append("FAILED SLIDES SUMMARY:")
            report_lines.append("-" * 80)
            for status in status_inventory:
                if not status['upload_success']:
                    report_lines.append(f"{status['extracted_slide_name']} (JSON ID: {status['json_slide_id']}): {status['error_message']}")
        
        # Save text report
        text_report_file = f"status_inventory_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(text_report_file, 'w') as f:
            f.write('\n'.join(report_lines))
        
        print(f"Status inventory report saved to: {text_report_file}")
        
        # Print summary to console
        print(f"\n{'='*50}")
        print("STATUS INVENTORY SUMMARY")
        print(f"{'='*50}")
        print(f"Total slides processed: {total}")
        print(f"Successful uploads: {successful}")
        print(f"Failed uploads: {failed}")
        
        if failed > 0:
            print(f"\nFailed slides:")
            for status in status_inventory:
                if not status['upload_success']:
                    print(f"  - {status['extracted_slide_name']} (JSON ID: {status['json_slide_id']})")
    
    def cleanup(self):
        """Clean up temporary files and close connections."""
        import shutil
        
        # Close HTTP client if it exists
        try:
            if hasattr(self, 'httpx_client'):
                self.httpx_client.close()
                self.logger.info("Closed HTTP client connection")
        except Exception as e:
            self.logger.warning(f"Could not close HTTP client: {e}")
        
        # Clean up temp directory
        try:
            shutil.rmtree(self.base_temp_dir)
            self.logger.info(f"Cleaned up temporary directory: {self.base_temp_dir}")
            print(f"Cleaned up temporary directory: {self.base_temp_dir}")
        except Exception as e:
            self.logger.warning(f"Could not clean up temp directory: {e}")
            print(f"Warning: Could not clean up temp directory: {e}")