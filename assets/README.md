# Hisabify App Assets

This folder contains the source assets for the Hisabify mobile app icon and splash screen.

## Files

- **icon.svg** - App icon source (1024x1024)
- **splash.svg** - Splash screen source (2732x2732)

## Design Details

### Logo Design
The Hisabify logo features a **simple, clean donut chart design**:
- **Donut Chart Ring**: Segmented circular chart (main element)
  - Blue segment (35%) - Represents largest expense category
  - Purple segment (30%) - Secondary category
  - Pink segment (25%) - Third category
  - Yellow segment (10%) - Smallest category
- **White Center Circle**: Creates the "donut hole" effect
- **Dollar Symbol ($)**: Centered in the donut hole with gradient fill
- **Gradient background**: Blue → Purple → Pink (modern, premium feel)
- **Simple & recognizable**: Clean design that scales perfectly at all sizes
- **Represents core feature**: The donut chart is a key visualization in the app

### Color Palette
- Background Gradient:
  - Blue: `#3B82F6`
  - Purple: `#8B5CF6`
  - Pink: `#EC4899`
- Donut Chart Segments:
  - Light Blue: `#60A5FA`
  - Light Purple: `#A78BFA`
  - Light Pink: `#F472B6`
  - Yellow: `#FCD34D`
- Center:
  - White: `#FFFFFF` (98% opacity)
  - Dollar sign: Gradient (same as background)

## Converting SVG to PNG (For Capacitor)

Capacitor Assets works best with PNG files. To convert these SVGs to PNG:

### Option 1: Using ImageMagick (Command line)
```bash
# Convert icon
convert -background none -density 300 assets/icon.svg -resize 1024x1024 assets/icon.png

# Convert splash
convert -background none -density 300 assets/splash.svg -resize 2732x2732 assets/splash.png
```

### Option 2: Using Inkscape (Command line)
```bash
# Convert icon
inkscape assets/icon.svg --export-filename=assets/icon.png --export-width=1024 --export-height=1024

# Convert splash
inkscape assets/splash.svg --export-filename=assets/splash.png --export-width=2732 --export-height=2732
```

### Option 3: Online Tool
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg` and convert to PNG (1024x1024)
3. Upload `splash.svg` and convert to PNG (2732x2732)
4. Save both PNGs to this folder

### Option 4: Design Tool (Figma/Sketch/Photoshop)
1. Open the SVG in your design tool
2. Export as PNG at:
   - Icon: 1024x1024px
   - Splash: 2732x2732px

## Generating Native Assets

Once you have the PNG files:

```bash
# Install Capacitor Assets (if not already installed)
npm install -D @capacitor/assets

# Generate all platform-specific assets
npx capacitor-assets generate --iconPath assets/icon.png --splashPath assets/splash.png
```

This will automatically create:
- iOS app icons (all required sizes)
- Android app icons (all required sizes)
- iOS splash screens
- Android splash screens

## Manual Usage

The logo is also available as a React component for use in the web app:

```tsx
import { HisabifyLogo } from '@/components/HisabifyLogo';

// With text
<HisabifyLogo size={40} showText={true} />

// Icon only
<HisabifyLogo size={64} showText={false} />
```

## Current Integration

The logo is currently used in:
- ✅ Onboarding page (top left brand)
- ✅ Splash screen (app loading)
- ✅ Auth pages (login/signup/forgot password)
- ✅ React component (`HisabifyLogo.tsx`)

## Notes

- Keep the SVG files as the source of truth
- Update the gradient colors here if the brand colors change
- Maintain the aspect ratio when resizing
- Test the logo at various sizes to ensure readability
