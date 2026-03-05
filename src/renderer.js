const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileDetails = document.getElementById('file-details');
const processing = document.getElementById('processing');
const result = document.getElementById('result');

const fileNameEl = document.getElementById('file-name');
const originalSizeEl = document.getElementById('original-size');
const estimatedSizeEl = document.getElementById('estimated-size');
const qualitySelect = document.getElementById('quality');
const compressBtn = document.getElementById('compress-btn');

const statOriginalEl = document.getElementById('stat-original');
const statFinalEl = document.getElementById('stat-final');
const statSavingEl = document.getElementById('stat-saving');
const openFolderBtn = document.getElementById('open-folder-btn');
const resetBtn = document.getElementById('reset-btn');

let currentFile = null;
let lastCompressedPath = null;

// --- Drag & Drop Handlers ---

dropZone.addEventListener('click', async () => {
    const filePath = await window.electronAPI.selectFile();
    if (filePath) handleNativePath(filePath);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function handleFile(file) {
    console.log('Manejando archivo:', file.name, 'Tipo:', file.type, 'Ruta:', file.path);

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
        alert('Por favor, selecciona un archivo PDF.');
        return;
    }

    if (!file.path) {
        console.error('La propiedad file.path no está disponible.');
        alert('Error: No se pudo acceder a la ruta del archivo. Asegúrate de que Electron tiene los permisos necesarios.');
        return;
    }

    try {
        const fileInfo = await window.electronAPI.getFileInfo(file.path);
        if (fileInfo.error) {
            console.error('Error de IPC getFileInfo:', fileInfo.error);
            alert('Error al leer el archivo: ' + fileInfo.error);
            return;
        }

        currentFile = fileInfo;
        showDetails(fileInfo);
    } catch (err) {
        console.error('Excepción en handleFile:', err);
        alert('Error inesperado: ' + err.message);
    }
}

async function handleNativePath(path) {
    console.log('Manejando ruta nativa:', path);
    try {
        const fileInfo = await window.electronAPI.getFileInfo(path);
        if (fileInfo.error) {
            console.error('Error de IPC getFileInfo:', fileInfo.error);
            alert('Error al leer el archivo: ' + fileInfo.error);
            return;
        }

        currentFile = fileInfo;
        showDetails(fileInfo);
    } catch (err) {
        console.error('Excepción en handleNativePath:', err);
        alert('Error inesperado: ' + err.message);
    }
}

function showDetails(fileInfo) {
    fileNameEl.textContent = fileInfo.name;
    originalSizeEl.textContent = formatBytes(fileInfo.size);
    updateEstimation();

    dropZone.classList.add('hidden');
    fileDetails.classList.remove('hidden');
    result.classList.add('hidden');
}

// --- Logic ---

qualitySelect.addEventListener('change', updateEstimation);

function updateEstimation() {
    if (!currentFile) return;

    // Estimation heuristics based on preset
    const ratios = {
        'screen': 0.25, // 75% reduction
        'ebook': 0.50,  // 50% reduction
        'printer': 0.85, // 15% reduction
        'prepress': 0.95 // 5% reduction
    };

    const ratio = ratios[qualitySelect.value];
    const estimatedSize = currentFile.size * ratio;
    estimatedSizeEl.textContent = `~${formatBytes(estimatedSize)}`;
}

compressBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    fileDetails.classList.add('hidden');
    processing.classList.remove('hidden');

    const quality = qualitySelect.value;
    const response = await window.electronAPI.compressPDF(currentFile.path, quality);

    processing.classList.add('hidden');

    if (response.success) {
        lastCompressedPath = response.outputPath;
        showResult(currentFile.size, response.size);
    } else {
        alert('Error durante la compresión: ' + response.error);
        fileDetails.classList.remove('hidden');
    }
});

function showResult(original, final) {
    statOriginalEl.textContent = formatBytes(original);
    statFinalEl.textContent = formatBytes(final);

    const savingPercent = Math.max(0, Math.round(((original - final) / original) * 100));
    statSavingEl.textContent = `${savingPercent}%`;

    result.classList.remove('hidden');
}

openFolderBtn.addEventListener('click', () => {
    if (lastCompressedPath) {
        window.electronAPI.openFileLocation(lastCompressedPath);
    }
});

resetBtn.addEventListener('click', () => {
    currentFile = null;
    lastCompressedPath = null;
    fileInput.value = '';
    result.classList.add('hidden');
    dropZone.classList.remove('hidden');
});

// --- Utils ---

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
