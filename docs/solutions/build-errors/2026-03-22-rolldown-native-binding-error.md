---
title: "Rolldown Native Binding Error during Vite Build"
date: "2026-03-22"
author: "Antigravity Agent"
component: "frontend"
module: "Build System"
tags: ["vite", "rolldown", "yarn", "node-version"]
status: "Resolved"
---

# Problem
When running `yarn build` in the `frontend` directory, the build fails with a `rolldown` native binding error:
`Error: Cannot find native binding. npm has a bug related to optional dependencies. Please try npm i again after removing both package-lock.json and node_modules directory.`

This typically occurs when moving across platform architectures (e.g., Mac arm64 vs Linux x64) or when Node.js environment changes cause optional dependency resolution to fail.

# Solution
The issue is resolved by forcing a re-installation of dependencies and ignoring the engines check if there's a slight mismatch in Node.js minor versions between the developer environment and the toolchain.

## Execution Steps
1. Navigate to the frontend directory:
   `cd development/ainative/apps/amuse/frontend`
2. Force a re-install of dependencies:
   `yarn install --force --ignore-engines`
3. Retry the build:
   `yarn build`

# Verification
The build should complete successfully, generating the assets in `dist/` and successfully copying the final entry point to `www/amuse.html`.
