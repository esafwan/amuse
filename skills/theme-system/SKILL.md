---
name: theme-system
description: >
  CSS variable-based theming with dark/light mode support. 
  Includes color tokens, spacing, typography, and the theme 
  toggle mechanism. Consult this skill for styling, theme 
  customization, or visual design changes.
category: design-system
---

# Theme System

## Overview

The theme system uses CSS custom properties (variables) for consistent styling across the application:

- **CSS Variables**: All colors, spacing, and typography tokens
- **Dark Mode**: Class-based theme switching (`dark` class on html)
- **Persistent Preference**: Saves to localStorage
- **System Preference**: Respects OS-level dark mode setting

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/index.css` | CSS variables and base styles |
| `frontend/src/shell/ThemeToggle.tsx` | Theme toggle button component |
| `frontend/src/App.css` | Component-specific styles |

## How It Works

### CSS Variable Definition

```css
:root {
    /* Light mode defaults */
    --bg: #f6f7f9;
    --surface: #ffffff;
    --text-1: #0b1220;
    --text-2: #5a6475;
    --text-3: #8e99aa;
    --accent: #3b5bfd;
    --accent-2: #2b4cd6;
    --red: #ef4444;
    --amber: #f59e0b;
    --green: #10b981;
    /* ... etc */
}

.dark {
    /* Dark mode overrides */
    --bg: #0b1220;
    --surface: #121929;
    --text-1: #f3f5f9;
    --text-2: #aab3c4;
    --text-3: #6b7687;
    /* ... etc */
}
```

### Theme Toggle Flow

```
User clicks toggle
       ↓
Check current theme (localStorage or system)
       ↓
Toggle to opposite
       ↓
Set 'dark' class on document.documentElement
       ↓
Save preference to localStorage
```

### Usage in Components

```typescript
// Inline styles
<div style={{ color: 'var(--text-1)', background: 'var(--surface)' }} />

// CSS classes (defined in index.css)
<div className="card">
```

## Color Tokens

| Token | Usage |
|-------|-------|
| `--bg` | Page background |
| `--surface` | Card/sheet backgrounds |
| `--text-1` | Primary text (headings) |
| `--text-2` | Secondary text (body) |
| `--text-3` | Tertiary text (hints, meta) |
| `--accent` | Primary actions, links |
| `--accent-2` | Hover states |
| `--red` | Errors, negative |
| `--amber` | Warnings, pending |
| `--green` | Success, positive |

## Extension Points

### Adding New Tokens

1. Add to `:root` in `index.css`:
```css
:root {
    --my-color: #ff0000;
}

.dark {
    --my-color: #ff6666;
}
```

2. Use in components:
```css
.my-element {
    color: var(--my-color);
}
```

### Component Variants

Add BEM-style modifiers:
```css
.btn { /* base */ }
.btn--primary { background: var(--accent); }
.btn--danger { background: var(--red); }
```

## Dependencies

- None (pure CSS)

## Gotchas

1. **Flash on Load**: If user prefers dark mode, there may be a flash of light mode on initial load before JavaScript runs. Consider inline script in index.html to set class early.

2. **System Preference**: The toggle respects `prefers-color-scheme` media query initially, but user selection overrides it.

3. **No CSS-in-JS**: All styles are in CSS files. No styled-components or emotion.

4. **Specificity**: Uses simple class selectors. For overrides, use more specific selectors or `!important` sparingly.

5. **Spacing Scale**: Uses ad-hoc pixel values rather than a strict 4/8pt grid. Consider standardizing if design system grows.

6. **Typography**: Uses system font stack. No custom fonts loaded.
