const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Get the path to the Ghostscript binary based on the platform and environment.
 */
function getGSBinaryPath() {
    const isDev = !app.isPackaged;
    let binaryName = process.platform === 'win32' ? 'gswin64c.exe' : 'gs';
    
    let baseDir;
    if (isDev) {
        // In development, look in the root bin/ folder
        baseDir = path.join(__dirname, '..', 'bin');
    } else {
        // In production, look in the extraResources folder
        baseDir = path.join(process.resourcesPath, 'bin');
    }

    const binaryPath = path.join(baseDir, binaryName);
    
    // Fallback if not found in bundled folder (useful for local development if not yet placed in bin/)
    if (!fs.existsSync(binaryPath)) {
        console.warn(`Ghostscript binary not found at ${binaryPath}. Falling back to system 'gs'.`);
        return binaryName; 
    }

    return binaryPath;
}

module.exports = { getGSBinaryPath };
