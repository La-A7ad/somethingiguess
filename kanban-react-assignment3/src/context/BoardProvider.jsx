import React, { createContext, useEffect, useMemo, useReducer } from "react";
import { boardReducer, initialState } from "./boardReducer.js";
import { loadJson, saveJson, STORAGE_KEYS } from "../services/storage.js";
import useOfflineSync from "../hooks/useOfflineSync.js";

export const BoardContext = createContext(null);

function loadInitial() {
  const persisted = loadJson(STORAGE_KEYS.BOARD, null);
  const queue = loadJson(STORAGE_KEYS.QUEUE, []);
  if (!persisted) return { ...initialState, sync: { ...initialState.sync, queue } };
  return {
    ...initialState,
    lists: persisted.lists || initialState.lists,
    cards: persisted.cards || initialState.cards,
    ui: { ...initialState.ui, ...(persisted.ui || {}) },
    sync: { ...initialState.sync, ...(persisted.sync || {}), queue },
    undo: persisted.undo || initialState.undo,
  };
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, loadInitial);

  const offlineSync = useOfflineSync(state, dispatch);

  // persist board + queue
  useEffect(() => {
    saveJson(STORAGE_KEYS.BOARD, {
      lists: state.lists,
      cards: state.cards,
      ui: state.ui,
      sync: { lastSyncAt: state.sync.lastSyncAt },
      undo: state.undo,
    });
    saveJson(STORAGE_KEYS.QUEUE, state.sync.queue);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, offlineSync }), [state, dispatch, offlineSync]);
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
