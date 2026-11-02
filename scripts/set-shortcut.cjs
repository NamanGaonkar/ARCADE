const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const desktopLnk = path.join(process.env.USERPROFILE, 'Desktop', 'ArcadeX.lnk');
const smLnk = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'ArcadeX.lnk');
const iconPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'ArcadeX', 'resources', 'app-icon.ico');
const exePath = path.join(process.env.LOCALAPPDATA, 'Programs', 'ArcadeX', 'ArcadeX.exe');

const vbs = `
Set sh = CreateObject("WScript.Shell")
Set lnk1 = sh.CreateShortcut("${desktopLnk.replace(/\\/g, '\\\\')}")
lnk1.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
lnk1.WorkingDirectory = "${path.dirname(exePath).replace(/\\/g, '\\\\')}"
lnk1.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"
lnk1.Save

Set lnk2 = sh.CreateShortcut("${smLnk.replace(/\\/g, '\\\\')}")
lnk2.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
lnk2.WorkingDirectory = "${path.dirname(exePath).replace(/\\/g, '\\\\')}"
lnk2.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"
lnk2.Save
`;

fs.writeFileSync('set-shortcut-temp.vbs', vbs);
cp.execSync('cscript //nologo set-shortcut-temp.vbs');
fs.unlinkSync('set-shortcut-temp.vbs');
console.log('Shortcuts successfully created with icon:', iconPath);
