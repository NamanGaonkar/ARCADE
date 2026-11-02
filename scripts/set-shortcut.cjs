const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const desktopLnk = path.join(process.env.USERPROFILE, 'Desktop', 'ArcadeX.lnk');
const smLnk = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'ArcadeX.lnk');
const iconPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'ArcadeX', 'resources', 'app-icon.ico');
const exePath = path.join(process.env.LOCALAPPDATA, 'Programs', 'ArcadeX', 'ArcadeX.exe');

console.log('Target exe exists:', fs.existsSync(exePath));
console.log('Icon path exists:', fs.existsSync(iconPath));

const vbs = [
  'Set sh = CreateObject("WScript.Shell")',
  'Set lnk1 = sh.CreateShortcut(' + JSON.stringify(desktopLnk) + ')',
  'lnk1.TargetPath = ' + JSON.stringify(exePath),
  'lnk1.WorkingDirectory = ' + JSON.stringify(path.dirname(exePath)),
  'lnk1.IconLocation = ' + JSON.stringify(iconPath + ',0'),
  'lnk1.Save',
  '',
  'Set lnk2 = sh.CreateShortcut(' + JSON.stringify(smLnk) + ')',
  'lnk2.TargetPath = ' + JSON.stringify(exePath),
  'lnk2.WorkingDirectory = ' + JSON.stringify(path.dirname(exePath)),
  'lnk2.IconLocation = ' + JSON.stringify(iconPath + ',0'),
  'lnk2.Save'
].join('\r\n');

fs.writeFileSync('set-shortcut-temp.vbs', vbs);
cp.execSync('cscript //nologo set-shortcut-temp.vbs');
fs.unlinkSync('set-shortcut-temp.vbs');
console.log('Shortcuts successfully created with icon:', iconPath);

try {
  cp.execSync('ie4uinit.exe -show');
} catch (e) {}
