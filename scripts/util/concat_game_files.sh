#!/bin/bash

# This script generates a single text file containing the content of specified project files
# and a listing of all files within the /public directory.

# Define the root directory of your project
PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# List of specific top-level files to include
TOP_LEVEL_FILES=(
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
    "netlify.toml"
    "eslint.config.js"
    "postcss.config.js"
    "tailwind.config.js"
    "index.html"
    "README.md"
)

# Function to print file content with a header and footer
print_file_content() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        # Create a relative path for the header
        local relative_path="${file_path#"$PROJECT_ROOT"/}"
        echo "--- FILE: ${PROJECT_NAME}/${relative_path} ---"
        cat "$file_path"
        echo "--- END FILE: ${PROJECT_NAME}/${relative_path} ---"
        echo "" # Add a blank line for readability
    fi
}

# Clear the output file to start fresh
> all_files.txt

# Start of the main output redirection
{
    echo "--- START OF FILE all_files.txt ---"
    echo ""

    # 1. Process top-level files
    for file in "${TOP_LEVEL_FILES[@]}"; do
        print_file_content "$PROJECT_ROOT/$file"
    done

    # 2. Process all relevant files within the 'src' directory
    # This will find .ts, .tsx, .js, .jsx, .css files
    find "$PROJECT_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) | sort | while read -r file; do
        print_file_content "$file"
    done

    # 3. Process tsconfig.app.json and tsconfig.node.json
    print_file_content "$PROJECT_ROOT/tsconfig.app.json"
    print_file_content "$PROJECT_ROOT/tsconfig.node.json"

    # 4. NEW SECTION: List files in the /public directory without their content
    # This is useful for understanding what static assets (images, PDFs) are available.
    echo "--- START OF PUBLIC FOLDER LISTING ---"
    echo "# This section lists the file paths of all static assets in the /public directory."
    echo "# The content of these files (e.g., images, PDFs) is not included."
    echo ""

    if [ -d "$PROJECT_ROOT/public" ]; then
        find "$PROJECT_ROOT/public" -type f | sort | while read -r file; do
            # FIX: Removed 'local' keyword, as it's only valid inside a function.
            relative_path="${file#"$PROJECT_ROOT"/}"
            echo "--- PUBLIC FILE: ${PROJECT_NAME}/${relative_path} ---"
        done
    else
        echo "# /public directory not found."
    fi

    echo ""
    echo "--- END OF PUBLIC FOLDER LISTING ---"
    echo ""


    echo "--- END OF FILE all_files.txt ---"

} > all_files.txt

echo "all_files.txt has been generated successfully."