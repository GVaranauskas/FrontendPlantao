import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting Angular + Express development servers...\n');

// Start Angular dev server
const angularProcess = spawn('npx', ['ng', 'serve', '--configuration', 'development', '--port', '4200'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(import.meta.dirname, '..')
});

// Give Angular a moment to start
setTimeout(() => {
  // Start Express server (importing the main server file)
  import('./index.js').catch(err => {
    console.error('Error starting Express server:', err);
    process.exit(1);
  });
}, 3000);

// Cleanup on exit
const cleanup = () => {
  console.log('\n🛑 Stopping servers...');
  angularProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
