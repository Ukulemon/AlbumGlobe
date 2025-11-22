# AlbumGlobe

This repository now includes a desktop shell for the 3D album prototype. The desktop experience is built with Electron + Three.js so it can render the existing WebGL sphere UI while using native folder selection and filesystem traversal.

## Desktop app

The Electron project lives under `desktop-app/` and reuses the styling and layouts from the `AlbumGlobe.html` prototype.

### Run the app

1. Install dependencies (Node 18+ recommended):
   ```bash
   cd desktop-app
   npm install
   npm run start
   ```

2. Click **选择文件夹并开始** to pick an album root. First-level subfolders and images are distributed on a 3D sphere. Click folders to drill down or images to open the fullscreen viewer.

### Build a Windows 64-bit installer

The project is configured for a Windows x64 NSIS target:

```bash
cd desktop-app
npm run build:win
```

The build step packages the `app/` assets and Electron runtime. On Windows, the resulting installer will be placed under `desktop-app/dist/` by `electron-builder`.

### Feature highlights

- Native folder picker and recursive filesystem scan (no `<input webkitdirectory>` dependency)
- Fibonacci sphere layout driven by Three.js for subfolders/images
- Click-through navigation with a stack for backtracking
- Fullscreen image overlay with ESC/close support and resource cleanup when changing levels
