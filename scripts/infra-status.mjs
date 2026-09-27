import { spawnSync } from 'node:child_process';
const result = spawnSync('docker', ['compose', '-f', 'infra/docker-compose.local.yml', 'ps'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status || 0);
