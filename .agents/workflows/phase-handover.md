---
description: Automated check to ensure all Phase deliverables (code + docs) are synchronized before handover.
---

# Phase Handover Workflow

This workflow ensures the project remains in a coherent state following a development phase.

## Steps

1. **Verify Implementation Plan**
   - Confirm a plan exists in `docs/plans/[YYYY-MM-DD]-[N]-feature-name.md`.
   - Update its status to "Completed".

2. **Capture Solutions**
   - Check for non-obvious fixes or build hurdles encountered during the phase.
   - Create a solution log in `docs/solutions/`.

3. **Synchronize Task Trackers**
   - If using internal task artifacts, sync the final status to the repository's documentation or a `CHANGELOG.md` entry if appropriate.

4. **Verify Build & Types**
   - Run `yarn build` in the `frontend` directory.
   - Run relevant Python tests in the `amuse` backend.

5. **Commit & Push**
   - Group work into logical, atomic commits.
   - Push all code and documentation to the remote branch.

6. **Notify User**
   - Only after steps 1-5 are verified, provide the final walkthrough to the user.
