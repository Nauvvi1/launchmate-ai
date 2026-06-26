import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const parent = path.resolve(root, '..');
const folderName = path.basename(root);
const output = path.resolve(parent, `${folderName}.zip`);

if (fs.existsSync(output)) fs.rmSync(output);

execFileSync('zip', [
  '-r',
  output,
  folderName,
  '-x',
  `${folderName}/node_modules/*`,
  `${folderName}/data/audits.json`,
  `${folderName}/.env`
], {
  cwd: parent,
  stdio: 'inherit'
});

console.log(`Created ${output}`);
