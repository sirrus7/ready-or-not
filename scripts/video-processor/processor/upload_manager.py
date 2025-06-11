"""
Handles file upload operations to Supabase storage.
"""

import time
import mimetypes
from pathlib import Path
from typing import Optional, Any
import threading

from supabase import Client

from .upload_result import UploadResult
from utils.stats import CompressionStats


class UploadManager:
    """Manages file uploads to Supabase with retry logic and error handling."""
    
    def __init__(self, supabase_client: Client, bucket_name: str, logger: Any, 
                 max_concurrent_uploads: int = 5):
        self.supabase = supabase_client
        self.bucket_name = bucket_name
        self.logger = logger
        self._upload_semaphore = threading.Semaphore(max_concurrent_uploads)
        self._processed_count = 0
    
    def _get_mime_type(self, file_path: Path) -> str:
        """Determine MIME type for a file."""
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
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
        return mime_type
    
    def _is_file_too_large_error(self, error) -> bool:
        """Check if error indicates file is too large for Supabase."""
        error_str = str(error).lower()
        if 'duplicate' in error_str or '409' in error_str:
            return False
        return any(phrase in error_str for phrase in [
            'file too large', 
            'payload too large', 
            'entity too large',
            'exceeds maximum',
            'file size limit',
            'request entity too large',
            '413'
        ])
    
    def _is_duplicate_error(self, error) -> bool:
        """Check if error indicates duplicate file."""
        error_str = str(error).lower()
        return 'duplicate' in error_str and '409' in error_str
    
    def _check_file_exists(self, remote_filename: str) -> bool:
        """Check if a file already exists in the bucket."""
        try:
            files = self.supabase.storage.from_(self.bucket_name).list()
            return any(file.get('name') == remote_filename for file in files)
        except Exception as e:
            self.logger.warning(f"Could not check if file exists: {e}")
            return False
    
    def _delete_existing_file(self, remote_path: str, remote_filename: str):
        """Delete existing file from Supabase storage."""
        try:
            existing_files = self.supabase.storage.from_(self.bucket_name).list()
            file_exists = any(file.get('name') == remote_filename for file in existing_files)
            
            if file_exists:
                self.logger.info(f"Deleting existing file before upload: {remote_filename}")
                self.supabase.storage.from_(self.bucket_name).remove([remote_path])
                print(f"🗑️  Deleted existing file: {remote_filename}")
                
        except Exception as check_error:
            self.logger.warning(f"Could not check/delete existing file: {check_error}")
    
    def upload_file(self, file_path: Path, remote_filename: str, slide_name: str,
                   overwrite: bool = False, stats: Optional[CompressionStats] = None,
                   max_retries: int = 3) -> UploadResult:
        """Upload file to Supabase storage with retry logic."""
        retry_delay = 2  # seconds
        mime_type = self._get_mime_type(file_path)
        
        with self._upload_semaphore:
            for attempt in range(max_retries):
                try:
                    remote_path = f"{remote_filename}"
                    
                    # Before attempting upload, check if file already exists (on retry)
                    if attempt > 0 and self._check_file_exists(remote_filename):
                        self.logger.info(f"File {remote_filename} already exists (detected on retry attempt {attempt + 1})")
                        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                        self._log_successful_upload(remote_filename, slide_name, file_path, stats)
                        return UploadResult.success_result(public_url)
                    
                    # Check if file exists and delete it if overwrite is enabled
                    if overwrite and attempt == 0:
                        self._delete_existing_file(remote_path, remote_filename)
                    
                    file_size = file_path.stat().st_size
                    file_size_mb = file_size / (1024 * 1024)
                    
                    self.logger.info(f"Uploading {remote_filename} ({file_size_mb:.1f} MB, {mime_type}) - Attempt {attempt + 1}/{max_retries}")
                    
                    # Read file data
                    with open(file_path, 'rb') as f:
                        file_data = f.read()
                    
                    # Add small delay between uploads to prevent server overload
                    if self._processed_count > 0:
                        time.sleep(0.5)
                    
                    # Try upload
                    try:
                        response = self.supabase.storage.from_(self.bucket_name).upload(
                            remote_path,
                            file_data,
                            file_options={
                                "content-type": mime_type,
                                "x-upsert": "false"
                            }
                        )
                        
                        public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                        self._log_successful_upload(remote_filename, slide_name, file_path, stats)
                        self._processed_count += 1
                        
                        return UploadResult.success_result(public_url)
                        
                    except Exception as upload_error:
                        error_str = str(upload_error).lower()
                        
                        # If it's a duplicate error on retry, the file was uploaded successfully
                        if attempt > 0 and self._is_duplicate_error(upload_error):
                            self.logger.info(f"File {remote_filename} exists (duplicate error on attempt {attempt + 1}) - treating as success")
                            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                            return UploadResult.success_result(public_url)
                        
                        if attempt < max_retries - 1:
                            if any(phrase in error_str for phrase in ['server disconnected', 'connection', 'timeout', 'network', 'broken pipe']):
                                self.logger.warning(f"Upload attempt {attempt + 1} failed for {slide_name}: {upload_error}. Retrying in {retry_delay} seconds...")
                                time.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue
                        
                        raise upload_error
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    if attempt == max_retries - 1:
                        self.logger.error(f"Upload failed for {slide_name} after {max_retries} attempts: {error_msg}")
                    
                    # Classify the error type
                    if self._is_duplicate_error(e):
                        if attempt == max_retries - 1:
                            self.logger.info(f"File {remote_filename} exists (duplicate on final attempt) - treating as success")
                            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(remote_path)
                            return UploadResult.success_result(public_url)
                        return UploadResult.duplicate_error(error_msg)
                    elif self._is_file_too_large_error(e):
                        return UploadResult.file_too_large_error(error_msg)
                    else:
                        if attempt == max_retries - 1:
                            return UploadResult.other_error(error_msg)
            
            return UploadResult.other_error("Upload failed after all retry attempts")
    
    def _log_successful_upload(self, remote_filename: str, slide_name: str, file_path: Path, 
                             stats: Optional[CompressionStats]):
        """Log successful upload."""
        file_size = file_path.stat().st_size // 1024
        self.logger.info(f"Upload successful: {remote_filename} ({file_size}KB)")
        print(f"✅ Successfully uploaded {remote_filename} ({file_size}KB) for {slide_name}")