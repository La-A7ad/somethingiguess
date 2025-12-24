import { useContext, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { BoardContext } from "../context/BoardProvider.jsx";
import { ACTIONS } from "../context/boardReducer.js";
import { nowIso, deepClone } from "../utils/helpers.js";
import { validateNonEmpty, validateTags } from "../utils/validators.js";

function makeOp(type, payload, base) {
  return { id: uuidv4(), type, payload, base, createdAt: nowIso() };
}

export default function useBoardState() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("BoardContext missing");
  const { state, dispatch, offlineSync } = ctx;

  const actions = useMemo(() => {
    return {
      addList(title) {
        const v = validateNonEmpty(title);
        if (!v.ok) return v;
        dispatch({ type: ACTIONS.UNDO_PUSH });
        const id = uuidv4();
        const list = { id, title: v.value, archived: false, cardIds: [], version: 0, lastModifiedAt: nowIso() };
        dispatch({ type: ACTIONS.LIST_ADD, payload: { list } });
        dispatch({ type: ACTIONS.SYNC_ENQUEUE, payload: makeOp("list.create", { list }, { baseVersion: 0 }) });
        return { ok: true };
      },

      renameList(id, title) {
        const v = validateNonEmpty(title);
        if (!v.ok) return v;
        const current = state.lists.byId[id];
        if (!current) return { ok: false, message: "List not found" };

        dispatch({ type: ACTIONS.UNDO_PUSH });
        dispatch({ type: ACTIONS.LIST_RENAME, payload: { id, title: v.value } });
        dispatch({
          type: ACTIONS.SYNC_ENQUEUE,
          payload: makeOp("list.update", { id, patch: { title: v.value }, baseVersion: current.version || 0 }, { base: deepClone(current) }),
        });
        return { ok: true };
      },

      archiveList(id) {
        const current = state.lists.byId[id];
        if (!current) return;
        dispatch({ type: ACTIONS.UNDO_PUSH });
        dispatch({ type: ACTIONS.LIST_ARCHIVE, payload: { id } });
        dispatch({
          type: ACTIONS.SYNC_ENQUEUE,
          payload: makeOp("list.update", { id, patch: { archived: true }, baseVersion: current.version || 0 }, { base: deepClone(current) }),
        });
      },

      addCard(listId, title) {
        const v = validateNonEmpty(title);
        if (!v.ok) return v;
        const list = state.lists.byId[listId];
        if (!list) return { ok: false, message: "List not found" };

        dispatch({ type: ACTIONS.UNDO_PUSH });
        const id = uuidv4();
        const card = { id, listId, title: v.value, description: "", tags: [], version: 0, lastModifiedAt: nowIso() };
        dispatch({ type: ACTIONS.CARD_ADD, payload: { card } });
        dispatch({ type: ACTIONS.SYNC_ENQUEUE, payload: makeOp("card.create", { card }, { baseVersion: 0 }) });
        return { ok: true, id };
      },

      updateCard(id, patch) {
        const current = state.cards.byId[id];
        if (!current) return { ok: false, message: "Card not found" };

        const nextPatch = { ...patch };
        if ("title" in nextPatch) {
          const v = validateNonEmpty(nextPatch.title);
          if (!v.ok) return v;
          nextPatch.title = v.value;
        }
        if ("tags" in nextPatch) {
          const v = validateTags(nextPatch.tags);
          if (!v.ok) return v;
          nextPatch.tags = v.value;
        }

        dispatch({ type: ACTIONS.UNDO_PUSH });
        dispatch({ type: ACTIONS.CARD_UPDATE, payload: { id, patch: nextPatch } });
        dispatch({
          type: ACTIONS.SYNC_ENQUEUE,
          payload: makeOp("card.update", { id, patch: nextPatch, baseVersion: current.version || 0 }, { base: deepClone(current) }),
        });
        return { ok: true };
      },

      deleteCard(id) {
        const current = state.cards.byId[id];
        if (!current) return;
        dispatch({ type: ACTIONS.UNDO_PUSH });
        dispatch({ type: ACTIONS.CARD_DELETE, payload: { id } });
        dispatch({ type: ACTIONS.SYNC_ENQUEUE, payload: makeOp("card.delete", { id, baseVersion: current.version || 0 }, { base: deepClone(current) }) });
      },

      moveCard(cardId, fromListId, toListId, toIndex) {
        const current = state.cards.byId[cardId];
        if (!current) return;
        dispatch({ type: ACTIONS.UNDO_PUSH });
        dispatch({ type: ACTIONS.CARD_MOVE, payload: { cardId, fromListId, toListId, toIndex } });
        dispatch({ type: ACTIONS.SYNC_ENQUEUE, payload: makeOp("card.move", { cardId, fromListId, toListId, toIndex, baseCardVersion: current.version || 0 }, { base: deepClone(current) }) });
      },

      openCard(id) {
        dispatch({ type: ACTIONS.UI_OPEN_CARD, payload: id });
      },
      closeModal() {
        dispatch({ type: ACTIONS.UI_CLOSE_MODAL });
      },

      undo() {
        dispatch({ type: ACTIONS.UNDO });
      },
      redo() {
        dispatch({ type: ACTIONS.REDO });
      },

      setForceOffline(enabled) {
        dispatch({ type: ACTIONS.UI_FORCE_OFFLINE, payload: enabled });
      },

      clearError() {
        dispatch({ type: ACTIONS.UI_CLEAR_ERROR });
      },

      syncNow() {
        offlineSync.flushQueue();
      },
    };
  }, [dispatch, offlineSync, state.cards.byId, state.lists.byId, state.lists.allIds]);

  return { state, dispatch, offlineSync, actions };
}
