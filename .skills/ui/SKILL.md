---
name: Amuse UI Architecture
description: Standard patterns for UI components, layout, and state management in the Amuse application.
---

# Amuse UI Architecture

This skill defines the canonical UI patterns for the Amuse Operations Platform. Every AI assistant should adhere to these standards to maintain visual and functional consistency.

## 1. The Side Panel Pattern (Drawer)
All detailed views (Invoices, Customers, POS Cart) must use the **Side Panel** pattern instead of full-screen modals or separate pages.

### Structure
Use the `.customer-detail` class with the `.open` state. On Mobile, it stays full-screen; on Desktop, it becomes a fixed-width right-side panel.

### Implementation
- **State**: Use a single `panelStep` state (e.g., `null | 'cart' | 'payment'`) instead of multiple booleans.
- **Header**: Use `.cd-header` with a `.cd-back` button and `.cd-title`.
- **Content**: Scrollable `.cd-profile` container.
- **Actions**: Bottom-aligned `.cd-actions` or inline `.pos-checkout-btn`.

## 2. Global State & Context
- **Reactive Updates**: Use `useEffect` to manage side-panel visibility based on dependencies (e.g., auto-closing if a cart is emptied).
- **Data Fetching**: Always use the custom TanStack Query hooks in `src/hooks/`. Never call `frappe.call` directly in components.

## 3. Empty & Loading States
Use the standard components in `src/components/AppState.tsx`:
- `ListLoadingState` / `ListEmptyState` for primary lists.
- `InlineLoadingState` / `InlineEmptyState` for secondary or nested detail views.

## 4. CSS Styling
- **Utility vs. Domain**: Prioritize our domain classes (`.metric`, `.pill`, `.pos-item`) over pure Tailwind utilities for core UI elements.
- **Variables**: Use our CSS variables (`--accent`, `--surface`, `--radius`) to ensure theme compatibility (Dark Mode).

## 5. Verification
- **Build**: Ensure `yarn build` passes without rolldown native binding errors.
- **Responsive**: Toggle between Mobile and Desktop viewports in the browser to verify the transform of panels and navigation.
