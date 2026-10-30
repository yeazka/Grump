'use strict';
const {pathToFileURL} = require('node:url');

function trustedSender(event, windows, file) {
  const sender = event?.sender;
  if (!sender || event.senderFrame !== sender.mainFrame) return false;
  if (!windows.some(win => win && !win.isDestroyed() && win.webContents === sender)) return false;
  return sender.getURL() === pathToFileURL(file).href;
}

function lockWindow(win, file) {
  const allowed = pathToFileURL(file).href;
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== allowed) event.preventDefault();
  });
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
}

module.exports = {trustedSender, lockWindow};
