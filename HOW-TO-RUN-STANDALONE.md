# How to run Asteroids Remastered as a standalone app

The game is now wrapped so it can run as its own desktop app (no web
browser needed). This is the same setup used by many games on Steam.

Nothing in the actual game was changed — this only adds a window around it.

---

## Play it right now (easiest way)

**Double-click `Play-Game.bat`.**

- The first time, it will spend a few minutes downloading the "engine"
  (called Electron). This happens only once.
- After that, the game opens in its own window every time.

Press **F11** to toggle fullscreen.

---

## Make the real installable app (for sharing / Steam later)

**Double-click `Build-Windows-App.bat`.**

- The first build downloads some extra build tools (a few minutes).
- When it finishes, look inside the new **`dist`** folder for a file
  ending in **`Setup.exe`** — that's your installer. You can run it to
  install the game like any normal program, or hand it to a friend.

---

## For nerds: the same thing from a terminal

```
npm install        (only needed once)
npm start          runs the game in a window
npm run dist       builds the Windows installer into the dist folder
```

---

## Optional: give it a custom icon

By default the app uses the plain Electron icon. To use your own:

1. Make an icon file named `icon.ico` (256x256 works well).
2. Put it in a new folder called `build` (so the path is `build/icon.ico`).
3. Build again — it gets picked up automatically.
