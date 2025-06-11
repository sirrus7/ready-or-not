"""
Handles processing of individual slides.
"""

import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional

from .file_processor import FileProcessor
from .upload_manager import UploadManager
from .upload_result import UploadResult
from utils.stats import CompressionStats, StatsManager
from utils.file_utils import get_file_extension


class SlideProcessor:
    """Processes individual slides with download, compression, and upload."""
    
    def __init__(self, file_processor: FileProcessor, upload_manager: UploadManager,
                 stats_manager: StatsManager, logger: Any, base_temp_dir: str,
                 video_rf: int = 28, max_video_rf: int = 35, overwrite: bool = False):
        self.file_processor = file_processor
        self.upload_manager = upload_manager
        self.stats_manager = stats_manager
        self.logger = logger
        self.base_temp_dir = base_temp_dir
        self.video_rf = video_rf
        self.max_video_rf = max_video_rf
        self.overwrite = overwrite
    
    def get_thread_temp_dirs(self, thread_id: str) -> tuple[Path, Path]:
        """Get thread-specific temporary directories."""
        thread_base = Path(self.base_temp_dir) / f"thread_{thread_id}"
        download_dir = thread_base / "downloads"
        compressed_dir = thread_base / "compressed"
        
        download_dir.mkdir(parents=True, exist_ok=True)
        compressed_dir.mkdir(parents=True, exist_ok=True)
        
        return download_dir, compressed_dir
    
    def process_slide(self, slide_data: Dict) -> Dict:
        """Process a single slide and return detailed status."""
        slide_id = slide_data['slide']
        original_url = slide_data['url']
        thread_id = threading.current_thread().ident
        
        # Extract the actual slide name from the URL
        slide_name = self.file_processor.extract_slide_name_from_url(original_url)
        
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
            download_dir, compressed_dir = self.get_thread_temp_dirs(str(thread_id))
            
            # Determine file type and prepare filenames
            file_ext = get_file_extension(original_url)
            original_filename = f"{slide_name}_original{file_ext}"
            status['file_type'] = file_ext[1:] if file_ext else 'unknown'
            
            self.logger.info(f"Processing {slide_name} (id: {slide_id}): {original_url}")
            
            # Download original file
            try:
                downloaded_path = self.file_processor.download_file(original_url, original_filename, download_dir)
                status['download_success'] = True
            except Exception as e:
                status['error_message'] = f"Download failed: {str(e)}"
                raise
            
            # Process based on file type
            upload_path, final_filename, file_type, compression_stats = self.file_processor.process_file(
                downloaded_path, slide_name, file_ext, compressed_dir, self.video_rf
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
            
            # Upload with retry logic
            new_url = self._upload_with_retry(
                upload_path, final_filename, slide_name, original_url, file_type,
                compression_stats, download_dir, compressed_dir
            )
            
            status['upload_attempts'] = compression_stats.attempts
            
            if new_url:
                status['upload_success'] = True
                status['new_url'] = new_url
            else:
                status['upload_success'] = False
                status['error_message'] = status.get('error_message', '') or 'Upload failed'
                
        except Exception as e:
            self.logger.error(f"Error processing {slide_name}: {e}")
            status['error_message'] = status.get('error_message', '') or f"Processing error: {str(e)}"
        
        status['processing_time'] = round(time.time() - start_time, 2)
        return status
    
    def _upload_with_retry(self, file_path: Path, remote_filename: str, slide_name: str,
                          original_url: str, file_type: str, stats: CompressionStats,
                          download_dir: Path, compressed_dir: Path) -> str:
        """Upload with retry logic for file too large errors."""
        # Try initial upload
        result = self.upload_manager.upload_file(
            file_path, remote_filename, slide_name, self.overwrite, stats
        )
        
        # Handle different result types
        if result.success:
            return result.url
        
        # Handle duplicate error
        if result.error_type == UploadResult.ErrorType.DUPLICATE:
            print(f"⚠️  File already exists for {slide_name}")
            if self.overwrite:
                print(f"⚠️ Attempting to overwrite {slide_name}")
                # The upload manager should have handled overwrite
                return ""
            else:
                print(f"⚠️  No overwrite: Skipping {slide_name}")
                return ""
        
        # Handle file too large error (only for videos)
        if result.error_type == UploadResult.ErrorType.FILE_TOO_LARGE and file_type == "video":
            print(f"⚠️  File too large for {slide_name}, will retry with higher compression")
            return self._retry_with_higher_compression(
                slide_name, stats, download_dir, compressed_dir, original_url, file_type
            )
        
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
        
        if current_rf >= self.max_video_rf:
            self.logger.error(f"Cannot retry {slide_name} - already at max RF ({current_rf})")
            print(f"❌ Cannot compress {slide_name} further (already at max RF={current_rf})")
            return ""
        
        while current_rf < self.max_video_rf:
            retry_rf = min(current_rf + 2, self.max_video_rf)
            
            self.logger.info(f"Retrying compression for {slide_name} with higher RF: {retry_rf}")
            print(f"🔄 File too large, retrying {slide_name} with RF={retry_rf}")
            
            # Find original file for recompression
            original_file = self.file_processor.find_original_video_file(download_dir, slide_name)
            if not original_file:
                self.logger.error(f"Could not find original file for {slide_name} retry")
                break
            
            # Re-compress with higher RF
            retry_compressed_path = compressed_dir / f"{slide_name}_retry_rf{retry_rf}.mp4"
            success, new_stats = self.file_processor.video_compressor.compress(
                original_file, retry_compressed_path, slide_name, retry_rf
            )
            
            if success:
                new_stats.attempts = stats.attempts + 1
                retry_filename = f"{slide_name}.mp4"
                
                print(f"   🔄 Retry compressed: {new_stats.original_size_kb}KB → {new_stats.compressed_size_kb}KB "
                      f"({new_stats.compression_ratio:.1f}% reduction, RF={retry_rf})")
                
                # Try uploading the re-compressed file
                retry_result = self.upload_manager.upload_file(
                    retry_compressed_path, retry_filename, slide_name, self.overwrite, new_stats
                )
                
                if retry_result.success:
                    self.logger.info(f"Retry successful for {slide_name} with RF={retry_rf}")
                    return retry_result.url
                elif retry_result.error_type != UploadResult.ErrorType.FILE_TOO_LARGE:
                    print(f"✗ Retry failed for {slide_name} due to non-size error: {retry_result.error_message}")
                    break
            
            current_rf = retry_rf
        
        self.logger.error(f"All retry attempts failed for {slide_name} (max RF={self.max_video_rf})")
        print(f"❌ Could not compress {slide_name} small enough (tried up to RF={self.max_video_rf})")
        return ""