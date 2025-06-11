"""
Logging utilities for the media processor.
"""

import logging
from datetime import datetime


def setup_logging(log_file: str = None) -> logging.Logger:
    """Set up logging to both file and console."""
    
    # Generate log filename if not provided
    if log_file is None:
        log_file = f"media_processor_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    # Create logger
    logger = logging.getLogger('MediaProcessor')
    logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_formatter = logging.Formatter('%(message)s')
    
    # File handler (detailed logs)
    file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(detailed_formatter)
    
    # Console handler (clean output)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    # Log the start of a new session
    logger.info("=" * 60)
    logger.info("MediaProcessor session started")
    logger.info("=" * 60)
    
    return logger