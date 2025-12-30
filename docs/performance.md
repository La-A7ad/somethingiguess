# Performance & Rendering Notes (≈ 250–300 words)

A Kanban board slows down for two boring reasons: too many DOM nodes and too many React re-renders. This project tackles both with small, measurable changes.

Large columns are virtualized. In `ListColumn` (src/components/ListColumn.jsx:L2-L22), rendering switches to `react-window` when a list exceeds 30 cards. Virtualization keeps only the visible rows mounted, so render cost stays close to O(visibleCards) instead of O(totalCards). With the provided seed dataset (600 cards), this prevents the browser from laying out and painting hundreds of off-screen elements.

Cards are memoized. `Card` is wrapped with `memo` (src/components/Card.jsx:L1-L21) and uses stable callbacks and memoized derived values, which reduces wasted re-renders when unrelated parts of the board change (sync status, edits in another list, etc.). In practice, this keeps scrolling responsive even while operations are being queued and flushed.

Heavy UI is deferred. The card detail modal is loaded lazily with `React.lazy` and `Suspense` in `src/components/Board.jsx`, so the initial render stays light. This matters most on cold starts with large seeded data.

The seed itself is intentional (src/utils/seed.js:L5-L25). It produces 600 cards so you can verify performance rather than argue about it. Click **Seed 500+**, scroll, drag cards, and compare behavior with and without virtualization by adjusting the threshold. If you remove these optimizations, you will feel the difference immediately—because the DOM is honest, even when we aren’t.

One more check: open DevTools, watch FPS, then seed again.
