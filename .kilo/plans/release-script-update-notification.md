# Plan: Release Script & Admin Update Notification

## Goal
Build `bun run release <version> --note "..."` that bumps versions, builds, commits, tags, and persists a release note so the admin panel can show an in-app update notification.

---

## Phase 1: Release Script (`scripts/release.js`)

A Node CLI script that:
1. Accepts `<version>` positional arg and `--note` flag.
2. Bumps versions in:
   - `package.json` (root)
   - `backend/package.json`
   - `README.md` version badge
   - `public/sw.js` cache name (e.g., `trip-calculator-v3.0.0`)
3. Writes `public/release-info.json`:
   ```json
   { "version": "3.0.0", "note": "...", "date": "2026-06-06T..." }
   ```
4. Runs `bun run build`.
5. Stages, commits, and tags:
   ```
   git add .
   git commit -m "release: v3.0.0 - note"
   git tag v3.0.0
   ```
6. Prints next steps (push tag, etc.).

### Script behavior details
- Validate version format (`semver`).
- Abort on dirty git tree unless `--force` flag is used.
- If `--note` is omitted, default to generic message or prompt.

### Root `package.json` script addition
```json
"release": "node scripts/release.js"
```

---

## Phase 2: Admin Update Notification

### New files
- **`src/components/UpdateNotification.jsx`**: A banner component that:
  - Fetches `/release-info.json` on mount.
  - Compares `version` with `localStorage.getItem('lastDismissedVersion')`.
  - If newer or not yet dismissed, shows a notification bar with the release note and an **Update** button.
  - Clicking **Update** calls `window.location.reload()` and stores the new version in `localStorage`.

- **`src/hooks/useReleaseInfo.js`**: Custom hook to encapsulate the fetch + compare logic.

### Integration
- Mount `UpdateNotification` inside the main layout (e.g., `App.jsx`), gated by `user?.role === 'admin'` so only admins see it.
- Ensure it does not block the UI; it can appear as a non-dismissible top bar or dismissible toast.

### Service worker considerations
- When a new release is deployed, the SW cache is already version-bumped via `sw.js`. The page reload will trigger the new SW install/activate cycle.
- Optional: if using `vite-plugin-pwa`, consider showing a native PWA update prompt instead. For this plan, we stick to the simple notification bar approach.

---

## Phase 3: Testing & Edge Cases

- **Dirty tree**: Script aborts if uncommitted changes exist (unless `--force`).
- **Missing `--note`**: Script exits with error or uses an empty default.
- **Build failure**: Script exits non-zero before git commit/tag.
- **File not found**: Script verifies all files exist before modifying.
- **Admin notification on first login**: If `localStorage` is empty, first-time admins will see the latest release note.
- **Non-admin users**: Notification is hidden.

---

## Files to modify or create

| # | File | Action |
|---|------|--------|
| 1 | `scripts/release.js` | Create |
| 2 | `package.json` | Add `"release": "node scripts/release.js"` script |
| 3 | `public/sw.js` | Update cache name string pattern |
| 4 | `src/components/UpdateNotification.jsx` | Create |
| 5 | `src/hooks/useReleaseInfo.js` | Create |
| 6 | `src/App.jsx` | Import and mount `UpdateNotification` (admin only) |

---

## Acceptance Criteria

- `bun run release 3.0.0 --note "Big feature"` succeeds end-to-end.
- After running, all version strings match `3.0.0` and `release-info.json` contains the note.
- A git commit and tag `v3.0.0` are created.
- Admin users see a notification bar after login when a new release note exists.
- Clicking the **Update** button reloads the app and dismisses the notification.
