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
