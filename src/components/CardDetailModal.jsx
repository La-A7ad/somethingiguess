import React, { useEffect, useMemo, useRef, useState } from "react";
import useBoardState from "../hooks/useBoardState.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const getFocusables = () =>
      Array.from(
        el.querySelectorAll("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])")
      ).filter((n) => !n.hasAttribute("disabled"));

    const first = () => getFocusables()[0];
    const last = () => {
      const f = getFocusables();
      return f[f.length - 1];
    };

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const f = getFocusables();
      if (f.length === 0) return;
      const a = document.activeElement;

      if (e.shiftKey && a === first()) {
        e.preventDefault();
        last()?.focus();
      } else if (!e.shiftKey && a === last()) {
        e.preventDefault();
        first()?.focus();
      }
    };

    el.addEventListener("keydown", onKeyDown);
    first()?.focus();
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

export default function CardDetailModal() {
  const { state, actions, offlineSync } = useBoardState();

  const merge = state.ui.mergeConflict;
  const isMerge = Boolean(merge);

  const cardId = state.ui.selectedCardId;
  const card = cardId ? state.cards.byId[cardId] : null;

  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);

  const [title, setTitle] = useState(card?.title || "");
  const [description, setDescription] = useState(card?.description || "");
  const [tagsText, setTagsText] = useState((card?.tags || []).join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title || "");
    setDescription(card.description || "");
    setTagsText((card.tags || []).join(", "));
  }, [cardId]);

  const close = () => actions.closeModal();

  const save = () => {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    actions.updateCard(cardId, { title, description, tags });
    close();
  };

  const fields = merge?.conflicts || [];
  const [pick, setPick] = useState(() => {
    const p = {};
    for (const f of fields) p[f] = "local";
    return p;
  });

  useEffect(() => {
    if (!merge) return;
    const p = {};
    for (const f of merge.conflicts || []) p[f] = "local";
    setPick(p);
  }, [merge?.opId]);

  const modalTitle = isMerge ? "Resolve Merge Conflict" : "Card Details";

  const mergeBody = useMemo(() => {
    if (!merge) return null;
    const local = merge.local || {};
    const server = merge.server || {};
    const displayFields = merge.conflicts || [];

    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          Server has a newer version. Choose what to keep for each conflicting field.
        </p>

        {displayFields.map((f) => (
          <div key={f} className="border rounded p-3 bg-slate-50">
            <div className="text-sm font-semibold mb-2">{f}</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <input
                  type="radio"
                  name={`pick-${f}`}
                  checked={pick[f] === "local"}
                  onChange={() => setPick((p) => ({ ...p, [f]: "local" }))}
                  aria-label={`pick-local-${f}`}
                />{" "}
                <span className="font-medium">Local</span>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(local[f], null, 2)}
                </pre>
              </label>
              <label className="text-sm">
                <input
                  type="radio"
                  name={`pick-${f}`}
                  checked={pick[f] === "server"}
                  onChange={() => setPick((p) => ({ ...p, [f]: "server" }))}
                  aria-label={`pick-server-${f}`}
                />{" "}
                <span className="font-medium">Server</span>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(server[f], null, 2)}
                </pre>
              </label>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded bg-slate-200" onClick={close} aria-label="cancel-merge">
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded bg-emerald-600 text-white"
            onClick={async () => {
              await offlineSync.resolveMerge(pick);
            }}
            aria-label="apply-merge"
          >
            Apply resolution
          </button>
        </div>
      </div>
    );
  }, [close, merge, offlineSync, pick]);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={containerRef}
        className="bg-white rounded shadow max-w-2xl w-full p-4"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{modalTitle}</h2>
          <button className="ml-auto px-2 py-1 rounded bg-slate-200" onClick={close} aria-label="close-modal">
            Close
          </button>
        </div>

        <div className="mt-4">
          {isMerge ? (
            mergeBody
          ) : (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium">Title</span>
                <input className="mt-1 w-full border rounded px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="card-title" />
              </label>

              <label className="block text-sm">
                <span className="font-medium">Description</span>
                <textarea className="mt-1 w-full border rounded px-2 py-1 min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="card-description" />
              </label>

              <label className="block text-sm">
                <span className="font-medium">Tags (comma separated)</span>
                <input className="mt-1 w-full border rounded px-2 py-1" value={tagsText} onChange={(e) => setTagsText(e.target.value)} aria-label="card-tags" />
              </label>

              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 rounded bg-rose-700 text-white" onClick={() => setConfirmDelete(true)} aria-label="delete-card">
                  Delete
                </button>
                <button className="px-3 py-1.5 rounded bg-slate-900 text-white" onClick={save} aria-label="save-card">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {confirmDelete ? (
          <ConfirmDialog
            title="Delete card?"
            message="This cannot be undone."
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              actions.deleteCard(cardId);
              setConfirmDelete(false);
              close();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
