// ============================================================
//  Asteroids Remastered - standalone desktop launcher
//  ------------------------------------------------------------
//  This file is ONLY a wrapper. It opens a desktop window and
//  loads the existing Game.html. No game code is touched, so the
//  game runs exactly the same as it does in a web browser.
// ============================================================

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 760,
        minWidth: 720,
        minHeight: 560,
        useContentSize: true,       // width/height refer to the game area, not the title bar
        backgroundColor: '#000000',
        title: 'Asteroids Remastered',
        show: false,                // wait until the page is drawn (no white flash)
        webPreferences: {
            nodeIntegration: false, // the game is a normal web page; keep it locked down
            contextIsolation: true,
            spellcheck: false
        }
    });

    // A game doesn't need the File / Edit / View menu bar.
    Menu.setApplicationMenu(null);

    mainWindow.loadFile(path.join(__dirname, 'game', 'Game.html'));

    mainWindow.once('ready-to-show', () => mainWindow.show());

    // F11 toggles fullscreen. Every other key goes straight to the game untouched.
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            event.preventDefault();
        }
    });

    // If the game ever opens an external link, open it in the real browser instead.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// Only allow one copy of the game to run at a time.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(createWindow);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
