const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let mainWindow = null;
let backendProcess = null;

const FRONTEND_DEV_URL = 'http://localhost:5173';

function getBackendPath() {
  return path.join(process.resourcesPath, 'backend');
}

function getFrontendPath() {
  if (isDev) {
    return FRONTEND_DEV_URL;
  }

  return 'http://localhost:3001';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
  });

mainWindow.loadURL(getFrontendPath());

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Window ready');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (isDev) {
    console.log('🟢 Dev mode: backend started externally');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log('Starting production backend...');

    const backendPath = getBackendPath();

    backendProcess = spawn('node', ['dist/server.js'], {
    cwd: backendPath,
    shell: true,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production'
    }
    });

    backendProcess.on('error', reject);

    setTimeout(() => {
      console.log('Backend started');
      resolve();
    }, 2500);
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('🛑 Stopping backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    console.error('App failed to start:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', stopBackend);