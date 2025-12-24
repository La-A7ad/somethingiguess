import React from "react";
import { render, fireEvent } from "@testing-library/react";
import Card from "./Card.jsx";
import { BoardContext } from "../context/BoardProvider.jsx";
import { ACTIONS } from "../context/boardReducer.js";

test("card dispatches open on Enter", () => {
  const state = {
    lists: { byId: { l1: { id: "l1", title: "A", archived: false, cardIds: ["c1"] } }, allIds: ["l1"] },
    cards: { byId: { c1: { id: "c1", listId: "l1", title: "Hello", tags: [] } } },
    ui: { selectedCardId: null, mergeConflict: null, error: null, isSyncing: false, forceOffline: false },
    sync: { queue: [], lastSyncAt: null },
    undo: { past: [], future: [] },
  };
  const dispatch = jest.fn();
  const offlineSync = { flushQueue: jest.fn(), resolveMerge: jest.fn() };

  const { getByLabelText } = render(
    <BoardContext.Provider value={{ state, dispatch, offlineSync }}>
      <Card cardId="c1" listId="l1" index={0} onDropAt={() => {}} />
    </BoardContext.Provider>
  );

  const el = getByLabelText("card-c1");
  fireEvent.keyDown(el, { key: "Enter" });

  expect(dispatch).toHaveBeenCalledWith({ type: ACTIONS.UI_OPEN_CARD, payload: "c1" });
});
