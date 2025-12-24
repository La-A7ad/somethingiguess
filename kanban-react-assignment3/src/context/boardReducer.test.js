import { boardReducer, initialState, ACTIONS } from "./boardReducer.js";

function reduce(state, action) {
  return boardReducer(state, action);
}

test("add list and rename", () => {
  const s1 = reduce(initialState, { type: ACTIONS.LIST_ADD, payload: { list: { id: "l1", title: "A" } } });
  expect(s1.lists.allIds).toEqual(["l1"]);
  expect(s1.lists.byId.l1.title).toBe("A");

  const s2 = reduce(s1, { type: ACTIONS.LIST_RENAME, payload: { id: "l1", title: "B" } });
  expect(s2.lists.byId.l1.title).toBe("B");
});

test("add card and move within list", () => {
  let s = reduce(initialState, { type: ACTIONS.LIST_ADD, payload: { list: { id: "l1", title: "A" } } });
  s = reduce(s, { type: ACTIONS.CARD_ADD, payload: { card: { id: "c1", listId: "l1", title: "T", description: "", tags: [] } } });
  s = reduce(s, { type: ACTIONS.CARD_ADD, payload: { card: { id: "c2", listId: "l1", title: "T2", description: "", tags: [] } } });

  expect(s.lists.byId.l1.cardIds).toEqual(["c1", "c2"]);

  s = reduce(s, { type: ACTIONS.CARD_MOVE, payload: { cardId: "c2", fromListId: "l1", toListId: "l1", toIndex: 0 } });
  expect(s.lists.byId.l1.cardIds[0]).toBe("c2");
});

test("undo/redo restores snapshots", () => {
  let s = reduce(initialState, { type: ACTIONS.LIST_ADD, payload: { list: { id: "l1", title: "A" } } });
  s = reduce(s, { type: ACTIONS.UNDO_PUSH });
  s = reduce(s, { type: ACTIONS.LIST_RENAME, payload: { id: "l1", title: "B" } });
  expect(s.lists.byId.l1.title).toBe("B");

  s = reduce(s, { type: ACTIONS.UNDO });
  expect(s.lists.byId.l1.title).toBe("A");

  s = reduce(s, { type: ACTIONS.REDO });
  expect(s.lists.byId.l1.title).toBe("B");
});
