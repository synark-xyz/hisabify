# 🚀 Quick Start Guide

Get Hisabify running on your local machine in minutes!

---

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- A **Supabase account** - [Sign up free](https://supabase.com/)

---

## ⚡ Fast Setup (Recommended)

We've created a comprehensive setup script that handles everything for you:

### 1. Make the script executable (first time only):
```bash
chmod +x setup-and-run.sh
```

### 2. Run the setup:
```bash
./setup-and-run.sh setup
```

This will:
- ✅ Check your system requirements (Node.js, npm, git)
- ✅ Create your `.env` file from `.env.example`
- ✅ Install all dependencies (~2-3 minutes)
- ✅ Guide you through configuration

### 3. Configure Supabase credentials:

Open `.env` and add your Supabase details:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id
```

**Where to find these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project Reference ID** → `VITE_SUPABASE_PROJECT_ID`

### 4. Start the development server:
```bash
./setup-and-run.sh dev
```

The app will be available at: **http://localhost:8080** 🎉

---

## 🛠️ Available Commands

The setup script provides several useful commands:

```bash
# Initial setup (first time only)
./setup-and-run.sh setup

# Start development server (default port: 8080)
./setup-and-run.sh dev

# Build for production
./setup-and-run.sh build

# Preview production build
./setup-and-run.sh preview

# Run linter to check code quality
./setup-and-run.sh lint

# Clean and reinstall everything
./setup-and-run.sh clean

# Show help
./setup-and-run.sh help
```

---

## 📦 Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Install dependencies:
```bash
npm install
```

### 2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Start development server:
```bash
npm run dev
```

### Other commands:
```bash
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality
```

---

## 🗄️ Database Setup (Supabase)

For the full Supabase runbook, including local reset/push, staging deploys, production deploys, linking, and type generation, see `SUPABASE_SETUP.md`.

Your Supabase project needs the following tables. The app will guide you through setup, but here's what you need:

### Required Tables:
- `profiles` - User profiles
- `transactions` - Income/expense transactions
- `categories` - Transaction categories
- `cards` - Payment cards
- `budgets` - Budget tracking
- `savings_goals` - Savings goals
- `exchange_rates` - Currency conversion rates

### Migrations:
Database migrations are in the `supabase/migrations/` directory. You can run them using:

```bash
# Start local Supabase
npx supabase start

# Rebuild local DB and apply all migrations
npx supabase db reset --local

# Or apply only pending local migrations
npx supabase db push --local

# For a linked hosted project
npx supabase db push

# Or import them manually through Supabase Dashboard
```

**Tip:** Prefer `npx supabase db push --dry-run` before staging or production pushes. Check `SUPABASE_SETUP.md` for the environment-specific workflow.

---

## 🔒 Security Checklist

Before using the app, ensure:

- [ ] ✅ `.env` file is configured with valid Supabase credentials
- [ ] ✅ `.env` is listed in `.gitignore` (already done)
- [ ] ✅ Supabase Row Level Security (RLS) policies are enabled
- [ ] ✅ You're using a secure password for your account
- [ ] ✅ Running on HTTPS in production (localhost is fine for dev)

---

## 🐛 Troubleshooting

### Port 8080 already in use?
```bash
# The script will detect this and offer to kill the process
# Or manually:
lsof -ti:8080 | xargs kill -9
```

### Dependencies failing to install?
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection issues?
- Verify your `.env` credentials are correct
- Check Supabase Dashboard → Settings → API
- Ensure your project is not paused
- Check your internet connection

### Build errors?
```bash
# Clean and rebuild
./setup-and-run.sh clean
./setup-and-run.sh setup
./setup-and-run.sh build
```

### TypeScript errors?
```bash
# Check for linting issues
npm run lint

# Make sure all dependencies are installed
npm install
```

---

## 📱 Mobile App Development (iOS/Android)

Hisabify runs as a **native mobile app** using Capacitor 8!

### Quick Mobile Setup

**Option 1: Localhost Development (Fastest) ⚡**

Perfect for rapid development with instant hot reload:

```bash
# 1. Find your local IP
npm run local-ip

# 2. Configure capacitor.config.ts
# Set USE_LOCALHOST = true

# 3. Start dev server
npm run dev

# 4. Run on device
npm run dev:android  # for Android
npm run dev:ios      # for iOS
```

**Option 2: Build & Deploy**

```bash
# Build and open in IDE
npm run cap:android  # Opens Android Studio
npm run cap:ios      # Opens Xcode
```

**📖 Complete mobile setup guide:** [CAPACITOR_LOCALHOST_SETUP.md](./CAPACITOR_LOCALHOST_SETUP.md)
**📱 Mobile deployment guide:** [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md)

### Available Mobile Scripts

```bash
npm run local-ip        # Find your local IP for device testing
npm run cap:sync        # Sync web app with native projects
npm run cap:android     # Build and open Android Studio
npm run cap:ios         # Build and open Xcode
npm run dev:android     # Quick run on Android
npm run dev:ios         # Quick run on iOS
```

---

## 🌐 Testing on Mobile Browser

### On your local network:

1. Start the dev server:
   ```bash
   ./setup-and-run.sh dev
   ```

2. Find your computer's local IP:
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Or on macOS
   ipconfig getifaddr en0

   # Or use the helper script
   npm run local-ip
   ```

3. On your mobile device, visit:
   ```
   http://YOUR_LOCAL_IP:8080
   ```
   Example: `http://192.168.1.100:8080`

### PWA Installation:
- On iOS Safari: Tap Share → Add to Home Screen
- On Android Chrome: Menu → Add to Home Screen

---

## 🎨 Development Tips

### Hot Module Replacement (HMR)
Changes to your code will automatically refresh the browser. Just save and watch!

### Environment Variables
- All environment variables must start with `VITE_` to be accessible in the app
- Changes to `.env` require restarting the dev server

### Debugging
- Open browser DevTools (F12 or Cmd+Option+I)
- Check the Console tab for errors
- Network tab shows API calls to Supabase

### Code Quality
```bash
# Run linter before committing
./setup-and-run.sh lint

# Auto-fix many issues
npm run lint -- --fix
```

---

## 📚 Next Steps

Once you have the app running:

1. **Create an account** - Sign up with email/password
2. **Add a card** - Your first payment card
3. **Add transactions** - Track income and expenses
4. **Explore features**:
   - 📊 Financial summaries with period comparisons
   - 📅 Collapsible calendar with week/month views
   - 💰 Budget tracking
   - 🎯 Savings goals
   - 📈 Analytics and reports
   - 💱 Multi-currency support

5. **Read the docs**:
   - `INSTRUCTIONS.md` - Development best practices
   - `UPDATE.md` - Recent changes and roadmap
   - `WARP.md` - Project architecture

---

## 🆘 Getting Help

If you run into issues:

1. Check this guide first
2. Review `INSTRUCTIONS.md` for detailed guidelines
3. Check the browser console for errors
4. Verify Supabase connection in Dashboard
5. Check `UPDATE.md` for known issues

---

## ✅ Verify Your Setup

Run these checks to ensure everything is working:

```bash
# 1. Check Node.js version
node --version  # Should be v18.0.0 or higher

# 2. Check npm version
npm --version   # Should be 8.0.0 or higher

# 3. Verify dependencies are installed
ls node_modules  # Should see many folders

# 4. Check environment configuration
cat .env  # Should see your Supabase credentials

# 5. Run linter
./setup-and-run.sh lint  # Should pass with no errors

# 6. Start the server
./setup-and-run.sh dev  # Should open on http://localhost:8080
```

---

## 🎉 You're Ready!

Your Hisabify app is now running! Open **http://localhost:8080** in your browser and start tracking your finances.

**Happy tracking!** 💰📊

---

**Need more details?** See `README.md` for comprehensive documentation.
