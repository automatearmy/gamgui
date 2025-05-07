/**
 * Script to update require paths in adapter files
 * This script updates the paths to use the dependencies from the gamgui-app/gamgui-server/node_modules directory
 */
const fs = require('fs');
const path = require('path');

// Colors for output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Function to print colored messages
function log(color, message) {
  console.log(`${color}${message}${RESET}`);
}

// Directory containing the adapter files
const adaptersDir = __dirname;

// Function to update require paths in a file
function updateRequirePaths(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update require paths
    content = content.replace(
      /require\(['"]([^./][^/].*)['"]\)/g, 
      "require(require('path').resolve(__dirname, '../../../node_modules/$1'))"
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    log(GREEN, `✅ Updated require paths in ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    log(RED, `❌ Error updating require paths in ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// Function to get all JavaScript files in a directory
function getJavaScriptFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.js') && file !== 'update-paths.js')
      .map(file => path.join(dir, file));
  } catch (error) {
    log(RED, `❌ Error reading directory ${dir}: ${error.message}`);
    return [];
  }
}

// Main function
async function main() {
  log(GREEN, '=== Updating Require Paths in Adapter Files ===');
  
  // Get all JavaScript files in the adapters directory
  const jsFiles = getJavaScriptFiles(adaptersDir);
  
  if (jsFiles.length === 0) {
    log(YELLOW, 'No JavaScript files found in the adapters directory.');
    return;
  }
  
  log(YELLOW, `Found ${jsFiles.length} JavaScript files.`);
  
  // Update require paths in each file
  let successCount = 0;
  
  for (const file of jsFiles) {
    if (updateRequirePaths(file)) {
      successCount++;
    }
  }
  
  log(GREEN, `\n✅ Updated require paths in ${successCount} of ${jsFiles.length} files.`);
  
  if (successCount < jsFiles.length) {
    log(YELLOW, 'Some files could not be updated. Check the errors above.');
  } else {
    log(GREEN, 'All files updated successfully.');
  }
}

// Run the main function
main().catch(error => {
  log(RED, `Unhandled error: ${error.message}`);
  process.exit(1);
});
