# Capacitor Localhost Development Setup

This guide explains how to develop the Hisabify app with localhost for rapid development.

## Quick Start

### 1. Configure Localhost Mode

Edit `capacitor.config.ts`:

```typescript
const USE_LOCALHOST = true; // Set to true for localhost, false for ngrok
```

### 2. Set Your IP Address

**For Android Emulator:**
```typescript
const LOCALHOST_URL = 'http://10.0.2.2:8080'; // Already configured
```

**For Android Physical Device:**
```typescript
// Uncomment and update with your computer's IP:
const LOCALHOST_URL = 'http://192.168.1.100:8080'; // Change to your IP
```

**For iOS Simulator:**
```typescript
const LOCALHOST_URL = 'http://localhost:8080';
```

### 3. Find Your Computer's IP Address

**On macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
```

**On Linux:**
```bash
ip addr show
```

Look for your local network IP (usually starts with `192.168.x.x` or `10.0.x.x`)

---

## Development Workflow

### Step 1: Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:8080` (or port 8082 if 8080 is busy)

### Step 2: Sync Capacitor
```bash
npx cap sync
```

### Step 3: Run on Device/Emulator

**For Android:**
```bash
npx cap run android
```

Or open Android Studio:
```bash
npx cap open android
```

**For iOS:**
```bash
npx cap run ios
```

Or open Xcode:
```bash
npx cap open ios
```

---

## Troubleshooting

### Issue: "ERR_CONNECTION_REFUSED" on Android

**Solution:** Make sure you're using the correct IP:
- **Emulator:** Use `10.0.2.2` (this is the emulator's alias for your host machine)
- **Physical Device:** Use your computer's actual IP address (e.g., `192.168.1.100`)

### Issue: "NET::ERR_CLEARTEXT_NOT_PERMITTED"

**Solution:** This is already fixed! The configuration allows cleartext (HTTP) traffic to localhost.
- Check that `android:usesCleartextTraffic="true"` is in `AndroidManifest.xml`
- Verify `network_security_config.xml` exists in `android/app/src/main/res/xml/`

### Issue: Can't connect from physical device

**Solutions:**
1. **Check firewall:** Ensure your firewall allows incoming connections on port 8080
2. **Same network:** Device and computer must be on the same WiFi network
3. **Correct IP:** Double-check your computer's IP address
4. **Port availability:** Make sure port 8080 is not blocked

**macOS Firewall:**
```bash
# Allow incoming connections temporarily
sudo pfctl -d
```

**Windows Firewall:**
- Go to Windows Defender Firewall → Advanced Settings
- Add inbound rule for port 8080

### Issue: iOS not loading localhost

**Solution:** For iOS Simulator, use `http://localhost:8080` instead of an IP address.

---

## Switching Between Localhost and ngrok

### To Use Localhost (Development)
```typescript
const USE_LOCALHOST = true;
```

### To Use ngrok (Testing with Others)
```typescript
const USE_LOCALHOST = false;
```

Then run:
```bash
npx cap sync
```

---

## Hot Reload

With localhost configuration:
- ✅ Changes in code are automatically reflected (Vite HMR works)
- ✅ No need to rebuild the app for UI changes
- ✅ Supabase connections work normally
- ✅ Full Chrome DevTools access via `chrome://inspect`

---

## Network Security Configuration

The app is configured to allow HTTP connections to:
- `localhost`
- `10.0.2.2` (Android emulator)
- `192.168.x.x` (Local network)
- `10.0.x.x` (Local network)
- `172.16.x.x` (Local network)
- `*.ngrok-free.dev` (ngrok tunnels)

This is **only for development**. Production builds should use HTTPS.

---

## Production Deployment

Before deploying to production:

1. **Disable localhost:**
   ```typescript
   const USE_LOCALHOST = false;
   ```

2. **Build production bundle:**
   ```bash
   npm run build
   ```

3. **Sync Capacitor:**
   ```bash
   npx cap sync
   ```

4. **Build release:**
   - Android: Build signed APK/AAB in Android Studio
   - iOS: Archive in Xcode

---

## Tips & Best Practices

1. **Keep `USE_LOCALHOST = true`** during development for faster iteration
2. **Use ngrok** when you need to test on devices not on your local network
3. **Always run `npx cap sync`** after changing `capacitor.config.ts`
4. **Use Chrome DevTools** (`chrome://inspect`) for debugging Android apps
5. **Use Safari Web Inspector** for debugging iOS apps

---

## Files Modified

- ✅ `capacitor.config.ts` - Added localhost configuration
- ✅ `android/app/src/main/AndroidManifest.xml` - Added cleartext permission
- ✅ `android/app/src/main/res/xml/network_security_config.xml` - Network security rules

---

## Need Help?

If you encounter issues:
1. Check the Capacitor docs: https://capacitorjs.com/docs
2. Verify your dev server is running (`npm run dev`)
3. Check device/emulator logs for errors
4. Try restarting the dev server and app

Happy coding! 🚀
