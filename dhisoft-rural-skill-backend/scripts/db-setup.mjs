import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Copy .env.example to .env and provide PostgreSQL credentials.');
  process.exit(1);
}

const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args) => {
  console.log(`\n> ${runner} ${args.join(' ')}`);
  const result = spawnSync(runner, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['prisma', 'format']);
run(['prisma', 'validate']);
run(['prisma', 'generate']);
run(['prisma', 'migrate', 'deploy']);
run(['prisma', 'db', 'seed']);
console.log('\nPostgreSQL schema, generated client, migrations, and seed data are ready.');
