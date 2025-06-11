"""
Media processor package for downloading, compressing, and uploading media files.
"""

from .processor import MediaProcessor
from .upload_result import UploadResult

__all__ = ['MediaProcessor', 'UploadResult']
