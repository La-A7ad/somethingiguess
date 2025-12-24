import React, { useState } from "react";
import useBoardState from "../hooks/useBoardState.js";
import { api } from "../services/api.js";
import { seed500 } from "../utils/seed.js";

export default function Toolbar() {
  const { state, actions } = useBoardState();
  const [title, setTitle] = useState("");
  const [delayMs, setDelayMs] = useState(250);
  const [failRate, setFailRate] = useState(0);

  const add = () => {
    const r = actions.addList(title);
    if (r.ok) setTitle("");
  };

  const applyControls = async () => {
    await api.setServerControls({ delayMs: Number(delayMs) || 0, failRate: Number(failRate) || 0 });
  };

  return (
    <div className="border-b bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">New list title</span>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New list title"
            aria-label="new-list-title"
          />
        </label>
        <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={add} aria-label="add-list">
          Add List
        </button>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.ui.forceOffline}
            onChange={(e) => actions.setForceOffline(e.target.checked)}
            aria-label="force-offline"
          />
          Force offline
        </label>

        <button
          className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm"
          onClick={() => {
            seed500();
            window.location.reload();
          }}
          aria-label="seed-500"
        >
          Seed 500+
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-600">Server controls</div>
          <label className="text-sm">
            <span className="sr-only">Delay ms</span>
            <input className="border rounded px-2 py-1 w-24 text-sm" value={delayMs} onChange={(e) => setDelayMs(e.target.value)} aria-label="delay-ms" />
          </label>
          <label className="text-sm">
            <span className="sr-only">Fail rate</span>
            <input className="border rounded px-2 py-1 w-20 text-sm" value={failRate} onChange={(e) => setFailRate(e.target.value)} aria-label="fail-rate" />
          </label>
          <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" onClick={applyControls} aria-label="apply-server-controls">
            Apply
          </button>
          <button className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm" onClick={() => api.setServerControls({ failNext: true })} aria-label="fail-next">
            Fail next
          </button>
          <button className="px-3 py-1.5 rounded bg-rose-700 text-white text-sm" onClick={() => api.resetServer()} aria-label="reset-server">
            Reset server
          </button>
        </div>
      </div>
    </div>
  );
}
