import { execSync } from 'child_process';
const out = execSync('wmic process where "name=\'node.exe\'" get processid,commandline').toString();
console.log(out);
