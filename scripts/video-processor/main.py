#!/usr/bin/env python3
"""
Main script for media processing pipeline.
Handles argument parsing and orchestrates the processing workflow.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

from processor import MediaProcessor
from utils.file_utils import load_slides_data


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Download, compress, and upload media files to Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py slides.json --supabase-url "https://project.supabase.co"
  python main.py slides.json --video-rf 20 --workers 5
  python main.py slides.json --video-rf 35 --bucket my-bucket --workers 15

Environment Variables:
  SUPABASE_URL     - Supabase project URL
  SUPABASE_KEY     - Supabase service role key (recommended)

Video Rate Factor (RF) Guide:
  RF 18-23: High quality, larger files
  RF 24-28: Good quality, balanced size (default: 28)
  RF 29-35: Lower quality, smaller files

Parallelism:
  --workers: Number of parallel workers (default: 10)

Retry Logic:
  If a video file is too large for Supabase:
  - Automatically re-compresses with higher RF
  - Increments RF by 2 each attempt
  - Continues until max-video-rf is reached

Logging:
  Creates timestamped log files with detailed processing info
        """
    )
    
    parser.add_argument(
        'json_file',
        help='Path to JSON file containing slide data'
    )
    
    parser.add_argument(
        '--video-rf',
        type=int,
        default=28,
        metavar='RF',
        help='Initial video compression rate factor (18-35, default: 28)'
    )
    
    parser.add_argument(
        '--max-video-rf',
        type=int,
        default=35,
        metavar='MAX_RF', 
        help='Maximum video RF for retry attempts (default: 35)'
    )

    parser.add_argument(
        '--overwrite',
        help='Overwrite files that already exist in bucket',
        default=False,
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=10,
        metavar='N',
        help='Number of parallel workers (default: 10)'
    )
    
    parser.add_argument(
        '--bucket',
        default='slide-media',
        help='Supabase storage bucket name (default: slide-media)'
    )
    
    parser.add_argument(
        '--supabase-url',
        help='Supabase project URL (or use SUPABASE_URL env var)'
    )
    
    parser.add_argument(
        '--supabase-key',
        help='Supabase service role key (or use SUPABASE_KEY env var)'
    )
    
    args = parser.parse_args()
    
    # Get Supabase credentials from environment variables if not provided
    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL')
    supabase_key = args.supabase_key or os.getenv('SUPABASE_KEY')
    
    if not supabase_url:
        parser.error("Supabase URL is required. Provide via --supabase-url or SUPABASE_URL environment variable.")
    
    if not supabase_key:
        parser.error("Supabase key is required. Provide via --supabase-key or SUPABASE_KEY environment variable.")
    
    # Add credentials to args object
    args.supabase_url = supabase_url
    args.supabase_key = supabase_key
    
    # Validate rate factors
    if not 18 <= args.video_rf <= 35:
        parser.error("Video rate factor must be between 18 and 35")
    
    if not 18 <= args.max_video_rf <= 35:
        parser.error("Maximum video rate factor must be between 18 and 35")
    
    if args.video_rf > args.max_video_rf:
        parser.error("Initial video RF cannot be higher than maximum video RF")
    
    # Validate workers count
    if not 1 <= args.workers <= 50:
        parser.error("Number of workers must be between 1 and 50")
    
    return args


def check_dependencies():
    """Check if required dependencies are installed."""
    print("Checking dependencies...")
    
    # Check HandBrake CLI
    try:
        subprocess.run(['HandBrakeCLI', '--version'], capture_output=True, check=True)
        print("✓ HandBrake CLI found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ HandBrake CLI not found. Please install HandBrake CLI.")
        print("   Download from: https://handbrake.fr/downloads.php")
        return False
    
    # Check Python packages
    try:
        import requests
        import PIL
        from supabase import create_client
        print("✓ Required Python packages found")
    except ImportError as e:
        print(f"✗ Missing Python package: {e}")
        print("   Run: pip install supabase requests pillow")
        return False
    
    return True


def main():
    args = parse_arguments()
    
    print(f"Media Processing Pipeline")
    print(f"========================")
    print(f"Input file: {args.json_file}")
    print(f"Video RF: {args.video_rf} (max: {args.max_video_rf})")
    print(f"Workers: {args.workers}")
    print(f"Bucket: {args.bucket}")
    print(f"Supabase URL: {args.supabase_url}")
    print(f"Supabase Key: {'*' * (len(args.supabase_key) - 4) + args.supabase_key[-4:] if len(args.supabase_key) > 4 else '****'}")
    print()
    
    # Check dependencies
    if not check_dependencies():
        return 1
    
    # Create processor
    processor = MediaProcessor(
        supabase_url=args.supabase_url,
        supabase_key=args.supabase_key,
        bucket_name=args.bucket,
        video_rf=args.video_rf,
        max_video_rf=args.max_video_rf,
        workers=args.workers,
        overwrite=args.overwrite,
    )
    
    try:
        # Load slides data
        slides_data = load_slides_data(args.json_file)
        
        print("Starting media processing pipeline...")
        
        # Process all slides - now returns both mapping and status inventory
        slide_mapping, status_inventory = processor.process_slides(slides_data)
        
        # Generate reports and cleanup - now includes status inventory
        processor.finalize_processing(slide_mapping, status_inventory, len(slides_data))
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user")
        return 1
    except Exception as e:
        print(f"\nError in main process: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        processor.cleanup()


if __name__ == "__main__":
    sys.exit(main())