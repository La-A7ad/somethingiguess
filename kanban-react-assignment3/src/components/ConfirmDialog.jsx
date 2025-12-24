import React, { useEffect, useRef } from "react";

export default function ConfirmDialog({ title = "Confirm", message, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" role="presentation">
      <div
        ref={ref}
        className="bg-white rounded shadow max-w-md w-full p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm mt-2">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded bg-slate-200" onClick={onCancel} aria-label="cancel-confirm">
            Cancel
          </button>
          <button className="px-3 py-1.5 rounded bg-rose-700 text-white" onClick={onConfirm} aria-label="confirm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
