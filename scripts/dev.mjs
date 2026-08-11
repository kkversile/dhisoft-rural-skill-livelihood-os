import { spawn } from 'node:child_process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs=[
 spawn(npm,['--prefix','dhisoft-rural-skill-backend','run','start:dev'],{stdio:'inherit',shell:true}),
 spawn(npm,['--prefix','dhisoft-rural-skill-frontend','run','dev'],{stdio:'inherit',shell:true})
];
const stop=()=>procs.forEach(p=>p.kill('SIGTERM'));
process.on('SIGINT',stop); process.on('SIGTERM',stop);
