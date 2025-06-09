"""
File utilities for loading data and handling file operations.
"""

import json
from pathlib import Path
from typing import List, Dict


def load_slides_data(json_file_path: str) -> List[Dict]:
    """Load slides data from JSON file."""
    try:
        with open(json_file_path, 'r') as f:
            slides_data = json.load(f)
        print(f"✓ Loaded {len(slides_data)} slides from {json_file_path}")
        return slides_data
    except FileNotFoundError:
        print(f"✗ Error: Could not find '{json_file_path}'")
        print("   Make sure the JSON file path is correct.")
        exit(1)
    except json.JSONDecodeError as e:
        print(f"✗ Error: Invalid JSON in '{json_file_path}': {e}")
        exit(1)


def get_file_extension(url: str) -> str:
    """Extract file extension from URL."""
    return Path(url.split('?')[0]).suffix


def ensure_directory_exists(directory: Path) -> None:
    """Ensure a directory exists, creating it if necessary."""
    directory.mkdir(parents=True, exist_ok=True)


def get_file_size_kb(file_path: Path) -> int:
    """Get file size in kilobytes."""
    return file_path.stat().st_size // 1024


def format_file_size(size_kb: int) -> str:
    """Format file size in a human-readable format."""
    if size_kb < 1024:
        return f"{size_kb} KB"
    elif size_kb < 1024 * 1024:
        return f"{size_kb / 1024:.1f} MB"
    else:
        return f"{size_kb / (1024 * 1024):.1f} GB"