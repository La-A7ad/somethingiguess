import React from "react";
import useBoardState from "../hooks/useBoardState.js";

export default function Header() {
  const { state, actions } = useBoardState();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const effectiveOnline = online && !state.ui.forceOffline;

  return (
    <header className="border-b bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Kanban Board</h1>

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            effectiveOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
          aria-label="connection-status"
        >
          {effectiveOnline ? "Online" : "Offline"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" onClick={actions.undo} aria-label="undo">
            Undo
          </button>
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" onClick={actions.redo} aria-label="redo">
            Redo
          </button>
          <button
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
            onClick={actions.syncNow}
            aria-label="sync-now"
          >
            Sync
          </button>
        </div>
      </div>

      {state.ui.error ? (
        <div className="max-w-screen-2xl mx-auto px-4 pb-3">
          <div className="text-sm bg-red-50 text-red-800 p-2 rounded flex items-center gap-2">
            <span>Sync error: {state.ui.error}</span>
            <button className="ml-auto underline" onClick={actions.clearError} aria-label="dismiss-error">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
