#!/usr/bin/env node

/**
 * Managed dev server script - ensures at most 2 Vite servers run in parallel
 * When a 3rd server starts, it automatically kills the oldest one
 * Run: node scripts/managed-dev-server.js or npm run dev:managed
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const MAX_SERVERS = 2;
const LOCK_DIR = path.join(os.tmpdir(), 'hisabify-servers');
const LOCK_FILE = path.join(LOCK_DIR, 'server-pids.json');

/**
 * Ensure lock directory exists
 */
async function ensureLockDir() {
    try {
        await fs.mkdir(LOCK_DIR, { recursive: true });
    } catch (err) {
        // Directory already exists, ignore
    }
}

/**
 * Read current server PIDs from lock file
 */
async function readServerPids() {
    try {
        const data = await fs.readFile(LOCK_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

/**
 * Write server PIDs to lock file
 */
async function writeServerPids(pids) {
    await fs.writeFile(LOCK_FILE, JSON.stringify(pids, null, 2));
}

/**
 * Check if a process is still running
 */
async function isProcessRunning(pid) {
    try {
        // On Unix-like systems, signal 0 checks if process exists without killing it
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Kill a process by PID
 */
async function killProcess(pid) {
    try {
        console.log(`🔪 Killing process ${pid}...`);
        process.kill(pid, 'SIGTERM');
        
        // Give it a moment to terminate gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if still running, force kill if necessary
        if (await isProcessRunning(pid)) {
            console.log(`   Force killing process ${pid}...`);
            process.kill(pid, 'SIGKILL');
        }
        
        console.log(`   ✅ Process ${pid} terminated`);
    } catch (err) {
        console.log(`   ⚠️  Could not kill process ${pid}: ${err.message}`);
    }
}

/**
 * Clean up dead servers from the list
 */
async function cleanupDeadServers(pids) {
    const activePids = [];
    
    for (const serverInfo of pids) {
        if (await isProcessRunning(serverInfo.pid)) {
            activePids.push(serverInfo);
        } else {
            console.log(`   Removed dead server: PID ${serverInfo.pid}`);
        }
    }
    
    return activePids;
}

/**
 * Manage server limit
 */
async function manageServerLimit() {
    await ensureLockDir();
    
    // Read existing server PIDs
    let serverPids = await readServerPids();
    
    // Clean up any dead servers
    serverPids = await cleanupDeadServers(serverPids);
    
    console.log(`\n📊 Current active servers: ${serverPids.length}/${MAX_SERVERS}`);
    
    if (serverPids.length > 0) {
        console.log('   Active PIDs:', serverPids.map(s => `${s.pid} (started: ${s.startTime})`).join(', '));
    }
    
    // If we're at or over the limit, kill the oldest server(s)
    while (serverPids.length >= MAX_SERVERS) {
        const oldestServer = serverPids[0]; // First one is the oldest
        console.log(`\n⚠️  Server limit reached (${MAX_SERVERS}). Terminating oldest server...`);
        await killProcess(oldestServer.pid);
        serverPids.shift(); // Remove from list
    }
    
    return serverPids;
}

/**
 * Start the Vite dev server
 */
async function startDevServer() {
    console.log('\n🚀 Starting Vite dev server...\n');
    
    const viteProcess = spawn('npx', ['vite'], {
        stdio: 'inherit',
        shell: true
    });
    
    // Manage server limit
    const serverPids = await manageServerLimit();
    
    // Add current server to the list
    serverPids.push({
        pid: viteProcess.pid,
        startTime: new Date().toISOString()
    });
    
    await writeServerPids(serverPids);
    
    console.log(`\n✅ Server started with PID: ${viteProcess.pid}`);
    console.log(`📊 Total active servers: ${serverPids.length}/${MAX_SERVERS}\n`);
    
    // Handle cleanup on exit
    const cleanup = async () => {
        console.log('\n🧹 Cleaning up...');
        
        // Remove this server from the list
        let pids = await readServerPids();
        pids = pids.filter(s => s.pid !== viteProcess.pid);
        await writeServerPids(pids);
        
        console.log('✅ Cleanup complete');
        process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    viteProcess.on('error', (err) => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });
    
    viteProcess.on('exit', (code) => {
        console.log(`\n📴 Server exited with code ${code}`);
        cleanup();
    });
}

// Main execution
startDevServer().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
