#!/usr/bin/env python3
"""
Generate Google Play Console publish assets for Hisabify.

Outputs:
  icon_512.png               — 512×512 app icon (< 1 MB)
  feature_graphic_1024x500.png — 1024×500 feature graphic (< 15 MB)

Usage:
  python3 generate_assets.py
"""

import os
import base64
import cairosvg

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# App Icon SVG  (viewBox 1024×1024 → rendered at 512×512)
# Design mirrors ic_launcher_foreground.xml exactly.
# ---------------------------------------------------------------------------
ICON_SVG = """<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background rect gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#080C14"/>
      <stop offset="100%" stop-color="#0F1729"/>
    </linearGradient>
    <!-- Circle gradient -->
    <linearGradient id="circleGrad" x1="0" y1="0" x2="1024" y2="1024"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#3B82F6"/>
      <stop offset="50%"  stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <!-- Dollar sign gradient -->
    <linearGradient id="dollarGrad" x1="400" y1="350" x2="350" y2="650"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#60A5FA"/>
      <stop offset="30%"  stop-color="#8B5CF6"/>
      <stop offset="60%"  stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#FCD34D"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>

  <!-- Outer circle with gradient -->
  <path d="M512,20a492,492 0 1,1 0,984a492,492 0 1,1 0,-984"
        fill="url(#circleGrad)"/>

  <!-- Arc 1 — light blue -->
  <path d="M512,184
           A328,328 0 0,1 774,312
           L664,409
           A184,184 0 0,0 512,328 Z"
        fill="#60A5FA" fill-opacity="0.95"/>

  <!-- Arc 2 — purple -->
  <path d="M774,312
           A328,328 0 0,1 840,512
           H696
           A184,184 0 0,0 664,409 Z"
        fill="#A78BFA" fill-opacity="0.95"/>

  <!-- Arc 3 — pink -->
  <path d="M840,512
           A328,328 0 0,1 712,774
           L623,664
           A184,184 0 0,0 696,512 Z"
        fill="#F472B6" fill-opacity="0.95"/>

  <!-- Arc 4 — yellow -->
  <path d="M712,774
           A328,328 0 0,1 512,840
           V696
           A184,184 0 0,0 623,664 Z"
        fill="#FCD34D" fill-opacity="0.95"/>

  <!-- Inner white circle -->
  <path d="M512,338 a174,174 0 1,1 0,348 a174,174 0 1,1 0,-348"
        fill="#FFFFFF" fill-opacity="0.98"/>

  <!-- Dollar sign -->
  <path d="M505,390
           c-42,4 -74,32 -74,70
           c0,34 26,55 72,65
           c42,9 54,19 54,35
           c0,19 -18,33 -44,33
           c-27,0 -46,-12 -54,-31
           l-43,18
           c10,29 37,49 75,54
           v42
           h36
           v-40
           c46,-5 78,-33 78,-73
           c0,-36 -22,-56 -70,-68
           c-44,-11 -57,-19 -57,-34
           c0,-17 15,-28 40,-28
           c22,0 38,9 47,25
           l40,-19
           c-11,-25 -35,-42 -67,-46
           v-40
           h-36
           Z"
        fill="url(#dollarGrad)"/>
</svg>
"""

# ---------------------------------------------------------------------------
# Feature Graphic SVG builder  (1024×500)
# Embeds the real ic_launcher-playstore.png as base64 so the actual logo
# is used. Background: layered glow orbs + dot grid + diagonal accents.
# ---------------------------------------------------------------------------
SOURCE_LOGO = os.path.join(
    OUT_DIR, "..", "app", "src", "main", "res", "drawable", "ic_launcher_foreground.xml"
)


def build_feature_svg(logo_b64: str) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 1024 500" width="1024" height="500">
  <defs>

    <!-- ── Base background ── -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#03060F"/>
      <stop offset="60%"  stop-color="#080E1E"/>
      <stop offset="100%" stop-color="#0C1428"/>
    </linearGradient>

    <!-- ── Glow-orb blur filters ── -->
    <filter id="fBlue"   x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="55"/>
    </filter>
    <filter id="fPurple" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="70"/>
    </filter>
    <filter id="fPink"   x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
    <filter id="fTeal"   x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>

    <!-- ── Dot grid pattern ── -->
    <pattern id="dots" x="0" y="0" width="36" height="36"
             patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1.1" fill="#FFFFFF" fill-opacity="0.045"/>
    </pattern>

    <!-- ── Diagonal line grid ── -->
    <pattern id="lines" x="0" y="0" width="60" height="60"
             patternUnits="userSpaceOnUse"
             patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="60"
            stroke="#FFFFFF" stroke-width="0.4" stroke-opacity="0.03"/>
    </pattern>

    <!-- ── Vignette ── -->
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>

    <!-- ── Gradient underline ── -->
    <linearGradient id="underlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#3B82F6"/>
      <stop offset="50%"  stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>

    <!-- ── Pill stroke gradients ── -->
    <linearGradient id="pillStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="pillStroke2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="pillStroke3" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F472B6" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#F472B6" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="pillStroke4" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FCD34D" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#FCD34D" stop-opacity="0.2"/>
    </linearGradient>

    <!-- ── Bottom accent bar ── -->
    <linearGradient id="bottomBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#3B82F6" stop-opacity="0"/>
      <stop offset="30%"  stop-color="#3B82F6" stop-opacity="0.7"/>
      <stop offset="60%"  stop-color="#EC4899" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0"/>
    </linearGradient>

    <!-- ── Circular clip for logo ── -->
    <clipPath id="logoClip">
      <circle cx="210" cy="250" r="146"/>
    </clipPath>

    <!-- ── 3D sphere base gradient (light from top-left) ── -->
    <radialGradient id="sphere3d" cx="32%" cy="28%" r="68%">
      <stop offset="0%"   stop-color="#1E3668"/>
      <stop offset="28%"  stop-color="#0E1D40"/>
      <stop offset="65%"  stop-color="#060E22"/>
      <stop offset="100%" stop-color="#020509"/>
    </radialGradient>

    <!-- ── Specular glass highlight (top-left bright spot) ── -->
    <radialGradient id="specular" cx="30%" cy="22%" r="44%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.32"/>
      <stop offset="45%"  stop-color="#FFFFFF" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- ── Rim light (lower-right reflected light) ── -->
    <radialGradient id="rimLight" cx="72%" cy="78%" r="38%">
      <stop offset="0%"   stop-color="#3B82F6" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>

    <!-- ── Drop shadow for sphere ── -->
    <filter id="fShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>

  </defs>

  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <!-- BACKGROUND LAYERS                                                 -->
  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

  <!-- 1. Base fill -->
  <rect width="1024" height="500" fill="url(#bgGrad)"/>

  <!-- 2. Glow orbs (increased opacity) -->
  <!-- Blue — behind/left of logo -->
  <circle cx="200" cy="260" r="160" fill="#2563EB" fill-opacity="0.50"
          filter="url(#fBlue)"/>
  <!-- Purple — center-right -->
  <circle cx="680" cy="230" r="200" fill="#7C3AED" fill-opacity="0.40"
          filter="url(#fPurple)"/>
  <!-- Pink — top-right corner -->
  <circle cx="960" cy="60"  r="110" fill="#DB2777" fill-opacity="0.46"
          filter="url(#fPink)"/>
  <!-- Teal — bottom-left accent -->
  <circle cx="60"  cy="460" r="90"  fill="#0891B2" fill-opacity="0.38"
          filter="url(#fTeal)"/>

  <!-- 3. Texture patterns -->
  <rect width="1024" height="500" fill="url(#dots)"/>
  <rect width="1024" height="500" fill="url(#lines)"/>

  <!-- 4. Faint large arcs (echo of logo motif) -->
  <circle cx="210" cy="250" r="230" fill="none"
          stroke="#3B82F6" stroke-opacity="0.05" stroke-width="1.5"/>
  <circle cx="210" cy="250" r="195" fill="none"
          stroke="#8B5CF6" stroke-opacity="0.04" stroke-width="1"/>
  <circle cx="210" cy="250" r="160" fill="none"
          stroke="#EC4899" stroke-opacity="0.03" stroke-width="0.8"/>

  <!-- 5. Vignette -->
  <rect width="1024" height="500" fill="url(#vignette)"/>

  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <!-- LOGO  (actual ic_launcher-playstore.png, 300×300, centered left)  -->
  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

  <!-- Drop shadow under sphere -->
  <ellipse cx="218" cy="418" rx="130" ry="16"
           fill="#000000" fill-opacity="0.55" filter="url(#fShadow)"/>

  <!-- 3D sphere base -->
  <circle cx="210" cy="250" r="148" fill="url(#sphere3d)"/>

  <!-- Actual logo PNG (clipped to circle) -->
  <image href="data:image/png;base64,{logo_b64}"
         x="60" y="100" width="300" height="300"
         clip-path="url(#logoClip)"/>

  <!-- Specular glass highlight (painted on top of logo) -->
  <circle cx="210" cy="250" r="146" fill="url(#specular)"/>

  <!-- Rim light bottom-right -->
  <circle cx="210" cy="250" r="146" fill="url(#rimLight)"/>

  <!-- Crisp border ring -->
  <circle cx="210" cy="250" r="146" fill="none"
          stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.5"/>

  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <!-- DIVIDER                                                            -->
  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <line x1="400" y1="110" x2="400" y2="390"
        stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="1"/>

  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <!-- TEXT BLOCK                                                         -->
  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->

  <!-- App name -->
  <text x="432" y="222"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="84" font-weight="800"
        letter-spacing="-2"
        fill="#FFFFFF">Hisabify</text>

  <!-- Gradient underline -->
  <rect x="432" y="234" width="360" height="3" rx="2"
        fill="url(#underlineGrad)"/>

  <!-- Tagline -->
  <text x="434" y="285"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="28" font-weight="400" letter-spacing="1.2"
        fill="#94A3B8">Smart Personal Finance</text>

  <!-- ── Feature pills ─────────────────────────────── -->
  <!-- Pill 1: Budgets -->
  <rect x="432" y="318" width="108" height="34" rx="17"
        fill="#1E3A5F" fill-opacity="0.60"
        stroke="url(#pillStroke1)" stroke-width="1"/>
  <text x="487" y="340" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="14" font-weight="500" fill="#93C5FD">Budgets</text>

  <!-- Pill 2: Expenses -->
  <rect x="550" y="318" width="118" height="34" rx="17"
        fill="#2D1B69" fill-opacity="0.60"
        stroke="url(#pillStroke2)" stroke-width="1"/>
  <text x="609" y="340" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="14" font-weight="500" fill="#C4B5FD">Expenses</text>

  <!-- Pill 3: Savings -->
  <rect x="678" y="318" width="108" height="34" rx="17"
        fill="#500724" fill-opacity="0.55"
        stroke="url(#pillStroke3)" stroke-width="1"/>
  <text x="732" y="340" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="14" font-weight="500" fill="#FBCFE8">Savings</text>

  <!-- Pill 4: Analytics -->
  <rect x="796" y="318" width="116" height="34" rx="17"
        fill="#451A03" fill-opacity="0.55"
        stroke="url(#pillStroke4)" stroke-width="1"/>
  <text x="854" y="340" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="14" font-weight="500" fill="#FDE68A">Analytics</text>

  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <!-- BOTTOM ACCENT BAR                                                 -->
  <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
  <rect x="0" y="497" width="1024" height="3" fill="url(#bottomBar)"/>

</svg>"""


def main():
    icon_path    = os.path.join(OUT_DIR, "icon_512.png")
    feature_path = os.path.join(OUT_DIR, "feature_graphic_1024x500.png")

    # ── App icon ────────────────────────────────────────────────────────
    print("Generating icon_512.png …")
    cairosvg.svg2png(
        bytestring=ICON_SVG.encode(),
        write_to=icon_path,
        output_width=512,
        output_height=512,
    )

    # ── Feature graphic (embeds real logo PNG) ──────────────────────────
    print("Generating feature_graphic_1024x500.png …")
    logo_path = os.path.normpath(SOURCE_LOGO)
    with open(logo_path, "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode()

    feature_svg = build_feature_svg(logo_b64)
    cairosvg.svg2png(
        bytestring=feature_svg.encode(),
        write_to=feature_path,
        output_width=1024,
        output_height=500,
    )

    # ── Verification ─────────────────────────────────────────────────────
    try:
        from PIL import Image

        with Image.open(icon_path) as img:
            sz = img.size
            kb = os.path.getsize(icon_path) / 1024
            print(f"  icon_512.png                  — {sz[0]}×{sz[1]}px  {kb:.1f} KB")

        with Image.open(feature_path) as img:
            sz = img.size
            kb = os.path.getsize(feature_path) / 1024
            print(f"  feature_graphic_1024x500.png  — {sz[0]}×{sz[1]}px  {kb:.1f} KB")
    except ImportError:
        print("  (install Pillow to see size verification)")

    print("\nDone. Assets saved to:", OUT_DIR)


if __name__ == "__main__":
    main()
