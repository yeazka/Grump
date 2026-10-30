const path = require('path');
function updateChannel({packaged, windowsStore, metadata, env = {}, argv = []}) {
  if (windowsStore || metadata === 'store') return 'store';
  if (metadata === 'steam' || env.SteamAppId || env.SteamGameId || env.STEAM_APP_ID || argv.includes('--steam')) return 'steam';
  if (!packaged) return 'dev';
  return metadata === 'setup' ? 'setup' : 'manual';
}
function mediaDisplay(screen, event) {
  if (Number.isFinite(event.monitorX) && Number.isFinite(event.monitorY)) {
    return screen.getDisplayNearestPoint(screen.screenToDipPoint({x:event.monitorX,y:event.monitorY}));
  }
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}
function validLocalPath(value) {
  return typeof value === 'string' && value.length > 0 && value.length < 32768 &&
    !value.includes('\0') && path.isAbsolute(value) && !/^\\\\[.?]\\/.test(value);
}
module.exports = {updateChannel, mediaDisplay, validLocalPath};
