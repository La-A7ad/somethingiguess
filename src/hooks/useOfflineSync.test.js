import React from "react";
import { render, act } from "@testing-library/react";
import useOfflineSync from "./useOfflineSync.js";
import { ACTIONS, initialState } from "../context/boardReducer.js";

jest.mock("../services/api.js", () => {
  return {
    api: {
      getState: jest.fn(async () => ({ lists: { byId: {}, allIds: [] }, cards: { byId: {} } })),
      createList: jest.fn(async () => ({})),
      updateList: jest.fn(async () => ({})),
      createCard: jest.fn(async () => ({})),
      updateCard: jest.fn(async () => ({})),
      forceCard: jest.fn(async () => ({})),
      deleteCard: jest.fn(async () => ({})),
      moveCard: jest.fn(async () => ({})),
    },
  };
});

function Harness({ state, dispatch, onReady }) {
  const sync = useOfflineSync(state, dispatch);
  onReady(sync);
  return null;
}

test("flushQueue does nothing when offline", async () => {
  const state = {
    ...initialState,
    ui: { ...initialState.ui, forceOffline: true },
    sync: { ...initialState.sync, queue: [{ id: "1", type: "list.create", payload: { list: { id: "l1" } } }] },
  };
  const dispatch = jest.fn();
  let apiRef = null;

  render(<Harness state={state} dispatch={dispatch} onReady={(s) => (apiRef = s)} />);
  await act(async () => {
    await apiRef.flushQueue();
  });

  expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: ACTIONS.SYNC_SET_STATUS }));
});

test("resolveMerge clears merge and dequeues", async () => {
  const state = {
    ...initialState,
    ui: {
      ...initialState.ui,
      mergeConflict: {
        kind: "card",
        opId: "op1",
        id: "c1",
        local: { title: "L", description: "", tags: [], listId: "l1" },
        server: { title: "S", description: "", tags: [], listId: "l1", version: 2 },
        conflicts: ["title"],
      },
    },
    sync: { ...initialState.sync, queue: [{ id: "op1", type: "card.update", payload: { id: "c1" } }] },
    cards: { byId: { c1: { id: "c1", title: "L", listId: "l1", description: "", tags: [] } } },
  };
  const dispatch = jest.fn();
  let apiRef = null;

  render(<Harness state={state} dispatch={dispatch} onReady={(s) => (apiRef = s)} />);
  await act(async () => {
    await apiRef.resolveMerge({ title: "server" });
  });

  expect(dispatch).toHaveBeenCalledWith({ type: ACTIONS.MERGE_CLEAR });
  expect(dispatch).toHaveBeenCalledWith({ type: ACTIONS.SYNC_DEQUEUE, payload: { opId: "op1" } });
});
