# Drift Drive desktop

The desktop edition contains Cruise Life V4.1, a native app icon, offline game
files, a fullscreen/windowed display, native menus and a persistent save profile.
It does not need a browser, local server, Node.js or an internet connection to play.

## Install and play

| Computer | Download | Install |
| --- | --- | --- |
| Intel Mac, including older Intel MacBook Air models | mac-x64 DMG | Open the DMG and drag Drift Drive into Applications. |
| Apple Silicon Mac (M1 or newer) | mac-arm64 DMG | Open the DMG and drag Drift Drive into Applications. |
| Windows 10/11, 64-bit | win-x64 EXE | Run setup. It installs for your user and offers a desktop shortcut. |

Mac ZIP archives containing the same .app are also produced. Extract the ZIP
before moving the app to Applications. Mac builds require macOS 12 Monterey
or later. The Windows build targets x64 PCs.

These first builds are not signed with an Apple Developer ID or a Windows
publisher certificate, and are not notarized. macOS may ask you to approve
opening this app in System Settings → Privacy & Security after attempting to
open it. Windows may display an unknown-publisher warning. Only approve the
build you obtained from this repository. Signing/notarization can be added
when distribution certificates are available; no certificates are bundled.

Open the app and choose Solo Run or Split Screen. All V4.1 controls remain:
J for Cruise Life/customization, P for tuning, O for photo mode, Tab for the
map and Esc for the game menu. On Windows, F11 toggles fullscreen; on Mac use
Control–Command–F or View → Enter Full Screen. Hold Alt on Windows to reveal
the native menu bar. Help → Controls & shortcuts shows a quick reference.
Photo exports open a native PNG save dialog. Local music import stays local.

## Saves

Tuning, personal builds, routes and exploration save automatically in the app.
The app uses its own profile; existing saves in Safari/Chrome are separate.
Help → Open saved-data folder opens the profile location:

- Mac: ~/Library/Application Support/Drift Drive
- Windows: %APPDATA%/Drift Drive

Normal app updates keep this profile. The Windows uninstaller preserves it.
Personal music files must be selected again after reopening, just like the web
edition. Window size/maximized state are remembered. Only one app instance
opens at a time.

## Downloading builds from GitHub

The **Desktop installers** workflow runs on pull requests, or manually from
GitHub Actions once the workflow is on the default branch. Open its completed
run and download the matching artifact:

- Drift-Drive-mac-x64
- Drift-Drive-mac-arm64
- Drift-Drive-win-x64

Extract the artifact ZIP to find the DMG/ZIP or EXE inside. Artifacts are kept
for 30 days. This workflow does not publish a public release automatically.

## Build locally

Building needs Node.js 22.18+ (Node 24 recommended) and npm. Playing a packaged
app does not need either. From the project directory:

    npm ci
    npm test
    npm run desktop:start

Build the installers on their matching operating system:

    npm run desktop:mac
    npm run desktop:win

For a specific Mac architecture:

    npm run desktop:mac -- --x64
    npm run desktop:mac -- --arm64

The resulting files are in release/. Mac builds use ad-hoc signing for local
execution. The CI workflow builds Intel and Apple Silicon apps on matching
Mac runners and the NSIS installer on Windows. The Linux pack check validates
the common app archive only; it is not a Mac/Windows runtime test.

## Implementation and maintenance

desktop/main.cjs is the Electron entry point. The renderer is sandboxed, has
Node integration disabled and serves only bundled resources from the stable
drift://game origin. External network requests/navigation are blocked. The
build step copies the existing game and the exact Three.js 0.160.0 runtime
and Sky module into .desktop/game, rewrites the import map, adds a hash-based
script CSP and writes a SHA-256 manifest. The web edition stays playable.

desktop/assets/icon.svg is the editable original icon; npm run icons generates
PNG, Windows ICO and Mac ICNS variants. All original game audio credits and
Three.js/Clipper licenses are included. No native runtime modules or remote
game assets are required.

Electron is pinned to the supported 43.x series to retain macOS 12 support.
Upgrade to newer patched 43.x versions while supported; plan a newer macOS
minimum when moving to Electron 44+. Recheck OS support before updating.
References:
https://www.electronjs.org/docs/latest/breaking-changes
https://www.electronjs.org/docs/latest/api/protocol
https://www.electron.build/docs/mac/
https://www.electron.build/docs/nsis/
