"""
Utilities package for the media processor.
"""

from .compression import VideoCompressor, ImageCompressor
from .file_utils import load_slides_data, get_file_extension, ensure_directory_exists
from .logging_utils import setup_logging
from .stats import CompressionStats, StatsManager

__all__ = [
    'VideoCompressor',
    'ImageCompressor',
    'load_slides_data',
    'get_file_extension',
    'ensure_directory_exists',
    'setup_logging',
    'CompressionStats',
    'StatsManager',
]
