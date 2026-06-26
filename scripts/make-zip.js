import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const output = path.resolve(root, '..', 'launchmate-ai.zip');

execFileSync('zip', ['-r', output, '.', '-x', 'node_modules/*', 'data/audits.json'], {
  cwd: root,
  stdio: 'inherit'
});

console.log(`Created ${output}`);
