const fs = require('fs');
const path = require('path');

// Check command line arguments
if (process.argv.length !== 4) {
    console.error('Usage: node update-slides.js <typescript-file> <mapping-file>');
    console.error('Example: node update-slides.js SlideContent.ts url-mappings.json');
    process.exit(1);
}

const tsFile = process.argv[2];
const mappingFile = process.argv[3];

// Check if files exist
if (!fs.existsSync(tsFile)) {
    console.error(`Error: TypeScript file '${tsFile}' not found`);
    process.exit(1);
}

if (!fs.existsSync(mappingFile)) {
    console.error(`Error: Mapping file '${mappingFile}' not found`);
    process.exit(1);
}

// Create backup of original TypeScript file
const backupFile = tsFile + '.backup';
fs.copyFileSync(tsFile, backupFile);
console.log(`Created backup: ${backupFile}`);

// Read the files
let urlMappings;
try {
    urlMappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
} catch (error) {
    console.error(`Error parsing mapping file: ${error.message}`);
    process.exit(1);
}

let tsContent = fs.readFileSync(tsFile, 'utf8');

// Function to update URLs in the TypeScript content
function updateUrls(content, mappings) {
    let updatedContent = content;
    let updateCount = 0;
    const updatedSlides = [];
    
    // Iterate through each mapping
    for (const [jsonId, url] of Object.entries(mappings)) {
        // Convert JSON ID (e.g., "084") to number
        const numericId = parseInt(jsonId, 10);
        
        // Create regex pattern to match slide objects with this ID and update their source_url
        // This matches id: 84 (or 84.1, etc.) and finds the source_url in the same object
        const slidePattern = new RegExp(
            `(\\{[^{}]*\\bid:\\s*${numericId}(?:\\.\\d+)?\\s*,)([^{}]*?)(source_url:\\s*['"\`])([^'"\`]+)(['"\`])`,
            'gs'
        );
        
        const matches = [...updatedContent.matchAll(slidePattern)];
        
        if (matches.length > 0) {
            // Replace all matches for this ID
            matches.forEach(match => {
                const fullMatch = match[0];
                const idPart = match[1];
                const betweenPart = match[2];
                const sourceUrlLabel = match[3];
                const oldUrl = match[4];
                const quote = match[5];
                
                const newMatch = idPart + betweenPart + sourceUrlLabel + url + quote;
                updatedContent = updatedContent.replace(fullMatch, newMatch);
                
                // Extract the actual ID for logging (might be 84 or 84.1)
                const actualIdMatch = idPart.match(/id:\s*([\d.]+)/);
                const actualId = actualIdMatch ? actualIdMatch[1] : numericId;
                
                updatedSlides.push({
                    id: actualId,
                    jsonKey: jsonId,
                    oldUrl: oldUrl,
                    newUrl: url
                });
                updateCount++;
            });
        }
    }
    
    return { updatedContent, updateCount, updatedSlides };
}

// Perform the updates
console.log('\n--- Updating URLs ---');
const { updatedContent, updateCount, updatedSlides } = updateUrls(tsContent, urlMappings);

// Show what was updated
if (updatedSlides.length > 0) {
    console.log('\nUpdated slides:');
    updatedSlides.forEach(({ id, jsonKey, oldUrl, newUrl }) => {
        console.log(`  Slide ${id} (from JSON key "${jsonKey}"):`);
        console.log(`    Old: ${oldUrl}`);
        console.log(`    New: ${newUrl}`);
    });
}

// Write the updated content back to the original file
fs.writeFileSync(tsFile, updatedContent);

console.log(`\nTotal updates made: ${updateCount}`);
console.log(`Updated file: ${tsFile}`);

// Summary of what was processed
console.log('\n--- Summary ---');
let foundCount = 0;
let notFoundCount = 0;
const notFoundIds = [];

for (const [jsonId, url] of Object.entries(urlMappings)) {
    const numericId = parseInt(jsonId, 10);
    const idRegex = new RegExp(`\\bid:\\s*${numericId}(?:\\.\\d+)?\\s*,`, 'g');
    const found = tsContent.match(idRegex);
    
    if (found) {
        foundCount++;
    } else {
        notFoundCount++;
        notFoundIds.push(jsonId);
    }
}

console.log(`Mapping entries in JSON: ${Object.keys(urlMappings).length}`);
console.log(`Slides found and updated: ${foundCount}`);
console.log(`Slides not found (skipped): ${notFoundCount}`);

if (notFoundIds.length > 0 && notFoundIds.length <= 20) {
    console.log(`Not found IDs: ${notFoundIds.join(', ')}`);
} else if (notFoundIds.length > 20) {
    console.log(`Not found IDs: ${notFoundIds.slice(0, 20).join(', ')}... and ${notFoundIds.length - 20} more`);
}

console.log(`\nBackup saved as: ${backupFile}`);