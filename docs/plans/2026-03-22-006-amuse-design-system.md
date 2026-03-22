---
title: "Phase 6: Amuse Design System Integration"
date: "2026-03-22"
author: "Antigravity Agent"
status: "Active"
---

# Scope
The user provided a definitive HTML/CSS "Frontend Vision Prototype" which dictates the absolute visual identity of the Amuse Operations Platform. The generic Shadcn/Tailwind default variables implemented in Phase 5 must be entirely replaced by this custom styling architecture.

# Design System Specification
The prototype relies on a clean, structured class-based hierarchy rather than pure utility composing. 
- **Variables**: `--color-background-*`, `--color-text-*`, `--color-border-*`, `--border-radius-*`. Includes native Dark Mode support via `@media (prefers-color-scheme: dark)`.
- **Layout Definitions**: `.shell`, `.rail`, `.main`, `.topbar`, `.page`.
- **UI Components**: `.kpi-strip`, `.kpi`, `.card`, `.tbl`, `.pill`, `.tab-row`, `.queue-item`.
- **Interaction**: `.cmd-overlay`, `.cmd-box` for command palettes.

# Implementation Plan

## Step 1: CSS Injection
- Completely overwrite `frontend/src/index.css`.
- Preserve the Tailwind v4 `@import "tailwindcss";` at the top for layout layout utility fallbacks, but inject the entire `<style>` block from the prototype below it globally.

## Step 2: AppShell Refactoring
- Rewrite `AppShell.tsx` to abandon the `h-screen flex` Tailwind structures.
- Map the UI directly to:
  ```html
  <div className="shell">
     <div className="rail">...icons...</div>
     <div className="main">
        <div className="topbar">...</div>
        <div className="page">{children}</div>
     </div>
  </div>
  ```

## Step 3: Workspace Component Migrations
- **PricingWorkspace**: Update to use `<div className="kpi-strip">`, `<table className="tbl">`, `<div className="tab-row">`.
- **ExceptionCenter**: Update error tables to use `.pill-red`.
- **Billing**: Rewrite the split-view logic to utilize `.card`, `.tbl`, and `.pill-green` status indicators as shown in the prototype.
- **POSView**: Translate checkout registers and summary calculations into `.card` and `.two-col` splits.

## Step 4: Verification
- Recompile via `yarn build`.
- Issue an E2E Browser Testing Subagent to capture screenshots of the rewritten layout matching the Prototype expectations.
