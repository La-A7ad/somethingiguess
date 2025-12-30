# Optimistic Updates & Offline Queue (≈ 250–300 words)

Every write is optimistic: the UI updates immediately, then the app tries to make the server agree later. The pattern is consistent across actions in `useBoardState` (`src/hooks/useBoardState.js:L19-L39`): first it pushes an undo snapshot, then it dispatches a reducer action to apply the change locally, and finally it enqueues a sync operation describing what the server should do next. The queue is stored in reducer state and persisted to localStorage (`src/services/storage.js:L3-L22`), which is what makes the app survive refreshes without losing offline work.

The sync engine is `useOfflineSync` (`src/hooks/useOfflineSync.js:L98-L118`). It flushes queued operations in order when the browser is online (or when “Force offline” is not enabled). It also triggers on the browser “online” event and on a periodic timer. This matters because users don’t like to press “Sync” every time they reconnect; they want the app to quietly do the right thing.

Failure handling is explicit. When a request fails with a non‑conflict error (for example, the MSW server is configured to fail or inject latency), the sync layer re-fetches the authoritative server state and applies it to the reducer. That “server re-apply” acts as a rollback mechanism: any optimistic changes that weren’t accepted are removed from the UI, and the user sees an error banner until they dismiss it. In other words: you get speed when things work, and honesty when they don’t.

Seeding is also treated as local-first: `seed500` (`src/utils/seed.js:L5-L25`) populates localStorage with 600 cards so performance and virtualization behavior can be exercised without manual data entry. This gives a realistic dataset while keeping the app fully client-side.
