# Conflict Resolution Strategy (≈ 250–300 words)

Conflicts are detected via optimistic concurrency control. Each list and card has a monotonically increasing `version`. When the client enqueues an update, it records the entity’s current version as `baseVersion`. The MSW server compares that version to its stored entity; if the server’s version is newer, it returns HTTP 409 with the authoritative server entity (see the conflict response in `src/services/api.js:L53-L73`).

On the client, `useOfflineSync` (`src/hooks/useOfflineSync.js:L98-L118`) treats a 409 as a merge event, not a fatal error. For cards, it attempts a three-way merge using the base entity snapshot captured at enqueue time, the current local entity, and the server entity. The merge operates field-by-field over `title`, `description`, `tags`, and `listId`. If a field changed only locally (server matches base), local wins. If it changed only on the server (local matches base), server wins. If both changed differently, that field is marked as a conflict and the operation pauses.

When auto-merge can’t safely decide, the UI shows a merge resolver inside the modal (`src/components/CardDetailModal.jsx:L92-L112`). The user chooses “Local” or “Server” for each conflicting field. After they apply the resolution, the client forces the merged entity to the server (a deliberate “I know what I’m doing” endpoint) and then resumes flushing the queue.

Lists use the same idea but with a simpler UI: conflicts are resolved for `title` and `archived` using a banner resolver at the top of the board. This isn’t overkill; it’s a realistic approach for offline-first apps where stale edits happen naturally, and it avoids silently overwriting user work.
