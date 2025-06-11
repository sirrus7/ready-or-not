"""
Handles file processing operations including download and compression.
"""

import re
import shutil
from pathlib import Path
from typing import Tuple, Any

import requests

from utils.compression import VideoCompressor, ImageCompressor
from utils.stats import CompressionStats
from utils.file_utils import get_file_extension


class FileProcessor:
    """Handles file downloading and processing operations."""
    
    def __init__(self, logger: Any, video_rf: int = 28):
        self.logger = logger
        self.video_compressor = VideoCompressor(logger)
        self.image_compressor = ImageCompressor(logger)
        self.video_rf = video_rf
    
    def extract_slide_name_from_url(self, url: str) -> str:
        """Extract slide name (e.g., 'Slide_001') from URL."""
        match = re.search(r'(Slide_\d+)\.(jpg|jpeg|png|mp4)', url)
        if match:
            return match.group(1)
        else:
            filename = url.split('/')[-1].split('?')[0]
            return Path(filename).stem
    
    def download_file(self, url: str, filename: str, download_dir: Path) -> Path:
        """Download a file from URL to the specified directory."""
        filepath = download_dir / filename
        
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return filepath
    
    def process_file(self, downloaded_path: Path, slide_name: str, file_ext: str, 
                    compressed_dir: Path, video_rf: int = None) -> Tuple[Path, str, str, CompressionStats]:
        """Process file based on its type (video, image, or unknown)."""
        if video_rf is None:
            video_rf = self.video_rf
            
        if file_ext.lower() == '.mp4':
            return self._process_video(downloaded_path, slide_name, compressed_dir, video_rf)
        elif file_ext.lower() in ['.jpg', '.jpeg', '.png']:
            return self._process_image(downloaded_path, slide_name, compressed_dir, file_ext)
        else:
            return self._process_unknown_file(downloaded_path, slide_name, file_ext)
    
    def _process_video(self, downloaded_path: Path, slide_name: str, compressed_dir: Path, 
                      video_rf: int) -> Tuple[Path, str, str, CompressionStats]:
        """Process video file with compression."""
        compressed_path = compressed_dir / f"{slide_name}_compressed.mp4"
        success, stats = self.video_compressor.compress(downloaded_path, compressed_path, slide_name, video_rf)
        
        if success:
            return compressed_path, f"{slide_name}.mp4", "video", stats
        else:
            # Use original if compression fails, but rename it properly
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "video")
            properly_named_path = compressed_dir / f"{slide_name}.mp4"
            shutil.copy2(downloaded_path, properly_named_path)
            return properly_named_path, f"{slide_name}.mp4", "video", stats
    
    def _process_image(self, downloaded_path: Path, slide_name: str, compressed_dir: Path, 
                      file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process image file with compression."""
        compressed_path = compressed_dir / f"{slide_name}_compressed.jpg"
        success, stats = self.image_compressor.compress(downloaded_path, compressed_path, slide_name)
        
        if success:
            return compressed_path, f"{slide_name}.jpg", "image", stats
        else:
            # Use original if compression fails, but rename it properly
            stats = CompressionStats.create_no_compression_stats(downloaded_path, "image")
            output_ext = '.jpg' if file_ext.lower() in ['.jpg', '.jpeg'] else file_ext
            properly_named_path = compressed_dir / f"{slide_name}{output_ext}"
            shutil.copy2(downloaded_path, properly_named_path)
            return properly_named_path, f"{slide_name}{output_ext}", "image", stats
    
    def _process_unknown_file(self, downloaded_path: Path, slide_name: str, 
                             file_ext: str) -> Tuple[Path, str, str, CompressionStats]:
        """Process unknown file type (no compression)."""
        stats = CompressionStats.create_no_compression_stats(downloaded_path, "unknown")
        properly_named_path = downloaded_path.parent / f"{slide_name}{file_ext}"
        shutil.copy2(downloaded_path, properly_named_path)
        return properly_named_path, f"{slide_name}{file_ext}", "unknown", stats
    
    def find_original_video_file(self, download_dir: Path, slide_name: str) -> Path:
        """Find the original video file for recompression."""
        for ext in ['.mp4', '.avi', '.mov', '.mkv']:
            candidate = download_dir / f"{slide_name}_original{ext}"
            if candidate.exists():
                return candidate
        return None