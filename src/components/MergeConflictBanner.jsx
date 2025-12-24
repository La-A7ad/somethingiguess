import React, { useMemo, useState } from "react";

/**
 * Used for list conflicts (card conflicts are handled inside the modal).
 */
export default function MergeConflictBanner({ conflict, onResolve, onDismiss }) {
  const fields = conflict?.conflicts || [];
  const [choice, setChoice] = useState(() => Object.fromEntries(fields.map((f) => [f, "local"])));

  const preview = useMemo(() => {
    const out = {};
    for (const f of fields) {
      out[f] = choice[f] === "server" ? conflict.server?.[f] : conflict.local?.[f];
    }
    return out;
  }, [fields, choice, conflict]);

  if (!conflict) return null;

  return (
    <div
      role="alert"
      className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
      aria-label="merge-conflict-banner"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-amber-900">Merge conflict detected</div>
          <div className="text-amber-900/80">
            The list <span className="font-medium">{conflict.local?.title || conflict.id}</span> was edited elsewhere.
            Choose which values to keep.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border bg-white px-2 py-1" onClick={onDismiss} aria-label="dismiss-merge">
            Dismiss
          </button>
          <button
            className="rounded-lg bg-amber-600 px-2 py-1 text-white"
            onClick={() => onResolve(choice)}
            aria-label="resolve-merge"
          >
            Resolve
          </button>
        </div>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f} className="rounded-lg border bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{f}</div>
              <select
                className="rounded-lg border px-2 py-1"
                value={choice[f]}
                onChange={(e) => setChoice((c) => ({ ...c, [f]: e.target.value }))}
                aria-label={`merge-choice-${f}`}
              >
                <option value="local">Keep local</option>
                <option value="server">Keep server</option>
              </select>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              <div>
                <span className="font-medium">Local:</span> {String(conflict.local?.[f] ?? "")}
              </div>
              <div>
                <span className="font-medium">Server:</span> {String(conflict.server?.[f] ?? "")}
              </div>
              <div className="mt-1">
                <span className="font-medium">Selected:</span> {String(preview[f] ?? "")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
