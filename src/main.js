const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { getGSBinaryPath } = require('./binaries');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 600,
        minHeight: 500,
        icon: path.join(__dirname, '..', 'img', 'pdfcito.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Access to local files
        },
        titleBarStyle: 'hiddenInset'
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

ipcMain.handle('get-file-info', async (event, filePath) => {
    console.log('IPC: get-file-info solicitado para:', filePath);
    try {
        if (!filePath) throw new Error('Ruta de archivo no proporcionada');

        const stats = fs.statSync(filePath);
        console.log('IPC: get-file-info éxito. Tamaño:', stats.size);

        return {
            name: path.basename(filePath),
            size: stats.size,
            path: filePath
        };
    } catch (error) {
        console.error('IPC: get-file-info error:', error.message);
        return { error: error.message };
    }
});

ipcMain.handle('compress-pdf', async (event, { inputPath, quality }) => {
    const gsPath = getGSBinaryPath();
    const outputDir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${baseName}_compressed${ext}`);

    // Ghostscript settings based on quality preset
    // /screen (72 dpi), /ebook (150 dpi), /printer (300 dpi), /prepress (300 dpi color)
    const preset = quality || 'ebook';

    const args = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=/${preset}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath
    ];

    return new Promise((resolve) => {
        console.log(`Executing: ${gsPath} ${args.join(' ')}`);

        const gs = spawn(gsPath, args);

        gs.on('close', (code) => {
            if (code === 0) {
                const stats = fs.statSync(outputPath);
                resolve({
                    success: true,
                    outputPath,
                    size: stats.size
                });
            } else {
                resolve({
                    success: false,
                    error: `Ghostscript exited with code ${code}`
                });
            }
        });

        gs.on('error', (err) => {
            resolve({
                success: false,
                error: `Failed to start Ghostscript: ${err.message}`
            });
        });
    });
});

ipcMain.handle('select-file', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'PDFs', extensions: ['pdf'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle('open-file-location', async (event, filePath) => {
    shell.showItemInFolder(filePath);
});
