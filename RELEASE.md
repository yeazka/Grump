# GitHub release and updates

## First public upload

The current local repository has no Git remote. Its 28 older commits include SF Pro font files, so do not push that history to a public repository. Use a clean source export instead:

1. Run `npm ci`, `npm test`, and `npm run audit:git`.
2. Run `npm run export:github`. The printed `dist/github-source-*` folder contains the current source without Git history or ignored local files. Review it before upload.
3. Create a new GitHub repository under your account. Update `repository.url` and `build.publish.owner` / `repo` in `package.json` if its final name differs from `yeazka/Grump`.
4. Initialize Git in the clean export, commit, add the new remote, and push. Do not copy the old `.git` folder.
5. Build the installer with `npm run build:setup`. This command creates the installer, its `.blockmap`, and `latest.yml` in `dist/setup`. It never uploads them.
6. Create a public GitHub Release tagged `vX.Y.Z`, matching `package.json`, and attach all three files from that same build. Publish the release; a draft is not visible to the updater. Give users the versioned `Grump-Setup-X.Y.Z.exe` installer.

The website checks the latest public Release through the GitHub API, selects its versioned `Grump-Setup-X.Y.Z.exe` asset, and links directly to that asset. While there is no public Release, the download button stays disabled. The current prepared installer is `dist/setup/Grump-Setup-1.0.7.exe`; it is only on this PC until uploaded. The website itself does not host the EXE.

The installer is currently unsigned. Windows may warn users until you obtain a code-signing certificate and build a signed release. Keep signing keys and passwords outside the repository.

## What happens on a user's PC

Only an installed **setup** build uses the GitHub updater. Grump checks 15 seconds after launch, then every four hours. It also checks when the user presses **Check for updates** in Preferences. When a newer published version exists, it downloads in the background. The user can press **Restart & Install** when ready; if they quit normally, the downloaded update installs on quit.

The portable build requires manual replacement. Microsoft Store and Steam builds use their respective store update mechanisms. The local unpacked build does not use GitHub updates.

For every later release, increment `version` in `package.json` and `package-lock.json`, build again, and attach the new installer, `.blockmap`, and `latest.yml` together to a published GitHub Release with a matching `vX.Y.Z` tag. Keep the repository public if you want users to update without a private GitHub token. Test the upgrade by installing an older setup build on a separate Windows device or VM, then publishing a newer version.

## Release gates

Run `npm test`, `npm run audit:git`, and the package audit. Inspect the source export and release assets. The source audit checks selected secret patterns and current candidate files; it does not rewrite old history. The package audit checks `app.asar` and unpacked files. Runtime preferences remain in AppData and are not packaged.
