# Avalanche Scouting Design System

## 1. Atmosphere & Identity

Avalanche Scouting is a focused, dark-field operations console for FRC events. It uses deep navy surfaces, electric-blue action states, restrained glass depth, and compact data-forward typography. The recognizable signature is the layered navy glass card: a translucent surface, faint white rim, and blue-only interactive emphasis.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Surface/primary | `--background` | `hsl(222.2 84% 4.9%)` | Application background |
| Surface/card | `--card` | `hsl(222.2 84% 4.9%)` | Cards and panels |
| Surface/muted | `--muted` | `hsl(217.2 32.6% 17.5%)` | Recessed controls and secondary panels |
| Text/primary | `--foreground` | `hsl(210 40% 98%)` | Primary text |
| Text/muted | `--muted-foreground` | `hsl(215 20.2% 65.1%)` | Supporting text |
| Accent/primary | `--primary` | `hsl(217.2 91.2% 59.8%)` | Calls to action, focus, selected state |
| Accent/hover | `--primary` | `hsl(217.2 91.2% 59.8%)` at stronger contrast | Interactive hover/active state |
| Border | `--border` | `hsl(217.2 32.6% 17.5%)` | Structural dividers |
| Error | `--destructive` | `hsl(0 62.8% 30.6%)` | Validation and destructive actions |
| Glass/background | `--glass-bg` | `rgba(15, 23, 42, .6)` | Translucent panels |
| Glass/rim | `--glass-border` | `rgba(255, 255, 255, .08)` | Glass panel outline |

Use blue for interaction and state, never as decorative noise. Do not introduce untracked colors without first adding an explicit semantic role here.

## 3. Typography

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 2.25–3rem | 700–800 | Landing and page titles |
| H1 | 1.875–2.25rem | 700–800 | Primary page heading |
| H2 | 1.5rem | 700 | Section heading |
| H3 | 1.125–1.25rem | 600–700 | Cards and grouped controls |
| Body | 1rem | 400–500 | Default content |
| Body/sm | .875rem | 400–500 | Labels and supporting content |
| Caption | .75rem | 500–700 | Metadata and compact status text |

- Primary: `Inter, system-ui, sans-serif`
- Display: `Outfit, Poppins, sans-serif`
- Mono: `Fira Code, monospace`
- Body copy never drops below `.875rem`; headings use responsive Tailwind scales rather than fixed oversized values.

## 4. Spacing & Layout

Base unit: **4px**. Spacing follows Tailwind's 1/2/3/4/5/6/8/10/12/16 scale (4–64px).

- Content maximum: 1400px, centered with a 32px desktop gutter.
- Mobile gutter: 16px; tablet gutter: 24px.
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- Grids must collapse to one readable column at 375px and never create page-level horizontal scrolling.

## 5. Components

### Button
- **Variants:** primary, outline, destructive, compact icon.
- **States:** default, hover, active, focus-visible, disabled, loading.
- **Accessibility:** native button semantics, visible focus ring, disabled state preserved while loading.
- **Motion:** color, opacity, and transform only; 150–200ms.

### Glass Card
- **Structure:** card surface with optional header, title, and content.
- **States:** resting, interactive hover, loading, empty, error.
- **Layout:** stack or grid child; it never owns page scrolling.
- **Accessibility:** semantic headings and no essential information conveyed only by color.

### Form Field
- **Structure:** label, input/control, help text, error text.
- **States:** default, focus-visible, invalid, disabled, submitting.
- **Accessibility:** programmatic label and error association; keyboard usable.

### Application Shell
- **Structure:** header/sidebar plus scrolling main content.
- **Layout:** main document owns scroll on small screens; nested panels use `min-h-0` when they own scroll.
- **States:** desktop sidebar, mobile navigation, authenticated empty state, loading state.

## 6. Motion & Interaction

| Type | Duration | Usage |
|---|---|---|
| Micro | 150–200ms | Buttons, inputs, hover feedback |
| Standard | 200–300ms | Panels, tabs, form step changes |
| Emphasis | 300–500ms | Entering content only |

Animate only `transform` and `opacity`. Respect `prefers-reduced-motion`; focus, hover, active, and disabled states remain visible without motion.

## 7. Depth & Surface

Strategy: **mixed**. The base application uses tonal navy layers and restrained borders; elevated interactive cards may use the existing glass rim and soft shadow. Do not use large decorative shadows or blur without a clear surface relationship.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target: 4.5:1 normal text contrast and 3:1 large text.
- Every interactive control has keyboard access and a visible focus indicator.
- Responsive QA is required at 375px, 768px, and 1280px.
- Any visual transition respects reduced-motion preferences.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| Authenticated route QA requires the owner’s Discord session | Production auth routes | The external browser session is not attachable by the available test browser | Replace with a test account or attachable browser storage before final authenticated-flow signoff |

## 9. Public Landing Page Direction

The public page is an editorial field guide for Team 2724: precise, calm, and built for the pressure of a competition day. Keep the application tokens above for authenticated screens; the landing page has a scoped ink, ice, and signal-blue palette with subtle grid lines and a single illustrated workspace panel. The memorable interaction is the Avalanche mark revealing through a vertical mask as navigation opens and as the session loads.

| Role | Token | Value |
|---|---|---|
| Landing ink | `--landing-ink` | `#07121e` |
| Landing panel | `--landing-panel` | `#0e1d2b` |
| Landing line | `--landing-line` | `rgba(172, 201, 224, .17)` |
| Landing paper | `--landing-paper` | `#eef3f4` |
| Landing muted | `--landing-muted` | `#a6b8c7` |
| Landing blue | `--landing-blue` | `#7ba6ff` |
| Landing bright | `--landing-bright` | `#d8e6ff` |

- **Typography:** Outfit for the display and navigation; Inter for functional copy; tabular numeric labels. Display may reach 6rem on desktop and scales down without overflow.
- **Layout:** 1280px content maximum, 24px desktop and 20px mobile gutters. Use offset columns and editorial rules instead of repeated cards.
- **Primitives:** brand link (rest, hover, focus, menu-open); text navigation link (rest, hover, active, focus); primary and secondary action (rest, hover, focus, disabled); menu trigger and panel (closed/open); workspace preview (static illustration with readable labels); loading mark (active/complete).
- **Motion:** mark reveal 500ms, mobile menu 300ms, link underline 220ms, loading sweep 1.5s. Animate transforms and opacity only. Disable all nonessential motion when `prefers-reduced-motion` is set.
- **Accessibility:** semantic sections and links, visible focus rings, 44px touch targets, close mobile menu on link selection, descriptive loading status, and readable contrast at 375px, 768px, and 1280px.

## 10. Competition History Page

The public history page extends the landing page's ink and ice palette. It uses generous spacing and soft 24–32px corners so event information is readable at a glance. Large event names and numerical counts take priority over metadata.

- **Layout:** a 1280px content column with a spacious introduction, a featured live event area, and a responsive archive grid. Cards remain at least 320px wide before wrapping.
- **Primitives:** rounded brand navigation, summary pill, event card, search field, year select, empty state, and full-screen loading stage. Links and controls have clear hover, focus, and active states.
- **Type:** 3.5–5rem display heading, 1.5–2rem event titles, 2–2.5rem data counts, 1rem minimum body labels.
- **Motion:** use the installed Framer Motion package for page entrance and exit. The loader completes its logo reveal and progress sweep before leaving. Respect reduced-motion preferences and avoid perpetual movement in the finished view.
- **Accessibility:** event cards are full keyboard-accessible links; search and year filter have labels; loading uses a status announcement. The page must not overflow horizontally at 375px.
- **Navigation:** a site-wide route overlay uses the Avalanche mark and a finite progress animation. Route changes keep it visible for at least 1.25 seconds so the motion completes, including on phones. In-page anchor movement stays immediate. Reduced-motion users receive a static state without an artificial delay.
