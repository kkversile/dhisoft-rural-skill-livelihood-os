import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['Backend build artifact', path.join(root, 'dhisoft-rural-skill-backend', 'dist', 'main.js')],
  ['Frontend build artifact', path.join(root, 'dhisoft-rural-skill-frontend', '.next', 'BUILD_ID')],
];

let failed = false;
for (const [name, target] of checks) {
  if (!existsSync(target)) {
    console.error(`== ${name}: missing (${target}) ==`);
    failed = true;
  } else {
    console.log(`== ${name}: present ==`);
  }
}

process.exit(failed ? 1 : 0);
