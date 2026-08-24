# ActivityPub React Design System

## 1. Atmosphere & Identity

The interface combines the compact rhythm of 2014-era social timelines with small alien deformations. Its signature is the asymmetric `alien-card` silhouette: familiar social primitives retain a blue-and-cyan bioluminescent edge without obscuring content or interaction.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--background` | `#F5F8FA` | `#0A1118` | Page background |
| Surface/card | `--card` | `#FFFFFF` | `#0F1A24` | Cards and popovers |
| Text/primary | `--foreground` | `#292F33` | `#E1E8ED` | Main content |
| Text/secondary | `--muted-foreground` | `#66757F` | `#8899A6` | Metadata and fallbacks |
| Border | `--border` | `#E1E8ED` | `#2A3A4A` | Separators and outlines |
| Accent/primary | `--blue-2014` | `#55ACEE` | `#55ACEE` | Actions, links, focus |
| Accent/hover | `--blue-hover` | `#2795E9` | `#2795E9` | Action hover |
| Accent/biolume | `--alien-cyan` | `#00E5CC` | `#00E5CC` | Existing decorative gradient |
| Status/warning | `--warning` | `#FFAD1F` | `#FFD54F` | Content warnings and limits |

### Rules

- Accent colors identify interactive controls; decorative cyan remains confined to the existing header and biolume treatment.
- Image-backed identity primitives accept only same-origin or `data:` URLs because the document CSP permits `img-src 'self' data:`.
- Lucide SVGs inherit `currentColor`; icon-only controls always have an accessible name on the button.

## 3. Typography

| Level | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Title | 24px | 700 | 1.25 | Page and card titles |
| Body | 16px | 400 | 1.5 | Default content |
| Body/sm | 14px | 400 | 1.4 | Timeline text and form controls |
| Caption | 12px | 500 | 1.4 | Metadata and icon labels |

- Primary: `"Gotham Narrow SSm", "Helvetica Neue", Helvetica, Arial, sans-serif`
- Mono: system monospace

## 4. Spacing & Layout

- Base unit: 4px; supported steps are 4px, 8px, 12px, 16px, 20px, 24px, 32px, and 48px.
- The app shell falls back to one content column. Existing `min-w-0` and wrapping conventions prevent timeline content from forcing horizontal overflow.

## 5. Components

### IconButton
- **Structure**: semantic button containing one decorative Lucide SVG.
- **Variants**: `ghost`, `outline`; compact 32px and standard 36px targets.
- **States**: default, hover, focus-visible, active, disabled.
- **Accessibility**: required accessible label on the button; child SVG is hidden from assistive technology.

### UserAvatar
- **Structure**: avatar container, optional same-origin image, textual fallback.
- **States**: image loaded, unavailable, rejected by origin policy.
- **Accessibility**: meaningful `alt` for a loaded image and initials fallback otherwise.

### CustomEmoji
- **Structure**: inline image with shortcode fallback.
- **States**: loaded, unavailable, rejected by origin policy.
- **Accessibility**: shortcode supplied as `alt` and title.

## 6. Motion & Interaction

- Existing controls use color-only transitions of 100-150ms.
- Focus-visible rings remain present. Icon rendering adds no decorative motion.

## 7. Depth & Surface

- Mixed strategy: thin borders separate timeline surfaces; the existing `alien-card` silhouette and limited `biolume` glow create emphasis.
- Icons do not introduce additional shadows or surface treatments.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target: visible keyboard focus, labelled icon-only controls, and meaningful avatar/custom-emoji alternatives.
- All media fallbacks remain legible when images are blocked or unavailable.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Existing raw color utility classes | Existing React feature components | Predates this extracted contract | Migrate when each component is next changed |
