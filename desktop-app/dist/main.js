const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');

const isMac = process.platform === 'darwin';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '../app/index.html'));
}

function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function readAlbumTree(rootPath) {
  const stats = fs.statSync(rootPath);
  if (!stats.isDirectory()) {
    throw new Error('Selected path is not a folder');
  }

  function readFolder(folderPath) {
    const dirents = fs.readdirSync(folderPath, { withFileTypes: true });
    const folders = [];
    const images = [];

    dirents.sort((a, b) => a.name.localeCompare(b.name));

    for (const dirent of dirents) {
      const entryPath = path.join(folderPath, dirent.name);
      if (dirent.isDirectory()) {
        folders.push(readFolder(entryPath));
      } else if (dirent.isFile() && isImage(entryPath)) {
        images.push({
          name: dirent.name,
          path: entryPath,
          type: 'image',
        });
      }
    }

    return {
      name: path.basename(folderPath),
      path: folderPath,
      type: 'folder',
      children: [...folders, ...images],
    };
  }

  return readFolder(rootPath);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

ipcMain.handle('album:select-root', async () => {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose album root folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('album:read-tree', async (_event, rootPath) => {
  if (!rootPath) {
    return null;
  }

  return readAlbumTree(rootPath);
});
