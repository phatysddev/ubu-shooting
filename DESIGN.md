---
name: RED EARTH
description: A live savanna world with a restrained, legible game interface.
colors:
  primary: "#e4a260"
  primary-hover: "#f0bd83"
  ink: "#f3f0df"
  muted: "#c7cabc"
  panel: "#252b23"
  action-ink: "#24291f"
  line: "#f3f0df30"
typography:
  display:
    fontFamily: "Barlow, sans-serif"
    fontSize: "clamp(76px, 7.2vw, 96px)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Thai, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  body:
    fontFamily: "Thai, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  action:
    fontFamily: "Thai, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  field:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "14px"
    letterSpacing: "0.04em"
  label:
    fontFamily: "Thai, Segoe UI, sans-serif"
    fontSize: "11px"
rounded:
  square: "0px"
spacing:
  compact: "8px"
  group: "16px"
  section: "24px"
  dialog: "30px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "17px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost:
    textColor: "{colors.ink}"
    padding: "10px 0"
  field:
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.square}"
    padding: "9px 0 11px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    padding: "30px"
---

# Design System: RED EARTH

## Overview

**Creative North Star: "The Savanna Observation Point"**

The environment carries atmosphere: dusty red ground, dry grass, olive foliage and a pale sky. The interface uses bone-colored text and muted orange actions over dark earth surfaces. Its character comes from the world being rendered, rather than ornament added around it.

Condensed Latin display lettering gives the title and game numerals a clear silhouette. Thai instructions remain plain and readable. This documents the implemented procedural prototype; it does not claim a photorealistic asset pipeline.

**Key Characteristics:**
- Live environmental depth.
- Square, restrained controls.
- Warm action color against dark earth surfaces.
- Thai instructions paired with condensed Latin display lettering.

## Colors

### Primary

Muted orange identifies the primary action, selected settings values and confirmed impact feedback. Its lighter hover variant changes state without adding decoration.

### Neutral

Bone ink is the main interface foreground. The muted olive-tinted foreground supports secondary copy. Dark earth panels provide predictable contrast over the changing scene. Translucent bone rules separate closely related content.

**The Contrast Ground Rule.** Place readable foregrounds over the dark earth panel or the established scene shading whenever the sky or terrain would compromise them.

## Typography

**Display Font:** self-hosted Barlow Condensed 700, registered as Barlow.
**Body Font:** self-hosted Noto Sans Thai 400, registered as Thai, with Segoe UI and sans-serif fallbacks.

Display size is fluid, with a compact-height override at 76px. Dialog titles use 22px. Introductory copy uses 16px, reduced to 14px in short viewports. Actions use 15px, fields 14px and supporting labels 11px. Game ammunition uses 56px Barlow; health uses 32px Barlow. Tabular numerals preserve alignment in changing game values.

**The Two Voices Rule.** Use the condensed face for Latin display and game numerals; use the Thai text stack for instructions and controls.

## Layout

The canvas occupies the available viewport. Interface layers remain fixed to the viewport, with related controls grouped and gameplay information at the margins. Desktop chrome uses approximately 30–40px edge insets. Dialogs are at most 440px wide, with 30px internal padding and scrolling within 90vh.

Layout compresses below 900px width and 740px height. The 600px stylesheet adjustments support the narrow fallback presentation. Gameplay requires at least 650px width and a fine pointer; smaller or coarse-pointer devices receive the desktop-only message. These are implementation support boundaries, not mobile gameplay claims.

## Elevation & Depth

Environmental depth comes from Three.js geometry, directional shadows, fog and light. UI depth uses tonal layers and translucent backdrops. Interface text may use a soft downward shadow over the world; controls do not use raised card shadows. Focus uses the accent outline (2px) offset from the control (5px).

**The World Depth Rule.** Keep environmental depth in the renderer and interface separation in tonal layers.

## Shapes

Buttons, fields, dialogs and HUD panels use square silhouettes. Field borders are single bottom rules. Separators and icon strokes stay fine. Small status lights are circular; this does not establish a rounded-container system. Icons use authored SVG strokes.

## Components

### Buttons

The primary action is a full-width warm field with dark text and an SVG arrow. Hover lightens the fill and lifts it by 1px; active moves it down 1px. Disabled actions lower opacity and show the waiting cursor. Ghost actions use plain text with an accent hover. All keyboard-interactive controls carry a visible accent focus outline.

### Inputs / Fields

Labels sit above transparent fields with bone text and a single bottom border. Hover and focus change the border to the accent. Form errors use a warm light foreground and describe recovery. Native selection, caret and input focus inherit the palette.

### Navigation

The compact wordmark and settings control occupy the top edge. The in-game compass displays the current numeric bearing and cardinal direction, without static side labels. Room-link copying stays a small underlined action within the session panel.

### Dialogs

Settings and help use dark earth surfaces, a thin bone border and a dark backdrop. Close controls use the same SVG stroke weight as the other icons. Sliders and checkboxes use the action accent.

### Gameplay HUD

Health and ammunition use larger numerals than their labels. Session state and bearing use translucent dark grounds. The crosshair and hit marker are small geometric indicators, while damage feedback is an inset warm overlay. Their state is functional feedback, not a general ornamental vocabulary.


### Loadout extension
The lobby includes two compact dark-earth weapon selects and an operator select. A live three-dimensional adult operator preview occupies the right side, with name, age and outfit description beneath it. Controls inherit the square field language. Female operators use fitted cropped tops, high waists, cutout bodysuits and tall boots in the existing olive and earth palette. These are stylized procedural models. The gameplay HUD reports the current weapon, its actual magazine size and the remaining grenades. No new global tokens were introduced.

### Tactical HUD and optics
Three compact dark-earth ability readouts sit at the bottom center: Q dash, E smoke, F recover. Warm bottom rules identify readiness; muted rules and numeric seconds identify cooldowns. The sniper/DMR scope is a functional circular aperture with a fine central reticle, drop marks, zoom label and weapon label. The weapon viewmodel is hidden within scoped ADS. Knife aiming is unavailable. Smoke obscures the world and player nameplates, while the HUD remains above the obscuration layer.

### Defensive expansion
Ice is rendered as pale blue faceted world geometry, deliberately distinct from straw and earth for rapid cover recognition. RPG and BASTION reuse olive/steel world materials. Kill confirmation uses a compact dark-earth banner with an authored geometric emblem, condensed warm display text, victim and weapon; reduced motion removes its entrance animation. A fourth X ability readout joins the existing HUD. Mouse settings keep the native accent sliders and add a separate ADS multiplier and reset action. Health now displays current/max values without wrapping for the 175-HP operator.

### Ultimate and mechanical feedback
A compact T ultimate readout sits above the four skill indicators, with a charge rail, operator-specific name, and 0–5 kill count. Ready/active state uses the existing warm accent. Reload motion raises and cants the viewmodel so the detached magazine, loading hand, shell or rocket remain in view; the supporting hand is hidden during the loading action. Explosions layer real-time fire, dust, light and smoke in the world; the HUD remains legible above the effect.

### Two-slot loadout and field equipment
The lobby has two square skill selectors labelled Q and E. Gameplay shows only those selected slots, ordered Q then E. Perk name, effect, reroll availability and nearby vehicle status share a compact dark-earth panel beneath room information. Scopes use a larger aperture and stable red central point; ADS removes head bob and permanent shot-induced aim drift. Gunshots layer impact, crack and tail; hurt feedback uses a separate thud. Vehicle models reuse the established olive metal and earth palette.

## Do's and Don'ts

### Do:
- **Do** preserve the dark earth contrast ground over changing scenery.
- **Do** use authored SVG icons and visible keyboard focus.
- **Do** retain the reduced-motion option for idle camera drift and head bob.
- **Do** keep procedural-prototype limitations explicit when describing the visuals.

### Don't:
- **Don't** substitute decorative interface panels for environmental detail.
- **Don't** show fixed compass labels that contradict the current bearing.
- **Don't** imply mobile gameplay where the implementation only offers a support message.
