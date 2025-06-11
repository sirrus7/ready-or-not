"""
Report generation for processing results.
"""

import json
from datetime import datetime
from typing import Dict, List, Any

from utils.stats import StatsManager


class ReportGenerator:
    """Generates various reports for the processing results."""
    
    def __init__(self, stats_manager: StatsManager, logger: Any):
        self.stats_manager = stats_manager
        self.logger = logger
    
    def generate_all_reports(self, slide_mapping: Dict[str, str], status_inventory: List[Dict]):
        """Generate all reports including mapping, compression stats, and status inventory."""
        # Save URL mapping
        self.stats_manager.save_mapping(slide_mapping)
        
        # Generate compression reports
        self.stats_manager.generate_reports()
        
        # Print summary
        self.stats_manager.print_summary()
        
        # Generate status inventory report
        self._generate_status_inventory_report(status_inventory)
        
        # Print metadata info
        self.stats_manager.print_metadata_info()
    
    def _generate_status_inventory_report(self, status_inventory: List[Dict]):
        """Generate comprehensive status inventory report."""
        # Sort by extracted slide name
        status_inventory.sort(key=lambda x: x['extracted_slide_name'])
        
        # Save detailed JSON report
        json_report_file = f"status_inventory_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_report_file, 'w') as f:
            json.dump(status_inventory, f, indent=2)
        print(f"Detailed status inventory saved to: {json_report_file}")
        
        # Generate human-readable report
        report_lines = []
        report_lines.append("STATUS INVENTORY REPORT")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Summary statistics
        total = len(status_inventory)
        successful = sum(1 for s in status_inventory if s['upload_success'])
        failed = total - successful
        
        report_lines.append("SUMMARY:")
        report_lines.append(f"  Total slides: {total}")
        report_lines.append(f"  Successful: {successful}")
        report_lines.append(f"  Failed: {failed}")
        report_lines.append("")
        
        # File type breakdown
        file_types = {}
        for status in status_inventory:
            ft = status['file_type']
            if ft not in file_types:
                file_types[ft] = {'total': 0, 'successful': 0, 'failed': 0}
            file_types[ft]['total'] += 1
            if status['upload_success']:
                file_types[ft]['successful'] += 1
            else:
                file_types[ft]['failed'] += 1
        
        report_lines.append("FILE TYPE BREAKDOWN:")
        for ft, counts in sorted(file_types.items()):
            report_lines.append(f"  {ft}: {counts['successful']}/{counts['total']} successful")
        report_lines.append("")
        
        # Detailed status
        report_lines.append("DETAILED STATUS:")
        report_lines.append("-" * 80)
        
        for status in status_inventory:
            report_lines.append(f"\nSlide: {status['extracted_slide_name']}")
            report_lines.append(f"  JSON ID: {status['json_slide_id']}")
            report_lines.append(f"  Original URL: {status['original_url']}")
            report_lines.append(f"  New URL: {status['new_url'] if status['new_url'] else 'N/A'}")
            report_lines.append(f"  File Type: {status['file_type']}")
            report_lines.append(f"  Status: {'✓ SUCCESS' if status['upload_success'] else '✗ FAILED'}")
            
            # Processing details
            report_lines.append(f"  Processing:")
            report_lines.append(f"    Download: {'✓' if status['download_success'] else '✗'}")
            report_lines.append(f"    Compression: {'✓' if status['compression_success'] else '✗ or N/A'}")
            
            if status['compression_details']:
                details = status['compression_details']
                report_lines.append(f"      - Original: {details['original_size_kb']} KB")
                report_lines.append(f"      - Compressed: {details['compressed_size_kb']} KB")
                report_lines.append(f"      - Reduction: {details['compression_ratio']}%")
                if details.get('final_rf'):
                    report_lines.append(f"      - Final RF: {details['final_rf']}")
            
            report_lines.append(f"    Upload: {'✓' if status['upload_success'] else '✗'}")
            if status['upload_attempts'] > 1:
                report_lines.append(f"      - Attempts: {status['upload_attempts']}")
            
            if status['error_message']:
                report_lines.append(f"  Error: {status['error_message']}")
            
            report_lines.append(f"  Processing Time: {status['processing_time']}s")
        
        # Failed slides summary
        if failed > 0:
            report_lines.append("\n" + "=" * 80)
            report_lines.append("FAILED SLIDES SUMMARY:")
            report_lines.append("-" * 80)
            for status in status_inventory:
                if not status['upload_success']:
                    report_lines.append(f"{status['extracted_slide_name']} (JSON ID: {status['json_slide_id']}): {status['error_message']}")
        
        # Save text report
        text_report_file = f"status_inventory_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(text_report_file, 'w') as f:
            f.write('\n'.join(report_lines))
        
        print(f"Status inventory report saved to: {text_report_file}")
        
        # Print summary to console
        self._print_console_summary(total, successful, failed, status_inventory)
    
    def _print_console_summary(self, total: int, successful: int, failed: int, 
                              status_inventory: List[Dict]):
        """Print summary to console."""
        print(f"\n{'='*50}")
        print("STATUS INVENTORY SUMMARY")
        print(f"{'='*50}")
        print(f"Total slides processed: {total}")
        print(f"Successful uploads: {successful}")
        print(f"Failed uploads: {failed}")
        
        if failed > 0:
            print(f"\nFailed slides:")
            for status in status_inventory:
                if not status['upload_success']:
                    print(f"  - {status['extracted_slide_name']} (JSON ID: {status['json_slide_id']})")