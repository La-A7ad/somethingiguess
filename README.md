# Kanban Board (React)

## Setup
```bash
npm install
npm run dev
```

## Scripts
- `npm run lint` (must be zero errors)
- `npm run test` / `npm run test:coverage` (>= 80% lines)
- `npm run e2e` (Playwright end-to-end test)
- `npm run seed` (prints a console snippet that seeds 500+ cards into localStorage)
- In-app seeding: click **Seed 500+** in the toolbar.

## Architectural Summary (≈ 250–300 words)
This app is a local‑first Kanban board. The entire board (lists, cards, UI state, undo history, and the offline queue) lives in a single reducer and is exposed through Context in `src/context/BoardProvider.jsx`. UI components render from that state and never touch persistence or the server directly. Instead, they call the action helpers in `src/hooks/useBoardState.js`.

Each action follows the same contract: validate input, push an undo snapshot, apply an optimistic reducer change, and enqueue a “server operation” describing what the backend should do. The board state and the queue are persisted to localStorage (`src/services/storage.js`) on every change, so a refresh does not lose work. While offline (or when “Force offline” is enabled), the UI still behaves normally because it only depends on the local reducer; operations simply accumulate in the queue.

Syncing is handled by `src/hooks/useOfflineSync.js`. It flushes queued operations when the browser is online, on the `online` event, and periodically. The backend itself is mocked using MSW (`src/services/api.js`), which lets the app demonstrate latency, forced failures, and conflicts without a real server.

Conflicts use optimistic concurrency control with per-entity versioning. If the server rejects an update as stale, the client attempts a three‑way merge (base/local/server). When auto-merge is ambiguous, the modal provides a field-by-field resolver (`src/components/CardDetailModal.jsx`) and then forces the resolved entity to the server so the queue can continue.

To stay fast at 500+ cards, long lists use virtualization (`react-window`) and cards are memoized to reduce re-renders.
