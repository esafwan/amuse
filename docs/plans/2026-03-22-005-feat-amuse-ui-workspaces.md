---
title: "feat: Amuse — UI Workspaces & Component Architecture (Phase 5)"
type: feat
status: draft
date: 2026-03-22
depends_on: "2026-03-22-004-feat-amuse-pricing-api-layer"
---

# Phase 5: UI Workspaces & Component Architecture

This phase focuses entirely on transforming the barebones HTML stubs and Frappe API layer into a modern, beautifully designed operations interface using React and TailwindCSS.

## 1. Tooling & Standardization
- Establish `tailwindcss`, `postcss`, and `autoprefixer` within the Vite frontend.
- Adopt modern Radix/Shadcn-style structural constants (headers, interactive tables, modifiable drawers).

## 2. The Pricing Intelligence Workspace
Create the core interaction surfaces required by the reference specs:
- **Price Change Register (`PricingWorkspace.tsx`)**: An interactive data-grid rendering `usePriceChangeLogs()` with timestamp sorts, filtering by item, and distinct badge indicators for Pending/Completed computations.
- **Price Impact Dashboard (`PriceImpact.tsx`)**: Reusable summary cards digesting `usePriceRegimeSummary()` to project Revenue per Day and Discount Erosion % before/after major base-rate tweaks.

## 3. Operations Exception Center
- **Exception Queue (`ExceptionCenter.tsx`)**: Dedicated queue to intercept `Failed` snapshot jobs (from the Price Change Log dataset) or mismatch notifications, hooking into `useTriggerSnapshotRebuild()`.

## 4. POS / Billing Upgrades
- Upgrade `POSView.tsx` from a structural diagnostic to visual interaction.
- Upgrade `Billing.tsx` into a proper master-detail queue.
