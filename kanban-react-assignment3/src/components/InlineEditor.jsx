import React, { useEffect, useRef, useState } from "react";
import { validateNonEmpty } from "../utils/validators.js";

export default function InlineEditor({ initialValue, placeholder, onSave, onCancel, ariaLabel }) {
  const [value, setValue] = useState(initialValue || "");
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const save = () => {
    const v = validateNonEmpty(value);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    onSave(v.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        className="border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
      />
      {error ? <div className="text-xs text-red-700">{error}</div> : null}
      <div className="flex gap-2">
        <button className="text-sm px-2 py-1 rounded bg-slate-900 text-white" onClick={save} aria-label="inline-save">
          Save
        </button>
        <button className="text-sm px-2 py-1 rounded bg-slate-200" onClick={onCancel} aria-label="inline-cancel">
          Cancel
        </button>
      </div>
    </div>
  );
}
