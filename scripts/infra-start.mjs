import { spawnSync } from 'node:child_process';
import net from 'node:net';

const compose = ['compose', '-f', 'infra/docker-compose.local.yml'];
const run = (args) => { const result = spawnSync('docker', [...compose, ...args], { stdio: 'inherit', shell: process.platform === 'win32' }); if (result.status !== 0) process.exit(result.status || 1); };
const waitForPort = (port, timeoutMs = 60_000) => new Promise((resolve, reject) => { const started = Date.now(); const probe = () => { const socket = net.createConnection({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); resolve(); }); socket.once('error', () => { socket.destroy(); if (Date.now() - started > timeoutMs) reject(new Error(`Timed out waiting for port ${port}`)); else setTimeout(probe, 1000); }); }; probe(); });
const waitForLocalStack = async (timeoutMs = 60_000) => { const started = Date.now(); while (Date.now() - started <= timeoutMs) { try { const response = await fetch('http://127.0.0.1:4567/_localstack/health'); if (response.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); } throw new Error('Timed out waiting for LocalStack'); };

run(['up', '-d']);
await Promise.all([waitForLocalStack(), waitForPort(6379), waitForPort(19092)]);
console.log('Local infrastructure is reachable. Run npm run infra:init to create queues, topics, bucket and event bus idempotently.');
