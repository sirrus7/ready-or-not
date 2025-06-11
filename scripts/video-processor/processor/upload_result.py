"""
Upload result handling and error classification.
"""

from enum import Enum


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