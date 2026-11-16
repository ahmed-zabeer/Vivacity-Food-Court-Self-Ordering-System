import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const lnkPath = path.resolve(process.cwd(), 'Fix-Firewall.lnk');
const cmdPath = path.resolve(process.cwd(), 'fix-firewall.cmd');

const ps = `
$WScriptShell = New-Object -ComObject WScript.Shell;
$Shortcut = $WScriptShell.CreateShortcut('${lnkPath.replace(/\\/g, '\\\\')}');
$Shortcut.TargetPath = 'cmd.exe';
$Shortcut.Arguments = '/c "${cmdPath.replace(/\\/g, '\\\\')}"';
$Shortcut.WorkingDirectory = '${process.cwd().replace(/\\/g, '\\\\')}';
$Shortcut.Save();
`;

execSync(`powershell -NoProfile -Command "${ps.replace(/\r?\n/g, ' ')}"`);

if (fs.existsSync(lnkPath)) {
  const buf = fs.readFileSync(lnkPath);
  buf[0x15] = buf[0x15] | 0x20;
  fs.writeFileSync(lnkPath, buf);
  console.log('Fix-Firewall.lnk successfully created with Administrator flag.');
} else {
  console.error('Failed to create shortcut.');
}
