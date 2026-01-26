---
name: front-end-dev
description: Build distinctive, production-grade frontend interfaces with a strong aesthetic point of view and working code.
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

## Design commitment (required)
Before coding, explicitly choose:
- **Purpose**: what problem this UI solves
- **Audience**: who it is for
- **Aesthetic direction**: one dominant, intentional style (name it)

## Non-negotiables
- **No generic “default” look**: the UI must feel intentional within seconds.
- Typography and spacing are first-class design tools.
- Use a cohesive palette (dominant + accent), expressed as CSS variables.
- Motion must communicate state or hierarchy (not decoration).

## Typography rules
- Avoid system-font defaults and AI-default picks (Inter/Roboto/Arial/etc.).
- Pick a real typeface and commit to it (one sans + optional mono).
- If you need safe options: Geist, IBM Plex, Recursive, Space Mono, JetBrains Mono.

## Implementation requirements
- Provide **real** code (React/Vue/HTML/CSS/JS) that runs.
- Prefer framework-native patterns (routing, state, data fetching).
- Use CSS variables for theme tokens (color, spacing, radii, shadows).
- Components must have states: loading, empty, error, success.

## Techniques to reach “distinct”
Use when appropriate:
- Asymmetry + grid-breaking layouts
- Controlled density or deliberate negative space
- Texture: noise/grain, subtle gradients, atmospheric backgrounds
- Depth: layered panels, soft shadows, glass/blur used sparingly
- Micro-interactions tied to user intent (hover, focus, transitions)

## Explicit prohibitions
- Unmodified component libraries and cookie-cutter landing templates
- Predictable layouts/color schemes without customization
- “One big hero + three cards” unless the project explicitly wants that
