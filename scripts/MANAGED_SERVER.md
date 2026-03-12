# Managed Dev Server

This script ensures that at most **2 Vite development servers** run in parallel. When a 3rd server attempts to start, it automatically terminates the oldest one.

## Why Use This?

When developing with Capacitor, you might accidentally start multiple dev servers which can:
- Consume unnecessary system resources (CPU/RAM/ports)
- Cause confusion about which server is active
- Lead to port conflicts

The managed server automatically handles this by maintaining a maximum of 2 concurrent servers.

## How It Works

1. **Tracking**: Each server's PID (Process ID) and start time are stored in a lock file at `/tmp/hisabify-servers/server-pids.json`
2. **Limit Enforcement**: Before starting a new server, the script checks if 2 servers are already running
3. **Cleanup**: If the limit is reached, the oldest server is automatically terminated (SIGTERM, then SIGKILL if needed)
4. **Dead Process Removal**: The script automatically removes dead/zombie processes from tracking

## Usage

### Option 1: Run with Android (Recommended - Default)

```bash
npm run cap:dev:android  # Now uses managed server by default
```

### Option 2: Run with iOS (Recommended - Default)

```bash
npm run cap:dev:ios  # Now uses managed server by default
```

### Option 3: Run Managed Dev Server Only

```bash
npm run dev:managed
```

### Option 4: Run Regular Dev Server (No Limit)

```bash
npm run dev  # Original behavior, no server limit
npm run cap:dev:android:unmanaged  # Or Android without limit
npm run cap:dev:ios:unmanaged  # Or iOS without limit
```

## Example Scenario

```bash
Terminal 1: npm run dev:managed
# ✅ Server 1 starts (PID: 12345)

Terminal 2: npm run dev:managed
# ✅ Server 2 starts (PID: 12346)
# 📊 Total active servers: 2/2

Terminal 3: npm run dev:managed
# ⚠️  Server limit reached (2). Terminating oldest server...
# 🔪 Killing process 12345...
# ✅ Server 3 starts (PID: 12347)
# 📊 Total active servers: 2/2
```

## Configuration

To change the maximum number of allowed servers, edit `scripts/managed-dev-server.js`:

```javascript
const MAX_SERVERS = 2; // Change to your desired limit
```

## Lock File Location

Server tracking information is stored at:
- **macOS/Linux**: `/tmp/hisabify-servers/server-pids.json`
- **Windows**: `%TEMP%\hisabify-servers\server-pids.json`

## Cleanup

The script automatically cleans up when:
- You press Ctrl+C (SIGINT)
- The process is terminated (SIGTERM)
- The process exits normally

## Troubleshooting

### Servers not being killed properly

If servers aren't being terminated, manually clean up:

```bash
# View lock file
cat /tmp/hisabify-servers/server-pids.json

# Remove lock file to reset
rm -rf /tmp/hisabify-servers

# Find and kill Vite processes manually
ps aux | grep vite
kill <PID>
```

### Permission issues

If you get permission errors:

```bash
chmod +x scripts/managed-dev-server.js
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Regular Vite dev server (no limit) |
| `npm run dev:managed` | Managed dev server (max 2) |
| `npm run dev:staging:ngrok` | Clean old servers, run Vite on `8181` (strict), and start ngrok tunnel |
| `npm run dev:staging:ngrok:hilton` | Run on `8181`, bind ngrok to `https://hilton-irate-jovita.ngrok-free.dev`, and load Vite `production` env files (`.env.production` / `.env.production.local`) |
| `npm run cap:dev:android` | **Managed dev + Android (max 2)** ⭐ Default |
| `npm run cap:dev:ios` | **Managed dev + iOS (max 2)** ⭐ Default |
| `npm run cap:dev:android:unmanaged` | Regular dev + Android (no limit) |
| `npm run cap:dev:ios:unmanaged` | Regular dev + iOS (no limit) |
