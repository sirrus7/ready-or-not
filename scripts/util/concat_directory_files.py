#!/usr/bin/env python3
"""
File Concatenator Script
Recursively concatenates all files with specified extensions from a directory.
"""

import os
import sys
from pathlib import Path
import argparse

def concat_files(directory, extensions, output_file=None, include_headers=True, ignore_dirs=None):
    """
    Concatenate all files with specified extensions from a directory recursively.
    
    Args:
        directory: Root directory to search
        extensions: List of file extensions to include (e.g., ['.py', '.txt'])
        output_file: Optional output file path. If None, prints to stdout
        include_headers: Whether to include file path headers before each file's content
        ignore_dirs: List of directory names to ignore (e.g., ['__pycache__', '.git'])
    """
    if ignore_dirs is None:
        ignore_dirs = ['__pycache__', '.git', 'node_modules', '.venv', 'venv', 'env']
    
    # Ensure extensions start with dot
    extensions = [ext if ext.startswith('.') else f'.{ext}' for ext in extensions]
    
    # Collect all matching files
    matched_files = []
    root_path = Path(directory).resolve()
    
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Remove ignored directories from dirnames to prevent walking into them
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        
        for filename in filenames:
            if any(filename.endswith(ext) for ext in extensions):
                file_path = Path(dirpath) / filename
                matched_files.append(file_path)
    
    # Sort files for consistent output
    matched_files.sort()
    
    # Prepare output
    output_lines = []
    
    if matched_files:
        output_lines.append(f"# Concatenated {len(matched_files)} files with extensions: {', '.join(extensions)}")
        output_lines.append(f"# From directory: {root_path}")
        output_lines.append("=" * 80)
        output_lines.append("")
    
    # Process each file
    for file_path in matched_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if include_headers:
                # Calculate relative path for cleaner display
                try:
                    rel_path = file_path.relative_to(root_path)
                except ValueError:
                    # If relative_to fails, just use the full path
                    rel_path = file_path
                output_lines.append(f"{'=' * 80}")
                output_lines.append(f"File: {rel_path}")
                output_lines.append(f"{'=' * 80}")
                output_lines.append("")
            
            output_lines.append(content)
            
            if not content.endswith('\n'):
                output_lines.append("")  # Ensure newline between files
            
            output_lines.append("")  # Extra blank line between files
            
        except Exception as e:
            output_lines.append(f"ERROR reading {file_path}: {e}")
            output_lines.append("")
    
    # Write output
    output_text = '\n'.join(output_lines)
    
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(output_text)
        print(f"✓ Concatenated {len(matched_files)} files to: {output_file}")
    else:
        print(output_text)
    
    return matched_files

def main():
    parser = argparse.ArgumentParser(
        description='Concatenate all files with specified extensions from a directory recursively.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Concatenate all Python files in current directory
  python concat_files.py . -e .py
  
  # Concatenate Python and text files, save to output.txt
  python concat_files.py /path/to/project -e .py .txt -o output.txt
  
  # Without file headers
  python concat_files.py . -e .js .jsx --no-headers
  
  # Ignore specific directories
  python concat_files.py . -e .py --ignore-dirs tests __pycache__ .git
        """
    )
    
    parser.add_argument('directory', help='Directory to search for files')
    parser.add_argument('-e', '--extensions', nargs='+', required=True,
                        help='File extensions to include (e.g., .py .txt .js)')
    parser.add_argument('-o', '--output', help='Output file path (default: print to stdout)')
    parser.add_argument('--no-headers', action='store_true',
                        help='Exclude file path headers from output')
    parser.add_argument('--ignore-dirs', nargs='*',
                        default=['__pycache__', '.git', 'node_modules', '.venv', 'venv', 'env'],
                        help='Directory names to ignore (default: __pycache__, .git, node_modules, .venv, venv, env)')
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.directory):
        print(f"Error: '{args.directory}' is not a valid directory", file=sys.stderr)
        sys.exit(1)
    
    matched_files = concat_files(
        directory=args.directory,
        extensions=args.extensions,
        output_file=args.output,
        include_headers=not args.no_headers,
        ignore_dirs=args.ignore_dirs
    )
    
    if not matched_files:
        print(f"No files found with extensions: {', '.join(args.extensions)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
