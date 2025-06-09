# Media Processor Pipeline

A powerful, parallelized media processing pipeline that downloads, compresses, and uploads media files to Supabase with rich metadata support.

## Features

🚀 **Parallel Processing** - Process multiple files simultaneously with configurable workers  
📊 **Compression Tracking** - Track before/after sizes and compression ratios  
🔄 **Smart Retry Logic** - Automatically retry with higher compression if files are too large  
📝 **Comprehensive Logging** - Detailed logs and compression reports  
🏷️ **Rich Metadata** - Tag files with slide IDs, types, compression info, and more  
⚡ **Future-Proof** - Support for multiple files per slide  

## Project Structure

```
media_processor/
├── main.py                    # Main entry point and argument parsing
├── processor.py               # Core MediaProcessor class
├── requirements.txt           # Python dependencies
├── utils/                     # Utility modules
│   ├── __init__.py           
│   ├── compression.py         # Video and image compression utilities
│   ├── file_utils.py          # File operations and data loading
│   ├── logging_utils.py       # Logging configuration
│   └── stats.py               # Statistics tracking and reporting
└── README.md                  # This file
```

## Installation

1. **Clone/download the files** and ensure they're in the correct structure
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Install HandBrake CLI:**
   - Download from: https://handbrake.fr/downloads.php
   - Ensure `HandBrakeCLI` is in your PATH

## Usage

### Basic Usage

```bash
# Set environment variables (recommended)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your_service_role_key"

# Run with default settings
python main.py slides.json
```

### Advanced Usage

```bash
# High-performance processing
python main.py slides.json --workers 15 --video-rf 25

# Conservative processing (limited resources)
python main.py slides.json --workers 3 --video-rf 32

# With retry limits
python main.py slides.json --video-rf 28 --max-video-rf 35

# Custom bucket
python main.py slides.json --bucket my-media --workers 10
```

### Command Line Options

- `json_file` (required): Path to JSON file with slide data
- `--video-rf`: Initial video compression rate factor (18-35, default: 28)
- `--max-video-rf`: Maximum RF for retry attempts (default: 35)
- `--workers`: Number of parallel workers (1-50, default: 10)
- `--bucket`: Supabase storage bucket name (default: slide-media)
- `--supabase-url`: Supabase project URL (or use env var)
- `--supabase-key`: Supabase service role key (or use env var)

## File Processing Workflow

1. **Download** original files from Firebase URLs
2. **Compress** videos with HandBrake and images with Pillow
3. **Upload** to Supabase with rich metadata
4. **Retry** with higher compression if files are too large
5. **Generate** detailed reports and statistics

## Output Files

- `slide_url_mapping.json` - Mapping from slide IDs to new URLs
- `media_processor_YYYYMMDD_HHMMSS.log` - Detailed processing log
- `compression_report_YYYYMMDD_HHMMSS.txt` - Compression statistics

## Metadata Structure

Each uploaded file includes rich metadata:

```json
{
  "slide": "001",
  "type": "video",
  "original_size_kb": 2048,
  "compressed_size_kb": 1024,
  "compression_ratio": 50.0,
  "compression_method": "handbrake",
  "compression_attempts": 1,
  "video_rf": 28,
  "resolution": "720p",
  "processed_at": "2025-06-09 14:30:15"
}
```

## Querying Metadata

```sql
-- Get all files for a specific slide
SELECT * FROM storage.objects WHERE metadata->>'slide' = '001';

-- Get all videos
SELECT * FROM storage.objects WHERE metadata->>'type' = 'video';

-- Get compression statistics
SELECT 
  metadata->>'type' as file_type,
  AVG((metadata->>'compression_ratio')::float) as avg_compression,
  COUNT(*) as file_count
FROM storage.objects 
WHERE bucket_id = 'slide-media' 
GROUP BY metadata->>'type';
```

## Performance Tuning

### Worker Guidelines
- **1-5 workers**: Conservative, good for limited resources
- **6-10 workers**: Balanced performance (recommended)
- **11-20 workers**: High performance, requires good CPU/internet
- **20+ workers**: Maximum speed, may overwhelm services

### Memory Guidelines
- **32GB RAM**: 15-20 workers
- **16GB RAM**: 8-12 workers
- **8GB RAM**: 3-5 workers

### Compression Guidelines
- **RF 18-23**: High quality, larger files
- **RF 24-28**: Good balance (recommended)
- **RF 29-35**: Smaller files, lower quality

## Error Handling

- **File too large**: Automatically retries with higher compression
- **Network issues**: Includes timeouts and retries
- **Compression failures**: Falls back to original files
- **Missing dependencies**: Clear error messages and suggestions

## Future-Proof Design

- **Multiple files per slide**: Just use the same slide ID
- **Rich metadata**: Query by any attribute
- **Extensible**: Easy to add new compression methods
- **Scalable**: Parallel processing handles large datasets

## Troubleshooting

### Common Issues

1. **HandBrake not found**
   - Install HandBrake CLI and ensure it's in PATH
   
2. **Memory issues with many workers**
   - Reduce `--workers` parameter
   
3. **Network timeouts**
   - Reduce workers or check internet connection
   
4. **File too large errors persist**
   - Increase `--max-video-rf` to allow more compression

### Getting Help

Check the log files for detailed error information:
- Main log: `media_processor_YYYYMMDD_HHMMSS.log`
- Console output shows progress and key events