# Grump Notch — Design Direction (`DESIGN.md`)

## 1. Identity & Mood
- **Product**: Grump Notch — an expressive, moody Notch utility for Windows 10 & 11 with cursor-reactive eyes, WebGL media player, synced lyrics, iOS Liquid Glass controls, focus timer, and file stash.
- **Audience**: Windows power users, developers, gamers, and Gen Z desktop customizers who want a desktop companion with personality.
- **Voice & Tone**: Playful, bold, Gen Z conversational hook (English & Bahasa Indonesia), unapologetically expressive (expressive, moody mascot that reacts when provoked).
- **Liveliness Dials**: `Dial: ENERGY 3 / RHYTHM 2 / MOTION 2`
  - **ENERGY 3 (Bold)**: Warm amber-gold hero atmosphere inspired by Grump's Gold Matrix eyes, bold display typography, and a live 1:1 interactive laptop stage.
  - **RHYTHM 2 (Balanced with deliberate breaks)**: Full-bleed hero (`#overview`) transitioning smoothly into the half-laptop interactive stage (`#features`), followed by an asymmetric 2-column feature breakdown and lightweight architecture strip.
  - **MOTION 2 (Scroll-reveal & interactive choreography)**: Scroll-triggered mascot intro morphing into the laptop notch, real-time spring physics inside the 1:1 Grump engine, and choreographed file-drop preview in Stash mode. All non-essential motion pauses under `prefers-reduced-motion: reduce` or via the hero video pause button.

## 2. Palette (`R-01`, `R-25`, `R-29`)
- **Core Base 1 (Obsidian Espresso)**: `#0b0704` — grounds the warm amber lighting and makes the pure black `#000000` laptop notch silhouette read clearly.
- **Core Base 2 (Elevated Matte Charcoal)**: `#14110e` — used for secondary surfaces without stacking glass blur.
- **Core Text**: `#ffffff` (primary, `20.07:1` on `#0b0704`) and `#b8b2ac` (muted body copy, `9.42:1` on `#0b0704`).
- **Deliberate Accent (Grump Gold / Amber)**: `#f59e0b` to `#fbbf24` — pulled directly from the official Grump Gold Matrix LED eyes (`grump-logo.jpg`), paired with dark `#0b0704` text on primary CTAs (`10.12:1` contrast, passing WCAG AA).

## 3. Typography (`R-06`)
- **Primary Typeface**: `Plus Jakarta Sans` (weights 500, 600, 700, 800). Chosen per user direction for a geometric, approachable Discord/Notion-inspired grotesque that holds tight negative tracking (`-0.04em`) on large Gen Z hooks while remaining legible at `14px–16px` in controls.

## 4. One-Line Decision Log (`R-31` & `R-37`)
- **Why dark warm obsidian (`#0b0704`) instead of default blue/purple?** Matches the warm gold/orange ember glow of Grump's LED matrix eyes and avoids generic AI blue-purple gradients (`R-01`).
- **Why Liquid Glass pill buttons on hero CTAs (`R-10`, `R-11`, `R-37`)?** Explicitly requested by the product owner ("semua button liquid glass dan rounded") to mirror the iOS Liquid Glass controls inside the Grump app; dose-capped to interactive buttons/header while feature surfaces stay solid matte (`R-10`).
- **Why a rectangular GitHub button in the header (`R-11`, `R-37`)?** Explicitly requested by the product owner to visually separate external repository navigation from primary product controls.
- **Why a thin-bezel MacBook Pro half-screen with dynamic `--u` scale (`R-03`)?** Anchors the top-edge notch in its real physical bezel context and scales proportionally from `320px` phones to `1440px` monitors without horizontal clipping.
- **Why custom vector glyphs instead of emojis (`R-04`)?** Replaces generic decorative emojis with crisp monochrome/amber SVG icons that match the Grump renderer's internal icon system.
