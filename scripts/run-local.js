#!/usr/bin/env node
import { spawn } from 'child_process';

const processes = [];
let shuttingDown = false;

function log(message) {
  const time = new Date().toISOString();
  console.log(`[local-dev ${time}] ${message}`);
}

function handleExit(code, signal, name) {
  if (shuttingDown) return;
  shuttingDown = true;
  const outcome = code === null ? `signal ${signal}` : `code ${code}`;
  log(`${name} exited with ${outcome}. Shutting down remaining processes...`);
  terminateAll();
  const exitCode = typeof code === 'number' ? code : 1;
  process.exit(exitCode);
}

function start(name, command, args, options = {}) {
  log(`starting ${name}: ${[command, ...args].join(' ')}`);
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
    ...options
  });
  child.on('exit', (code, signal) => handleExit(code, signal, name));
  child.on('error', (error) => {
    log(`${name} failed to start: ${error.message}`);
    handleExit(1, null, name);
  });
  processes.push({ name, child });
}

function terminateAll() {
  processes.forEach(({ child, name }) => {
    if (child.killed) return;
    log(`stopping ${name}...`);
    try {
      if (process.platform === 'win32') {
        child.kill();
      } else {
        child.kill('SIGINT');
      }
    } catch (err) {
      log(`failed to stop ${name}: ${err.message}`);
    }
  });
}

function setupSignalHandling() {
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      log(`received ${signal}. Cleaning up...`);
      terminateAll();
      setTimeout(() => process.exit(0), 500);
    });
  });
}

setupSignalHandling();

async function ensureEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length === 0) return;
  log(`missing env vars (${missing.join(', ')}). attempting to load .env ...`);
  try {
    // Lazy-load dotenv to avoid dependency if the user already loaded env vars manually
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (err) {
    log(`failed to load .env via dotenv: ${err.message}`);
  }
  const stillMissing = required.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (stillMissing.length) {
    log(`Error: Missing required environment variables: ${stillMissing.join(', ')}`);
    log('Create or update .env (copy from .env.template) before running local dev.');
    process.exit(1);
  }
}

(async () => {
  await ensureEnv();
  start('backend', 'npm', ['--prefix', 'backend', 'run', 'dev']);
  start('frontend', 'npm', ['run', 'dev']);
  log('local development stack is running. Press Ctrl+C to stop.');
})();
