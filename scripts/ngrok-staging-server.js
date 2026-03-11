#!/usr/bin/env node

/**
 * Staging launcher for sharing via ngrok on a fixed port (default: 8181).
 * - Stops stale local dev servers (tracked + common dev ports)
 * - Starts Vite on 0.0.0.0:<port> with strictPort (no fallback to 8080)
 * - Optionally starts ngrok tunnel only when --ngrok=true
 *
 * Usage:
 *   node scripts/ngrok-staging-server.js --port=8181 --ngrok=true --url=https://my-domain.ngrok-free.dev
 *   node scripts/ngrok-staging-server.js --port=8181 --ngrok=false
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const execAsync = promisify(exec);
const DEFAULT_PORT = 8181;
const PORTS_TO_CLEAN = [8080, 8081, 8181];
const LOCK_FILE = path.join(os.tmpdir(), 'hisabify-servers', 'server-pids.json');

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [k, v] = raw.slice(2).split('=');
    args[k] = v ?? 'true';
  }
  return args;
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

async function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killPid(pid, label = 'process') {
  if (!pid || Number.isNaN(pid)) return;

  try {
    process.kill(pid, 'SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (await isRunning(pid)) {
      process.kill(pid, 'SIGKILL');
    }
    console.log(`✅ Stopped ${label} PID ${pid}`);
  } catch {
    // Ignore if already dead or inaccessible
  }
}

async function getListeningPids(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti tcp:${port} -sTCP:LISTEN || true`);
    return stdout
      .split('\n')
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

async function cleanupManagedLockFile() {
  try {
    const raw = await fs.readFile(LOCK_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const tracked = Array.isArray(parsed) ? parsed : [];

    for (const item of tracked) {
      const pid = Number(item?.pid);
      if (Number.isInteger(pid) && pid > 0) {
        await killPid(pid, 'tracked dev server');
      }
    }

    await fs.writeFile(LOCK_FILE, JSON.stringify([], null, 2));
  } catch {
    // No lock file or unreadable file is fine.
  }
}

async function cleanupPorts() {
  const allPids = new Set();
  for (const port of PORTS_TO_CLEAN) {
    const pids = await getListeningPids(port);
    pids.forEach((pid) => allPids.add(pid));
  }

  for (const pid of allPids) {
    await killPid(pid, 'port listener');
  }
}

async function hasNgrok() {
  try {
    const { stdout } = await execAsync('command -v ngrok || true');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function startVite(port) {
  const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      VITE_DEV_PORT: String(port),
    },
  });

  return vite;
}

function startNgrok(port, url) {
  const args = ['http', String(port)];
  if (url) {
    args.push('--url', url);
  }

  return spawn('ngrok', args, {
    stdio: 'inherit',
    shell: false,
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const pids = await getListeningPids(port);
    if (pids.length > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number.parseInt(args.port || String(DEFAULT_PORT), 10);
  const enableNgrok = parseBoolean(args.ngrok, false);
  const ngrokUrl = typeof args.url === 'string' ? args.url.trim() : '';

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${args.port}`);
  }

  console.log('🧹 Cleaning old dev servers...');
  await cleanupManagedLockFile();
  await cleanupPorts();

  console.log(`🚀 Starting Vite on port ${port}...`);
  const vite = startVite(port);
  const viteReady = await waitForPort(port);

  if (!viteReady) {
    await killPid(vite.pid, 'vite');
    throw new Error(`Vite did not start on port ${port}.`);
  }
  console.log(`✅ Vite is listening on http://localhost:${port}`);

  let ngrok = null;
  if (enableNgrok) {
    const ngrokInstalled = await hasNgrok();
    if (ngrokInstalled) {
      console.log(
        ngrokUrl
          ? `🌍 Starting ngrok tunnel for port ${port} with reserved URL ${ngrokUrl}...`
          : `🌍 Starting ngrok tunnel for port ${port}...`
      );
      ngrok = startNgrok(port, ngrokUrl || undefined);
    } else {
      console.log(`ℹ️ ngrok not found in PATH. Start manually: ngrok http ${port}`);
    }
  } else {
    console.log('ℹ️ ngrok disabled (--ngrok=false).');
  }

  const shutdown = async () => {
    if (ngrok && !ngrok.killed) {
      await killPid(ngrok.pid, 'ngrok');
    }
    if (vite && !vite.killed) {
      await killPid(vite.pid, 'vite');
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  vite.on('exit', async (code) => {
    if (ngrok && !ngrok.killed) {
      await killPid(ngrok.pid, 'ngrok');
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start staging server:', err);
  process.exit(1);
});
