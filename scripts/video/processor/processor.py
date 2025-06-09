"""
Main MediaProcessor class that orchestrates the download, compression, and upload workflow.
"""

import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import requests
from supabase import create_client, Client

from utils.compression import VideoCompressor, ImageCompressor
from utils.logging_utils import setup_logging
from utils.stats import CompressionStats, StatsManager
from utils.file_utils import get_file_extension


def upload_to_supabase(self, file_path: Path, remote_filename: str, slide_id: str, 
                          original_url: str = "", file_type: str = "", 
                          stats: Optional[CompressionStats] = None) -> str:
        """Upload file to Supabase storage."""
        try:
            remote_path = f"slide-media/{remote_filename}"
            
            # Check if file exists and delete it
            self._delete_existing_file(remote_path, remote_filename)
            
            # Upload the file - SIMPLE VERSION THAT WAS WORKING
            with open(file_path, 'rb') as f:
                response = self.supabase.storage.from_(self.bucket_name).upload(
                    remote_path,
                    f.read()
                )
            
            # Get the public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
            
            # Log successful upload
            self._log_successful_upload(remote_filename, slide_id, file_path, stats)
            
            return public_url
            
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Upload failed for slide {slide_id}: {error_msg}")
            
            # Handle duplicate error specifically
            if 'duplicate' in error_msg.lower() or '409' in error_msg:
                print(f"⚠️  File already exists for slide {slide_id}, attempting to overwrite...")
                try:
                    # Force delete and retry upload
                    self.supabase.storage.from_(self.bucket_name).remove([remote_path])
                    with open(file_path, 'rb') as f:
                        response = self.supabase.storage.from_(self.bucket_name).upload(
                            remote_path,
                            f.read()
                        )
                    public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                    self._log_successful_upload(remote_filename, slide_id, file_path, stats)
                    return public_url
                except Exception as retry_error:
                    print(f"✗ Could not overwrite existing file for slide {slide_id}: {retry_error}")
                    return ""
            
            elif self.is_file_too_large_error(e):
                print(f"⚠️  File too large for slide {slide_id}, will retry with higher compression")
                return ""  # Signal for retry
            else:
                print(f"✗ Error uploading slide {slide_id}: {error_msg}")
                return """""
Main MediaProcessor class that orchestrates the download, compression, and upload workflow.
"""

import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import requests
from supabase import create_client, Client

from utils.compression import VideoCompressor, ImageCompressor
from utils.logging_utils import setup_logging
from utils.stats import CompressionStats, StatsManager
from utils.file_utils import get_file_extension


class MediaProcessor:
    """Main processor for downloading, compressing, and uploading media files."""
    
    def __init__(self, supabase_url: str, supabase_key: str, bucket_name: str = "slide-media", 
                 video_rf: int = 28, max_video_rf: int = 35, workers: int = 10):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.bucket_name = bucket_name
        self.video_rf = video_rf
        self.max_video_rf = max_video_rf
        self.workers = workers
        self.base_temp_dir = tempfile.mkdtemp()
        
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
    
    def _get_thread_temp_dirs(self, thread_id: str) -> Tuple[Path, Path]:
        """Get thread-specific temporary directories."""
        thread_base = Path(self.base_temp_dir) / f"thread_{thread_id}"
        download_dir = thread_base / "downloads"
        compressed_dir = thread_base / "compressed"
        
        download_dir.mkdir(parents=True, exist_ok=True)
        compressed_dir.mkdir(parents=True, exist_ok=True)
        
        return download_dir, compressed_dir
    
    def _update_progress(self, slide_id: str, success: bool):
        """Thread-safe progress update."""
        with self._progress_lock:
            self._processed_count += 1
            status = "✓" if success else "✗"
            print(f"[{self._processed_count}/{self._total_count}] {status} Completed slide {slide_id}")
    
    def download_file(self, url: str, filename: str, download_dir: Path) -> Path:
        """Download a file from URL to the specified directory."""
        filepath = download_dir / filename
        
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return filepath
    
    def is_file_too_large_error(self, error) -> bool:
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
    
    def upload_to_supabase(self, file_path: Path, remote_filename: str, slide_id: str, 
                          original_url: str = "", file_type: str = "", 
                          stats: Optional[CompressionStats] = None) -> str:
        """Upload file to Supabase storage with metadata."""
        try:
            remote_path = f"slide-media/{remote_filename}"
            
            # Prepare metadata
            file_metadata = {
                "slide": slide_id,
                "type": file_type or "unknown",
                "original_filename": file_path.name,
                "original_url": original_url,
                "processed_at": time.strftime('%Y-%m-%d %H:%M:%S'),
                "processor_version": "1.0",
                "file_size_kb": file_path.stat().st_size // 1024
            }
            
            # Add compression stats if available
            if stats:
                file_metadata.update(stats.to_metadata_dict())
            
            # Check if file exists and delete it
            self._delete_existing_file(remote_path, remote_filename)
            
            # Upload the new file with metadata
            with open(file_path, 'rb') as f:
                response = self.supabase.storage.from_(self.bucket_name).upload(
                    remote_path,
                    f.read(),
                    file_options={"metadata": file_metadata}
                )
            
            # Get the public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
            
            # Log successful upload
            self._log_successful_upload(remote_filename, slide_id, file_path, stats)
            
            return public_url
            
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Upload failed for slide {slide_id}: {error_msg}")
            
            if self.is_file_too_large_error(e):
                print(f"⚠️  File too large for slide {slide_id}, will retry with higher compression")
                return ""  # Signal for retry
            else:
                print(f"✗ Error uploading slide {slide_id}: {error_msg}")
                return ""
    
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
    
    def _log_successful_upload(self, remote_filename: str, slide_id: str, file_path: Path, 
                             stats: Optional[CompressionStats]):
        """Log successful upload."""
        file_size = file_path.stat().st_size // 1024
        
        self.logger.info(f"Upload successful: {remote_filename} ({file_size}KB)")
        print(f"✅ Successfully uploaded {remote_filename} ({file_size}KB) for slide {slide_id}")
    
    def upload_with_retry(self, file_path: Path, remote_filename: str, slide_id: str, 
                         original_url: str, file_type: str, stats: CompressionStats,
                         download_dir: Path, compressed_dir: Path) -> str:
        """Upload with retry logic for file too large errors ONLY."""
        
        # Try initial upload
        result = self.upload_to_supabase(file_path, remote_filename, slide_id, original_url, file_type, stats)
        
        # Only retry for videos AND only if result is empty AND it was a size issue
        if result or file_type != "video":
            return result
        
        # Only start retry logic if we have a valid reason (file too large)
        # The upload method returns "" only for size issues now
        current_rf = stats.final_rf if stats.final_rf else self.video_rf
        
        # Only proceed with retries if we haven't hit max RF
        if current_rf >= self.max_video_rf:
            self.logger.error(f"Cannot retry slide {slide_id} - already at max RF ({current_rf})")
            return ""
        
        while current_rf < self.max_video_rf:
            retry_rf = min(current_rf + 2, self.max_video_rf)
            
            self.logger.info(f"Retrying compression for slide {slide_id} with higher RF: {retry_rf}")
            print(f"🔄 File too large, retrying slide {slide_id} with RF={retry_rf}")
            
            # Find original file for recompression
            original_file = self._find_original_video_file(download_dir, slide_id)
            if not original_file:
                self.logger.error(f"Could not find original file for slide {slide_id} retry")
                break
            
            # Re-compress with higher RF
            retry_compressed_path = compressed_dir / f"slide_{slide_id}_retry_rf{retry_rf}.mp4"
            success, new_stats = self.video_compressor.compress(original_file, retry_compressed_path, slide_id, retry_rf)
            
            if success:
                new_stats.attempts = stats.attempts + 1
                retry_filename = f"slide_{slide_id}.mp4"
                
                # Show retry compression stats
                print(f"   🔄 Retry compressed: {new_stats.original_size_kb}KB → {new_stats.compressed_size_kb}KB "
                      f"({new_stats.compression_ratio:.1f}% reduction, RF={retry_rf})")
                
                result = self.upload_to_supabase(retry_compressed_path, retry_filename, slide_id, 
                                               original_url, file_type, new_stats)
                
                if result:
                    self.logger.info(f"Retry successful for slide {slide_id} with RF={retry_rf}")
                    return result
            
            current_rf = retry_rf
        
        self.logger.error(f"All retry attempts failed for slide {slide_id} (max RF={self.max_video_rf})")
        print(f"❌ Could not compress slide {slide_id} small enough (tried up to RF={self.max_video_rf})")
        return ""
    
    def _find_original_video_file(self, download_dir: Path, slide_id: str) -> Optional[Path]:
        """Find the original video file for recompression."""
        for ext in ['.mp4', '.avi', '.mov', '.mkv']:
            candidate = download_dir / f"slide_{slide_id}_original{ext}"
            if candidate.exists():
                return candidate
        return None
    
    def process_single_slide(self, slide_data: Dict) -> Tuple[str, str]:
        """Process a single slide (worker function for parallel execution)."""
        slide_id = slide_data['slide']
        original_url = slide_data['url']
        thread_id = threading.current_thread().ident
        
        try:
            # Get thread-specific temp directories
            download_dir, compressed_dir = self._get_thread_temp_dirs(str(thread_id))
            
            # Determine file type and prepare filenames
            file_ext = get_file_extension(original_url)
            original_filename = f"slide_{slide_id}_original{file_ext}"
            
            self.logger.info(f"Processing slide {slide_id}: {original_url}")
            
            # Download original file
            downloaded_path = self.download_file(original_url, original_filename, download_dir)
            
            # Process based on file type
            upload_path, final_filename, file_type, compression_stats = self._process_file_by_type(
                downloaded_path, slide_id, file_ext, compressed_dir
            )
            
            # Store stats for reporting
            self.stats_manager.add_stats(slide_id, compression_stats)
            
            # Upload with retry logic
            new_url = self.upload_with_retry(
                upload_path, final_filename, slide_id, original_url, file_type, 
                compression_stats, download_dir, compressed_dir
            )
            
            if new_url:
                self._update_progress(slide_id, True)
                return (slide_id, new_url)
            else:
                self._update_progress(slide_id, False)
                return (slide_id, "")
                
        except Exception as e:
            self.logger.error(f"Error processing slide {slide_id}: {e}")
            print(f"✗ Error processing slide {slide_id}: {e}")
            self._update_progress(slide_id, False)
            return (slide_id, "")
    
    def _process_file_by_type(self, downloaded_path: Path, slide_id: str, file_ext: str, 
                            compressed_dir: Path) -> Tuple[Path, str, str, CompressionStats]:
        """Process file based on its type (video, image, or unknown)."""
        
        if file_ext.lower() == '.mp4':
            return self._process_video(downloaded_path, slide_id, compressed_dir)
        elif file_ext.lower() in ['.jpg', '.jpeg', '.png']:
            return self._process_image(downloaded_path, slide_id, compressed_dir, file_ext)
        else:
            return self._process_unknown_file(downloaded_path, slide_id, file_ext)
    
    def _process_video(self, downloaded_path: Path, slide_id: str, compressed_dir: Path) -> Tuple[Path, str, str, CompressionStats]:
        """Process video file with compression."""
        compressed_path = compressed_dir / f"slide_{slide_id}_compressed.mp4"
        success, stats = self.video_compressor.compress(downloaded_path, compressed_path, slide_id, self.video_rf)
        
        if success:
            return compressed_path, f"slide_{slide_id}.mp4", "video", stats
        else:
            # Use original if compression fails
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "video")
            return downloaded_path, f"slide_{slide_id}_original.mp4", "video", stats
    
    def _process_image(self, downloaded_path: Path, slide_id: str, compressed_dir: Path, file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process image file with compression."""
        compressed_path = compressed_dir / f"slide_{slide_id}_compressed.jpg"
        success, stats = self.image_compressor.compress(downloaded_path, compressed_path, slide_id)
        
        if success:
            return compressed_path, f"slide_{slide_id}.jpg", "image", stats
        else:
            # Use original if compression fails
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "image")
            return downloaded_path, f"slide_{slide_id}_original{file_ext}", "image", stats
    
    def _process_unknown_file(self, downloaded_path: Path, slide_id: str, file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process unknown file type (no compression)."""
        stats = CompressionStats.create_no_compression_stats(downloaded_path, "unknown")
        return downloaded_path, f"slide_{slide_id}_original{file_ext}", "unknown", stats
    
    def process_slides(self, slides_data: List[Dict]) -> Dict[str, str]:
        """Process all slides using parallel execution."""
        mapping = {}
        self._total_count = len(slides_data)
        self._processed_count = 0
        
        print(f"Processing {self._total_count} slides with {self.workers} parallel workers...")
        print("=" * 60)
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            # Submit all slides for processing
            future_to_slide = {
                executor.submit(self.process_single_slide, slide_data): slide_data['slide']
                for slide_data in slides_data
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_slide):
                slide_id, new_url = future.result()
                if new_url:
                    mapping[slide_id] = new_url
        
        print("=" * 60)
        print(f"Parallel processing complete!")
        print(f"Successfully processed: {len(mapping)}/{self._total_count} slides")
        
        return mapping
    
    def finalize_processing(self, slide_mapping: Dict[str, str], total_slides: int):
        """Generate reports and finalize processing."""
        print(f"\n{'='*50}")
        print("PROCESSING COMPLETE")
        print(f"{'='*50}")
        print(f"Successfully processed: {len(slide_mapping)}/{total_slides} slides")
        
        # Save mapping and generate reports
        self.stats_manager.save_mapping(slide_mapping)
        self.stats_manager.generate_reports()
        self.stats_manager.print_summary()
        self.stats_manager.print_metadata_info()
    
    def cleanup(self):
        """Clean up temporary files."""
        import shutil
        try:
            shutil.rmtree(self.base_temp_dir)
            self.logger.info(f"Cleaned up temporary directory: {self.base_temp_dir}")
            print(f"Cleaned up temporary directory: {self.base_temp_dir}")
        except Exception as e:
            self.logger.warning(f"Could not clean up temp directory: {e}")
            print(f"Warning: Could not clean up temp directory: {e}")