"""
Compression utilities for video and image processing.
"""

import subprocess
from pathlib import Path
from typing import Tuple, Optional, Any
from PIL import Image

from .stats import CompressionStats


class VideoCompressor:
    """Handles video compression using HandBrake CLI."""
    
    def __init__(self, logger: Any):
        self.logger = logger
    
    def compress(self, input_path: Path, output_path: Path, slide_id: str, 
                rf: Optional[int] = None) -> Tuple[bool, CompressionStats]:
        """Compress video using HandBrake CLI with size and retry tracking."""
        stats = CompressionStats()
        stats.original_size_kb = input_path.stat().st_size // 1024
        stats.method = "handbrake"
        stats.settings = {"rf": rf, "width": "720p"}
        
        try:
            # Ensure the output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            cmd = [
                'HandBrakeCLI',
                '--input', str(input_path),
                '--output', str(output_path),
                '--encoder', 'x264',
                '--quality', str(rf),
                '--width', '720',
                '--optimize'
            ]
            
            self.logger.info(f"Compressing video for slide {slide_id}: RF={rf}, "
                           f"input_size={stats.original_size_kb}KB")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0 and output_path.exists():
                stats.compressed_size_kb = output_path.stat().st_size // 1024
                stats.final_rf = rf
                ratio = stats.calculate_ratio()
                
                self.logger.info(f"Video compression successful for slide {slide_id}: "
                               f"{stats.original_size_kb}KB → {stats.compressed_size_kb}KB "
                               f"({ratio:.1f}% reduction, RF={rf})")
                
                return True, stats
            else:
                self.logger.error(f"HandBrake failed for slide {slide_id} (RF={rf}): {result.stderr}")
                return False, stats
                
        except subprocess.TimeoutExpired:
            self.logger.error(f"HandBrake timeout for slide {slide_id} (RF={rf})")
            return False, stats
        except Exception as e:
            self.logger.error(f"Error compressing slide {slide_id} (RF={rf}): {e}")
            return False, stats


class ImageCompressor:
    """Handles image compression using Pillow."""
    
    def __init__(self, logger: Any):
        self.logger = logger
    
    def compress(self, input_path: Path, output_path: Path, slide_id: str, 
                quality: int = 85) -> Tuple[bool, CompressionStats]:
        """Compress image using Pillow with size tracking."""
        stats = CompressionStats()
        stats.original_size_kb = input_path.stat().st_size // 1024
        stats.method = "pillow"
        stats.settings = {"quality": quality, "max_resolution": "1920x1080"}
        
        try:
            with Image.open(input_path) as img:
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                max_size = (1920, 1080)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            stats.compressed_size_kb = output_path.stat().st_size // 1024
            ratio = stats.calculate_ratio()
            
            self.logger.info(f"Image compression successful for slide {slide_id}: "
                           f"{stats.original_size_kb}KB → {stats.compressed_size_kb}KB "
                           f"({ratio:.1f}% reduction, quality={quality})")
            
            return True, stats
            
        except Exception as e:
            self.logger.error(f"Error compressing image for slide {slide_id}: {e}")
            return False, stats