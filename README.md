# Grump

Grump is a Windows desktop island with cursor-tracking eyes, music controls, lyrics, a timer, file stash, and optional weather and activity indicators. It is built with Electron.

## Run locally

Requires Windows 10/11 and Node.js. Run `npm ci`, then `npm start`. User preferences are stored in the Windows AppData folder.

## Build

- `npm run build:setup`: installer for GitHub Releases and automatic updates.
- `npm run build:portable`: portable executable; users update it manually.
- `npm test`: integration tests.
- `npm run audit:git`: check candidate Git files for excluded content.
- `npm run export:github`: copy current source into `dist/github-source-*` without the old Git history, ignored files, build outputs, or local settings.

The release procedure and updater behavior are documented in [RELEASE.md](RELEASE.md).
