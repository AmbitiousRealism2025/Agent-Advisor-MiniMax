# Kandoo Codex Design Language

> A comprehensive guide to the cyberpunk glass-morphic design system powering Kandoo Codex

**Version:** 1.0
**Last Updated:** January 2025
**Author:** Ambitious Realism

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Glass Morphism](#glass-morphism)
5. [Animation System](#animation-system)
6. [Component Patterns](#component-patterns)
7. [Spacing & Layout](#spacing--layout)
8. [Accessibility](#accessibility)
9. [Implementation Guide](#implementation-guide)

---

## Design Philosophy

Kandoo Codex embodies a **cyberpunk aesthetic** with a focus on:

- **Liquid Glass UI**: Multi-layered transparency with subtle depth
- **Neon Cyberpunk Accents**: Glowing highlights and vibrant gradients
- **Code-Inspired Animation**: Falling syntax-highlighted code rain and typewriter effects
- **Tactile Interaction**: Spring physics and smooth micro-interactions
- **Dark-First Design**: Optimized for low-light environments

### Core Principles

1. **Depth Through Layering**: Multiple pseudo-elements create visual hierarchy
2. **Subtle Motion**: Animations respect `prefers-reduced-motion`
3. **Color as Feedback**: Dynamic accent colors guide user attention
4. **Consistent Physics**: Spring-based transitions create natural feel

---

## Color System

### Base Palette

The color system is built on a dark foundation with vibrant cyberpunk accents:

```css
/* Foundation */
--bg-base: #030712;              /* Deep space black */
--bg-deep: radial-gradient(      /* Layered radial gradients */
  circle at top left,
  rgba(36, 111, 255, 0.22),
  transparent 45%
),
radial-gradient(
  circle at bottom right,
  rgba(244, 114, 182, 0.18),
  transparent 40%
),
#030712;

/* Glass Surfaces */
--glass: rgba(12, 22, 38, 0.55);        /* Standard glass */
--glass-strong: rgba(14, 24, 42, 0.68); /* Elevated surfaces */
--glass-soft: rgba(14, 24, 42, 0.45);   /* Subtle backgrounds */

/* Borders & Edges */
--border-color: rgba(148, 163, 184, 0.18);

/* Typography */
--text-primary: rgba(226, 232, 240, 0.96);
--text-muted: rgba(148, 163, 184, 0.72);
```

### Accent Colors

Cyberpunk-inspired neon palette for highlights and UI elements:

```css
/* Primary Accents */
#61dafb  /* Cyan electric (primary brand) */
#4fd1ff  /* Sky cyan */
#c084fc  /* Purple neon */
#f472b6  /* Pink magenta */
#34d399  /* Mint green */
#facc15  /* Electric yellow */
#f97316  /* Vibrant orange */

/* Semantic Colors */
#f87171  /* Critical/Error */
#fb923c  /* High priority */
#fbbf24  /* Medium priority */
#34d399  /* Low priority/Success */
```

### Gradient Formulas

Stage-specific accent gradients for columns:

```css
/* Ideas Column */
linear-gradient(135deg, rgba(79, 209, 255, 0.65), rgba(192, 132, 252, 0.4))

/* Planning Column */
linear-gradient(135deg, rgba(192, 132, 252, 0.6), rgba(244, 114, 182, 0.4))

/* Coding Column */
linear-gradient(135deg, rgba(244, 114, 182, 0.55), rgba(52, 211, 153, 0.45))

/* Testing Column */
linear-gradient(135deg, rgba(52, 211, 153, 0.6), rgba(79, 209, 255, 0.4))

/* Deployed Column */
linear-gradient(135deg, rgba(79, 209, 255, 0.45), rgba(192, 132, 252, 0.45))
```

### Background Layering Technique

Create depth with multiple pseudo-elements:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -2;
  background: var(--bg-deep);
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 20% 20%, rgba(79, 209, 255, 0.12), transparent 55%),
    radial-gradient(circle at 80% 60%, rgba(192, 132, 252, 0.1), transparent 50%);
  filter: blur(40px);
  opacity: 0.6;
}
```

---

## Typography

### Font Stack

```css
/* Primary (UI) */
font-family: 'Space Grotesk', 'SF Pro Display', system-ui, sans-serif;

/* Headings */
font-family: 'Chakra Petch', 'Space Grotesk', 'SF Pro Display', system-ui, sans-serif;

/* Code/Monospace */
font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, monospace;
```

### Font Imports

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Chakra+Petch:wght@600;700&display=swap');
```

### Typography Scale

```css
/* Main Title */
.app-header__title {
  font-family: 'Chakra Petch', sans-serif;
  font-size: clamp(2.5rem, 2.4vw + 2rem, 3.6rem);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #61dafb;
  text-shadow: 0 0 32px rgba(97, 218, 251, 0.45);
}

/* Subtitle/Code Text */
.app-header__subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(1.05rem, 0.6vw + 0.95rem, 1.35rem);
  letter-spacing: 0.04em;
  text-transform: lowercase;
  color: rgba(148, 163, 184, 0.92);
}

/* Column Title */
.kanban-column__title {
  font-size: 1.35rem;
  font-weight: 600;
}

/* Card Title */
.kanban-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Body Text */
.kanban-card__desc {
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--text-muted);
}

/* Labels */
.tag-selector__title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(94, 126, 156, 0.95);
}
```

### Text Treatment

```css
/* Font smoothing for better rendering */
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## Glass Morphism

### Core Glass Pattern

The signature glass effect combines multiple techniques:

```css
.glass-component {
  /* Base glass background */
  background: linear-gradient(
    160deg,
    rgba(13, 23, 41, 0.7),
    rgba(13, 23, 41, 0.45)
  );

  /* Subtle border */
  border: 1px solid var(--border-color);
  border-radius: 26px;

  /* Blur backdrop */
  backdrop-filter: blur(24px);

  /* Elevated shadow */
  box-shadow: var(--shadow-elevated);

  /* Shine overlay via pseudo-element */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.08),
      transparent 35%
    );
    pointer-events: none;
  }
}
```

### Glass Variants

```css
/* Header Glass */
.app-header {
  background: linear-gradient(
    135deg,
    rgba(15, 23, 42, 0.55),
    rgba(15, 23, 42, 0.15)
  );
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  backdrop-filter: blur(24px);
  box-shadow: 0 16px 40px rgba(7, 17, 34, 0.28);
}

/* Column Glass */
.kanban-column {
  background: linear-gradient(
    160deg,
    rgba(13, 23, 41, 0.7),
    rgba(13, 23, 41, 0.45)
  );
  border: 1px solid var(--border-color);
  border-radius: 26px;
  backdrop-filter: blur(24px);
  box-shadow: var(--shadow-elevated);
}

/* Card Glass */
.kanban-card {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(28px);
}
```

### Inner Highlight Effect

Create subtle internal glow:

```css
.kanban-card::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.03);
  opacity: 0.7;
  pointer-events: none;
}
```

### Shadow System

```css
--shadow-elevated:
  0 18px 40px rgba(8, 20, 45, 0.32),
  0 6px 18px rgba(8, 20, 45, 0.2);

/* Overlay shadows (drag state) */
box-shadow: 0 28px 60px rgba(6, 14, 28, 0.55);

/* Button shadows */
box-shadow: 0 18px 30px rgba(79, 209, 255, 0.3);
```

---

## Animation System

### Typewriter Animation

Character-by-character typing effect for text reveals:

#### Implementation

```jsx
function TypewriterText({ text, animationKey, initialDelay = 0 }) {
  const characters = text.split('')
  const [visibleCount, setVisibleCount] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(characters.length)
      return
    }

    if (visibleCount < characters.length) {
      const runId = setTimeout(() => {
        setVisibleCount(count => count + 1)
      }, 90) // 90ms per character
      return () => clearTimeout(runId)
    }
  }, [visibleCount, characters.length, prefersReducedMotion])

  // Render visible characters with caret
}
```

#### CSS for Caret

```css
.subtitle-caret {
  display: inline-flex;
  align-items: flex-end;
  width: 0.85ch;
  height: 0.16rem;
  margin-left: 0.18rem;
  margin-bottom: 0.12rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.9);
  animation: subtitle-caret-blink 1s steps(1) infinite;
  box-shadow: 0 0 14px rgba(148, 163, 184, 0.35);
}

.subtitle-caret--idle {
  animation-duration: 1.5s; /* Slower when typing complete */
}

@keyframes subtitle-caret-blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}
```

#### Timing Configuration

```javascript
// Title: "a kanban for your vibeflow;" = 26 characters
// Each character: 90ms
// Total: 26 * 90ms = 2340ms
const TITLE_ANIMATION_DURATION = 2340
const PAUSE_AFTER_TITLE = 3000
const FOOTER_INITIAL_DELAY = TITLE_ANIMATION_DURATION + PAUSE_AFTER_TITLE // 5340ms
```

### Code Rain Animation

Falling syntax-highlighted code snippets background effect:

#### Component Structure

```jsx
function AnimatedCodeRain() {
  const droplets = useMemo(() => buildRainDrops(36), [])

  return (
    <div className="code-rain" aria-hidden="true">
      {droplets.map((drop) => (
        <pre
          className={clsx('code-rain__snippet', {
            'code-rain__snippet--soft': drop.blur
          })}
          style={{
            left: drop.left,
            fontSize: `${drop.fontSize}rem`,
            animationDuration: `${drop.animationDuration}s`,
            animationDelay: `${drop.animationDelay}s`,
            opacity: drop.opacity,
            '--tilt': `${drop.tilt}deg`,
          }}
        >
          <code>{/* Syntax-highlighted tokens */}</code>
        </pre>
      ))}
    </div>
  )
}
```

#### CSS Animation

```css
.code-rain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
  mix-blend-mode: screen;
}

.code-rain__snippet {
  position: absolute;
  top: -20vh;
  width: max-content;
  color: rgba(226, 232, 240, 0.55);
  font-family: 'JetBrains Mono', monospace;
  white-space: pre;
  animation-name: code-rain-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  filter: drop-shadow(0 20px 40px rgba(7, 12, 26, 0.28));
}

.code-rain__snippet--soft {
  filter: blur(1px);
}

@keyframes code-rain-fall {
  0% {
    transform: translate3d(0, -20vh, 0) rotate(var(--tilt));
  }
  100% {
    transform: translate3d(0, 120vh, 0) rotate(var(--tilt));
  }
}
```

#### Randomization Parameters

```javascript
function buildRainDrops(count = 34) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `code-rain-${idx}`,
    left: `${Math.random() * 100}%`,
    animationDuration: 18 + Math.random() * 24,    // 18-42 seconds
    animationDelay: -Math.random() * 24,           // Stagger start
    fontSize: 0.7 + Math.random() * 0.6,           // 0.7-1.3rem
    opacity: 0.18 + Math.random() * 0.32,          // 0.18-0.5
    tilt: -10 + Math.random() * 20,                // -10° to +10°
    blur: Math.random() > 0.65,                    // 35% chance of blur
  }))
}
```

#### Syntax Highlighting Tokens

```css
.code-token--keyword { color: rgba(79, 209, 255, 0.75); }
.code-token--string { color: rgba(244, 114, 182, 0.7); }
.code-token--number { color: rgba(244, 214, 102, 0.75); }
.code-token--tag { color: rgba(192, 132, 252, 0.78); }
.code-token--function { color: rgba(110, 231, 183, 0.7); }
.code-token--hex { color: rgba(250, 204, 21, 0.66); }
```

### Spring Physics

Using Framer Motion for natural card interactions:

```javascript
const springTransition = {
  layout: {
    type: 'spring',
    stiffness: 520,
    damping: 38,
    mass: 0.6,
  },
}

// Card motion properties
const motionProps = {
  whileHover: { y: -4, scale: 1.01 },
  whileTap: { scale: 0.995 },
}
```

### Transition Constants

```css
--transition-base: 230ms ease;

/* Component-specific transitions */
transition: box-shadow 220ms ease,
            border-color 220ms ease,
            background 220ms ease;

transition: transform var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base);
```

### Hover States

```css
/* Column active state (drag target) */
.kanban-column--active {
  transform: translateY(-4px);
  border-color: rgba(79, 209, 255, 0.35);
  box-shadow: 0 28px 60px rgba(8, 20, 45, 0.42);
}

/* Button hover */
.card-composer__trigger:hover {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(79, 209, 255, 0.45);
  transform: translateY(-1px);
}

/* Tag chip hover */
.tag-selector__chip:hover {
  transform: translateY(-1px);
  background: rgba(7, 13, 25, 0.85);
}
```

### Accessibility: Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

React hook for detecting preference:

```javascript
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
```

---

## Component Patterns

### Tag System

Dynamic color-based tags with custom color support:

#### Tag Chip CSS

```css
.kanban-card__tag {
  --local-color: var(--tag-color, #38bdf8);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;

  /* Color mixing for harmonious backgrounds */
  background: color-mix(in srgb, var(--local-color) 18%, rgba(15, 23, 42, 0.6));
  border: 1px solid color-mix(in srgb, var(--local-color) 40%, rgba(148, 163, 184, 0.25));
  color: color-mix(in srgb, var(--local-color) 82%, rgba(255, 255, 255, 0.9));

  letter-spacing: 0.01em;
}

.kanban-card__tag-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--local-color);
  box-shadow: 0 0 12px color-mix(in srgb, var(--local-color) 60%, transparent);
}
```

#### Tag Color Validation

Ensure sufficient contrast for readability:

```javascript
function relativeLuminance(color) {
  const { r, g, b } = hexToRgb(color)
  const srgb = [r/255, g/255, b/255].map(channel =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA)
  const lumB = relativeLuminance(colorB)
  const brightest = Math.max(lumA, lumB)
  const darkest = Math.min(lumA, lumB)
  return (brightest + 0.05) / (darkest + 0.05)
}

function isReadableOnBoard(color) {
  const MIN_CONTRAST = 2.6
  return contrastRatio(color, '#070d19') >= MIN_CONTRAST
}
```

### Column Accent System

Vertical accent bars with gradient backgrounds:

```css
.kanban-column__accent {
  width: 0.3rem;
  height: 52px;
  border-radius: 999px;
  background: var(--column-accent);
  box-shadow: 0 6px 18px rgba(79, 209, 255, 0.2);
}
```

Usage in component:

```jsx
<div
  className="kanban-column__header"
  style={{ '--column-accent': stage.accent }}
>
  <span className="kanban-column__accent" aria-hidden="true" />
</div>
```

### Button Patterns

#### Primary Action Button

```css
.card-composer__save {
  border-radius: 14px;
  border: none;
  padding: 0.65rem 1.4rem;
  background: linear-gradient(
    135deg,
    rgba(79, 209, 255, 0.88),
    rgba(192, 132, 252, 0.72)
  );
  color: #020617;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 18px 30px rgba(79, 209, 255, 0.3);
}
```

#### Secondary/Cancel Button

```css
.card-composer__cancel {
  background: rgba(7, 13, 25, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 14px;
  padding: 0.65rem 1.4rem;
  color: rgba(226, 232, 240, 0.85);
  cursor: pointer;
}
```

#### Dashed Trigger Button

```css
.card-composer__trigger {
  width: 100%;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.32);
  padding: 0.85rem 1rem;
  background: rgba(15, 23, 42, 0.35);
  color: rgba(226, 232, 240, 0.88);
  font-weight: 500;
  transition: background 200ms ease,
              border-color 200ms ease,
              transform 200ms ease;
}

.card-composer__trigger:hover {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(79, 209, 255, 0.45);
  transform: translateY(-1px);
}
```

### Form Input Styling

```css
.card-composer__field input,
.card-composer__field textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(7, 13, 25, 0.65);
  color: var(--text-primary);
  padding: 0.75rem 0.85rem;
  font-family: inherit;
  resize: none;
  transition: border-color 200ms ease,
              background 200ms ease;
}

.card-composer__field input:focus,
.card-composer__field textarea:focus {
  outline: none;
  border-color: rgba(79, 209, 255, 0.6);
  background: rgba(7, 13, 25, 0.85);
}
```

### Focus States

```css
.kanban-card:focus-visible {
  outline: 2px solid rgba(79, 209, 255, 0.8);
  outline-offset: 4px;
}

.card-composer__trigger:focus-visible {
  outline: 2px solid rgba(79, 209, 255, 0.75);
  outline-offset: 3px;
}
```

### Delete Button Pattern

Contextual delete appearing on hover:

```css
.kanban-card__delete {
  position: absolute;
  top: 0.45rem;
  right: 0.65rem;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  border: none;
  background: rgba(15, 23, 42, 0.7);
  color: rgba(148, 163, 184, 0.9);
  font-size: 1rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 180ms ease,
              transform 180ms ease;
}

.kanban-card:hover .kanban-card__delete,
.kanban-card:focus-within .kanban-card__delete {
  opacity: 1;
}

.kanban-card__delete:hover {
  color: rgba(248, 113, 113, 0.96);
  transform: scale(1.1);
}
```

---

## Spacing & Layout

### Grid System

5-column responsive kanban board:

```css
.board {
  display: grid;
  grid-template-columns: repeat(5, minmax(240px, 1fr));
  gap: 1.6rem;
  padding-bottom: 1rem;
  overflow-x: auto;
  scroll-padding-left: 1rem;
}

@media (max-width: 1200px) {
  .board {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}

@media (max-width: 820px) {
  .board {
    display: flex;
    gap: 1.3rem;
    overflow-x: auto;
  }

  .kanban-column {
    min-width: 280px;
  }
}
```

### Spacing Scale

```css
/* Component internal spacing */
.kanban-column {
  padding: 1.2rem;
  min-height: 520px;
}

.kanban-card {
  padding: 1.1rem 1rem 1rem;
}

.app-header {
  padding: 1.1rem 1.1rem;
  margin: 0 auto 2rem;
}

/* Gap scale */
gap: 0.45rem;  /* Tag chips, color options */
gap: 0.5rem;   /* Card tags, editor actions */
gap: 0.75rem;  /* Composer fields, buttons */
gap: 0.85rem;  /* Composer form spacing */
gap: 1rem;     /* Column cards, header elements */
gap: 1.3rem;   /* Mobile board columns */
gap: 1.6rem;   /* Desktop board columns */
```

### Border Radius Scale

```css
999px   /* Pills (tags, badges, accent bars) */
26px    /* Large containers (columns) */
22px    /* Medium containers (header) */
20px    /* Cards */
18px    /* Forms, editors */
16px    /* Trigger buttons */
14px    /* Action buttons, inputs */
12px    /* Small buttons */
10px    /* Micro elements */
```

### Container Constraints

```css
.app-chrome {
  max-width: 1400px;
  width: 100%;
}

.app-header {
  max-width: 520px;
}

.typing-footer__content {
  max-width: 1400px;
  margin: 0 auto;
}
```

### Z-Index Layering

```css
/* Background layers */
body::before  { z-index: -2; }  /* Base gradient */
body::after   { z-index: -1; }  /* Blur overlay */
.code-rain    { z-index: 0; }   /* Falling code */

/* Foreground layers */
.app-chrome   { z-index: 1; }   /* Main content */
.typing-footer{ z-index: 10; }  /* Fixed footer */
```

---

## Accessibility

### ARIA Patterns

```jsx
// Kanban board structure
<main className="board" role="list" aria-label="Vibecoders Kanban board">
  <section
    className="kanban-column"
    aria-labelledby="column-ideas-label"
  >
    <h2 id="column-ideas-label">Ideas</h2>
    <div className="kanban-column__cards" role="list">
      <article
        className="kanban-card"
        tabIndex={0}
        aria-roledescription="Kanban task"
      />
    </div>
  </section>
</main>

// Tag list
<ul className="kanban-card__tags" aria-label="Card tags">
  <li className="kanban-card__tag">React</li>
</ul>

// Color picker
<div
  className="tag-selector__colors"
  role="radiogroup"
  aria-label="Tag color"
>
  <button
    role="radio"
    aria-checked={checked}
    aria-label="Choose #4fd1ff tag color"
  />
</div>
```

### Screen Reader Only Utility

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Keyboard Navigation

Focus management examples:

```javascript
// Auto-focus on form open
useEffect(() => {
  if (isOpen) {
    requestAnimationFrame(() => {
      titleRef.current?.focus()
    })
  }
}, [isOpen])

// Tab order via tabIndex
tabIndex={checked ? 0 : -1}
```

### Error Handling

```jsx
<input
  aria-describedby={createError ? createErrorId : undefined}
/>
{createError && (
  <p id={createErrorId} className="tag-selector__error" role="alert">
    {createError}
  </p>
)}
```

---

## Implementation Guide

### Quick Start Setup

#### 1. Install Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install framer-motion clsx
```

#### 2. Import Fonts (in HTML head or CSS)

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Chakra+Petch:wght@600;700&display=swap" rel="stylesheet">
```

#### 3. Base CSS Setup

```css
:root {
  color-scheme: dark;
  --bg-base: #030712;
  --glass: rgba(12, 22, 38, 0.55);
  --glass-strong: rgba(14, 24, 42, 0.68);
  --border-color: rgba(148, 163, 184, 0.18);
  --text-primary: rgba(226, 232, 240, 0.96);
  --text-muted: rgba(148, 163, 184, 0.72);
  --shadow-elevated: 0 18px 40px rgba(8, 20, 45, 0.32),
                     0 6px 18px rgba(8, 20, 45, 0.2);
  --transition-base: 230ms ease;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
}
```

#### 4. Background Layers

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -2;
  background: radial-gradient(
    circle at top left,
    rgba(36, 111, 255, 0.22),
    transparent 45%
  ),
  radial-gradient(
    circle at bottom right,
    rgba(244, 114, 182, 0.18),
    transparent 40%
  ),
  #030712;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: radial-gradient(
      circle at 20% 20%,
      rgba(79, 209, 255, 0.12),
      transparent 55%
    ),
    radial-gradient(
      circle at 80% 60%,
      rgba(192, 132, 252, 0.1),
      transparent 50%
    );
  filter: blur(40px);
  opacity: 0.6;
}
```

### Reusable Glass Component Template

```jsx
export function GlassCard({ children, className, ...props }) {
  return (
    <div
      className={clsx('glass-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}
```

```css
.glass-card {
  position: relative;
  background: linear-gradient(
    160deg,
    rgba(13, 23, 41, 0.7),
    rgba(13, 23, 41, 0.45)
  );
  border: 1px solid var(--border-color);
  border-radius: 20px;
  backdrop-filter: blur(24px);
  box-shadow: var(--shadow-elevated);
  padding: 1rem;
}

.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.08),
    transparent 35%
  );
  pointer-events: none;
}
```

### Code Rain Integration

```jsx
import AnimatedCodeRain from './components/AnimatedCodeRain'

function App() {
  return (
    <div className="app-root">
      <AnimatedCodeRain />
      {/* Your content here */}
    </div>
  )
}
```

### Typewriter Text Component

```jsx
import { useState, useEffect } from 'react'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

export function TypewriterText({
  text,
  speed = 90,
  showCaret = true
}) {
  const [visibleCount, setVisibleCount] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const characters = text.split('')

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(characters.length)
      return
    }

    if (visibleCount < characters.length) {
      const timeout = setTimeout(() => {
        setVisibleCount(count => count + 1)
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [visibleCount, characters.length, speed, prefersReducedMotion])

  return (
    <span className="typewriter-text">
      {characters.slice(0, visibleCount).map((char, i) => (
        char === ' '
          ? <span key={i} className="typewriter-space" />
          : <span key={i} className="typewriter-char">{char}</span>
      ))}
      {showCaret && (
        <span
          className={clsx('typewriter-caret', {
            'typewriter-caret--idle': visibleCount === characters.length
          })}
        />
      )}
    </span>
  )
}
```

### Custom Hook: Prefers Reduced Motion

```javascript
import { useState, useEffect } from 'react'

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e) => setPrefersReducedMotion(e.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
```

### Responsive Breakpoints

```css
/* Desktop first approach */
@media (max-width: 1200px) {
  /* Tablet landscape */
  .app-root {
    padding: 3rem 1.25rem 5rem;
  }
}

@media (max-width: 820px) {
  /* Mobile */
  .app-root {
    padding: 2.5rem 1rem 5rem;
  }

  .board {
    display: flex;
    overflow-x: auto;
  }
}
```

---

## Design Tokens Reference

### Complete Token Set

```css
:root {
  /* Color Scheme */
  color-scheme: dark;

  /* Backgrounds */
  --bg-base: #030712;
  --bg-deep: radial-gradient(
    circle at top left,
    rgba(36, 111, 255, 0.22),
    transparent 45%
  ),
  radial-gradient(
    circle at bottom right,
    rgba(244, 114, 182, 0.18),
    transparent 40%
  ),
  #030712;

  /* Glass Surfaces */
  --glass: rgba(12, 22, 38, 0.55);
  --glass-strong: rgba(14, 24, 42, 0.68);
  --glass-soft: rgba(14, 24, 42, 0.45);

  /* Borders */
  --border-color: rgba(148, 163, 184, 0.18);

  /* Text */
  --text-primary: rgba(226, 232, 240, 0.96);
  --text-muted: rgba(148, 163, 184, 0.72);

  /* Shadows */
  --shadow-elevated: 0 18px 40px rgba(8, 20, 45, 0.32),
                     0 6px 18px rgba(8, 20, 45, 0.2);

  /* Transitions */
  --transition-base: 230ms ease;

  /* Typography */
  font-family: 'Space Grotesk', 'SF Pro Display', system-ui, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  /* Font Rendering */
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Performance Considerations

### Animation Performance

Use `will-change` and `transform` for GPU acceleration:

```css
.kanban-card {
  will-change: transform, box-shadow;
}

/* Prefer transform over position changes */
.kanban-column--active {
  transform: translateY(-4px);  /* GPU accelerated */
  /* NOT: top: -4px; */          /* CPU only */
}
```

### Backdrop Filter Optimization

Limit backdrop blur usage to key surfaces:

```css
/* Use sparingly - expensive operation */
backdrop-filter: blur(24px);

/* Consider fallback for older browsers */
@supports not (backdrop-filter: blur(24px)) {
  background: rgba(13, 23, 41, 0.85);
}
```

### Code Rain Optimization

```css
.code-rain {
  /* Prevent interaction overhead */
  pointer-events: none;

  /* Use transform for animation */
  animation-name: code-rain-fall;
}

/* Use translate3d for hardware acceleration */
@keyframes code-rain-fall {
  0% { transform: translate3d(0, -20vh, 0) rotate(var(--tilt)); }
  100% { transform: translate3d(0, 120vh, 0) rotate(var(--tilt)); }
}
```

---

## Color Mixing Technique

Modern CSS `color-mix()` for dynamic tag colors:

```css
/* Syntax */
color-mix(in srgb, var(--color) percentage%, base-color)

/* Examples from tag system */
background: color-mix(
  in srgb,
  var(--local-color) 18%,
  rgba(15, 23, 42, 0.6)
);

border: 1px solid color-mix(
  in srgb,
  var(--local-color) 40%,
  rgba(148, 163, 184, 0.25)
);

color: color-mix(
  in srgb,
  var(--local-color) 82%,
  rgba(255, 255, 255, 0.9)
);

/* Glow effect */
box-shadow: 0 0 12px color-mix(
  in srgb,
  var(--local-color) 60%,
  transparent
);
```

### Fallback for Older Browsers

```css
@supports not (background: color-mix(in srgb, red 50%, blue)) {
  /* Provide static fallback colors */
  background: rgba(15, 23, 42, 0.6);
}
```

---

## Scrollbar Styling

Custom scrollbar for board overflow:

```css
.board::-webkit-scrollbar {
  height: 8px;
}

.board::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
}

.board::-webkit-scrollbar-track {
  background: transparent;
}
```

---

## Credits & Attribution

**Design System Created By:** Ambitious Realism
**Typeface Providers:**
- Space Grotesk by Florian Karsten (Google Fonts)
- JetBrains Mono by JetBrains (Google Fonts)
- Chakra Petch by Cadson Demak (Google Fonts)

**Key Libraries:**
- @dnd-kit for drag-and-drop interactions
- Framer Motion for spring physics
- React for component architecture

---

## Version History

**v1.0 (January 2025)**
- Initial design language documentation
- Complete CSS system extracted from Kandoo Codex
- Animation system specifications
- Accessibility patterns
- Implementation guides

---

## License

This design language documentation is provided for reference and implementation in other projects. Attribution to Kandoo Codex appreciated but not required.

---

**End of Document**
