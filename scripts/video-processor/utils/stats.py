"""
Statistics tracking and reporting utilities.
"""

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any


class CompressionStats:
    """Track compression statistics for a single file."""
    
    def __init__(self):
        self.original_size_kb: int = 0
        self.compressed_size_kb: int = 0
        self.compression_ratio: float = 0.0
        self.method: str = ""
        self.settings: Dict = {}
        self.attempts: int = 1
        self.final_rf: Optional[int] = None
        
    def calculate_ratio(self) -> float:
        """Calculate compression ratio as percentage."""
        if self.original_size_kb > 0:
            self.compression_ratio = (1 - self.compressed_size_kb / self.original_size_kb) * 100
        return self.compression_ratio
    
    def to_metadata_dict(self) -> Dict:
        """Convert stats to metadata dictionary for Supabase."""
        metadata = {
            "original_size_kb": self.original_size_kb,
            "compressed_size_kb": self.compressed_size_kb,
            "compression_ratio": round(self.compression_ratio, 2),
            "compression_method": self.method,
            "compression_attempts": self.attempts
        }
        
        if self.method == "handbrake" and self.final_rf:
            metadata.update({
                "video_rf": self.final_rf,
                "resolution": "720p"
            })
        elif self.method == "pillow":
            metadata.update({
                "image_quality": self.settings.get("quality", 85),
                "max_resolution": "1920x1080"
            })
        
        return metadata
    
    @classmethod
    def create_no_compression_stats(cls, file_path: Path, file_type: str) -> 'CompressionStats':
        """Create stats for files that weren't compressed."""
        stats = cls()
        stats.original_size_kb = file_path.stat().st_size // 1024
        stats.compressed_size_kb = stats.original_size_kb
        stats.method = "none"
        stats.compression_ratio = 0.0
        return stats


class StatsManager:
    """Manages compression statistics across all processed files."""
    
    def __init__(self):
        self._stats_lock = threading.Lock()
        self._compression_stats: Dict[str, CompressionStats] = {}
    
    def add_stats(self, slide_id: str, stats: CompressionStats):
        """Add stats for a processed slide."""
        with self._stats_lock:
            self._compression_stats[slide_id] = stats
    
    def get_stats(self, slide_id: str) -> Optional[CompressionStats]:
        """Get stats for a specific slide."""
        return self._compression_stats.get(slide_id)
    
    def get_all_stats(self) -> Dict[str, CompressionStats]:
        """Get all compression statistics."""
        return self._compression_stats.copy()
    
    def save_mapping(self, slide_mapping: Dict[str, str]):
        """Save URL mapping to JSON file."""
        output_file = "slide_url_mapping.json"
        with open(output_file, 'w') as f:
            json.dump(slide_mapping, f, indent=2)
        print(f"\nSlide URL mapping saved to: {output_file}")
    
    def generate_compression_report(self) -> str:
        """Generate a detailed compression report."""
        if not self._compression_stats:
            return "No compression statistics available."
        
        report = []
        report.append("COMPRESSION STATISTICS REPORT")
        report.append("=" * 50)
        
        # Overall statistics
        total_original = sum(stats.original_size_kb for stats in self._compression_stats.values())
        total_compressed = sum(stats.compressed_size_kb for stats in self._compression_stats.values())
        overall_ratio = (1 - total_compressed / total_original) * 100 if total_original > 0 else 0
        
        report.append(f"Total files processed: {len(self._compression_stats)}")
        report.append(f"Total original size: {total_original:,} KB ({total_original/1024:.1f} MB)")
        report.append(f"Total compressed size: {total_compressed:,} KB ({total_compressed/1024:.1f} MB)")
        report.append(f"Overall compression ratio: {overall_ratio:.1f}%")
        report.append(f"Space saved: {total_original - total_compressed:,} KB ({(total_original - total_compressed)/1024:.1f} MB)")
        report.append("")
        
        # Group by compression method
        methods = {}
        for stats in self._compression_stats.values():
            method = stats.method
            if method not in methods:
                methods[method] = []
            methods[method].append(stats)
        
        for method, stats_list in methods.items():
            method_original = sum(s.original_size_kb for s in stats_list)
            method_compressed = sum(s.compressed_size_kb for s in stats_list)
            method_ratio = (1 - method_compressed / method_original) * 100 if method_original > 0 else 0
            
            report.append(f"{method.upper()} compression:")
            report.append(f"  Files: {len(stats_list)}")
            report.append(f"  Size reduction: {method_original:,} KB → {method_compressed:,} KB ({method_ratio:.1f}%)")
            
            # Show retry statistics for handbrake
            if method == "handbrake":
                retry_attempts = [s.attempts for s in stats_list if s.attempts > 1]
                if retry_attempts:
                    report.append(f"  Files requiring retries: {len(retry_attempts)}")
                    report.append(f"  Max retry attempts: {max(retry_attempts)}")
            
            report.append("")
        
        # Top 5 largest files
        sorted_stats = sorted(self._compression_stats.items(), 
                            key=lambda x: x[1].original_size_kb, reverse=True)
        
        report.append("LARGEST FILES (Top 5):")
        for i, (slide_id, stats) in enumerate(sorted_stats[:5]):
            report.append(f"  {i+1}. Slide {slide_id}: {stats.original_size_kb:,} KB → "
                         f"{stats.compressed_size_kb:,} KB ({stats.compression_ratio:.1f}%)")
        
        return "\n".join(report)
    
    def generate_reports(self):
        """Generate and save all reports."""
        # Generate compression report
        compression_report = self.generate_compression_report()
        report_file = f"compression_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(compression_report)
        print(f"Compression report saved to: {report_file}")
    
    def print_summary(self):
        """Print compression summary to console."""
        print(f"\n{'='*50}")
        print("COMPRESSION SUMMARY")
        print(f"{'='*50}")
        
        if self._compression_stats:
            total_original = sum(stats.original_size_kb for stats in self._compression_stats.values())
            total_compressed = sum(stats.compressed_size_kb for stats in self._compression_stats.values())
            overall_ratio = (1 - total_compressed / total_original) * 100 if total_original > 0 else 0
            
            print(f"📊 Total files: {len(self._compression_stats)}")
            print(f"💾 Space saved: {total_original - total_compressed:,} KB ({(total_original - total_compressed)/1024:.1f} MB)")
            print(f"📉 Overall compression: {overall_ratio:.1f}%")
            
            # Count retries
            retries = sum(1 for stats in self._compression_stats.values() if stats.attempts > 1)
            if retries > 0:
                print(f"🔄 Files requiring retries: {retries}")
        else:
            print("No compression statistics available.")
    
    def print_metadata_info(self):
        """Print metadata querying information."""
        print(f"\n{'='*50}")
        print("METADATA QUERYING INFO")
        print(f"{'='*50}")
        print("Your files now have rich metadata! You can query them using:")
        print("")
        print("📋 Query by slide ID:")
        print("   SELECT * FROM storage.objects WHERE metadata->>'slide' = '001';")
        print("")
        print("🎥 Query by file type:")
        print("   SELECT * FROM storage.objects WHERE metadata->>'type' = 'video';")
        print("")
        print("📊 Get file statistics:")
        print("   SELECT metadata->>'type' as type, COUNT(*) FROM storage.objects")
        print("   WHERE bucket_id = 'slide-content' GROUP BY metadata->>'type';")
        print("")
        print("🔍 Query by compression method:")
        print("   SELECT * FROM storage.objects WHERE metadata->>'compression_method' = 'handbrake';")
        print("")
        print("💡 Future-proof: Add multiple files per slide easily!")
        print("   Just upload with the same slide ID metadata")
