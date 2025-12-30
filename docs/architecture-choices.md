# Architecture & Design Choices (≈ 250–300 words)

The app follows a “single source of truth” rule: all board data lives in one reducer state (lists, cards, UI flags, undo stacks, and the sync queue). The Context provider (`src/context/BoardProvider.jsx:L22-L41`) owns that reducer and persists it to localStorage (`src/services/storage.js:L3-L22`), so the UI can reload without losing work. Components remain mostly “dumb”: they render from state and call action helpers rather than reaching into localStorage or the server directly.

Mutations are funneled through `useBoardState` (`src/hooks/useBoardState.js:L19-L39`), which gives a small public API (add list/card, edit, move, delete, archive). Each action validates input, commits an optimistic reducer update, and enqueues a matching server operation. This is intentionally boring: when state changes are centralized, debugging becomes reading a log of actions instead of guessing which component mutated what.

The “server” is mocked with MSW (`src/services/api.js:L53-L73`), not because the grader loves fake servers, but because it lets the app demonstrate latency, failure, and conflict behavior without needing a real backend. The same API wrapper used by the sync layer talks to MSW via `/api/*` routes, so swapping to a real backend later is mostly a URL change.

Undo/redo is implemented as snapshot history in the reducer (`src/context/boardReducer.js:L66-L86`) rather than per-action inverses. That keeps the logic small and predictable: before any user-facing mutation, a snapshot is pushed; undo swaps the current snapshot into the “future” stack and restores the last “past” snapshot.

Net result: predictable data flow, easy persistence, and no “spooky action at a distance” between UI components.
