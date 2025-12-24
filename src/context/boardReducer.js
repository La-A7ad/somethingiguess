import { nowIso } from "../utils/helpers.js";

export const ACTIONS = {
  HYDRATE: "HYDRATE",
  LIST_ADD: "LIST_ADD",
  LIST_RENAME: "LIST_RENAME",
  LIST_ARCHIVE: "LIST_ARCHIVE",
  CARD_ADD: "CARD_ADD",
  CARD_UPDATE: "CARD_UPDATE",
  CARD_DELETE: "CARD_DELETE",
  CARD_MOVE: "CARD_MOVE",
  UI_OPEN_CARD: "UI_OPEN_CARD",
  UI_CLOSE_MODAL: "UI_CLOSE_MODAL",
  UI_CLEAR_ERROR: "UI_CLEAR_ERROR",
  UI_FORCE_OFFLINE: "UI_FORCE_OFFLINE",
  SYNC_ENQUEUE: "SYNC_ENQUEUE",
  SYNC_DEQUEUE: "SYNC_DEQUEUE",
  SYNC_SET_STATUS: "SYNC_SET_STATUS",
  SYNC_APPLY_SERVER: "SYNC_APPLY_SERVER",
  MERGE_REQUIRED: "MERGE_REQUIRED",
  MERGE_CLEAR: "MERGE_CLEAR",
  UNDO_PUSH: "UNDO_PUSH",
  UNDO: "UNDO",
  REDO: "REDO",
};

export const initialState = {
  lists: { byId: {}, allIds: [] },
  cards: { byId: {} },
  ui: {
    selectedCardId: null,
    mergeConflict: null,
    error: null,
    isSyncing: false,
    forceOffline: false,
  },
  sync: { queue: [], lastSyncAt: null },
  undo: { past: [], future: [] }, // snapshots of {lists, cards}
};

function bump(entity) {
  return { ...entity, version: (entity.version || 0) + 1, lastModifiedAt: nowIso() };
}

function snapshot(state) {
  return { lists: state.lists, cards: state.cards };
}

function applySnapshot(state, snap) {
  return { ...state, lists: snap.lists, cards: snap.cards };
}

function pushUndo(state) {
  const past = state.undo.past.concat([snapshot(state)]).slice(-30);
  return { ...state, undo: { past, future: [] } };
}

export function boardReducer(state, action) {
  switch (action.type) {
    case ACTIONS.HYDRATE:
      return { ...state, ...action.payload };

    case ACTIONS.UI_FORCE_OFFLINE:
      return { ...state, ui: { ...state.ui, forceOffline: Boolean(action.payload) } };

    case ACTIONS.UNDO_PUSH:
      return pushUndo(state);

    case ACTIONS.UNDO: {
      const past = state.undo.past.slice();
      if (past.length === 0) return state;
      const prev = past.pop();
      const future = [snapshot(state), ...state.undo.future].slice(0, 30);
      return { ...applySnapshot(state, prev), undo: { past, future } };
    }

    case ACTIONS.REDO: {
      const future = state.undo.future.slice();
      if (future.length === 0) return state;
      const next = future.shift();
      const past = state.undo.past.concat([snapshot(state)]).slice(-30);
      return { ...applySnapshot(state, next), undo: { past, future } };
    }

    case ACTIONS.LIST_ADD: {
      const nextList = bump({ ...action.payload.list, archived: false, cardIds: [] });
      return {
        ...state,
        lists: {
          byId: { ...state.lists.byId, [nextList.id]: nextList },
          allIds: state.lists.allIds.concat([nextList.id]),
        },
      };
    }

    case ACTIONS.LIST_RENAME: {
      const { id, title } = action.payload;
      const cur = state.lists.byId[id];
      if (!cur) return state;
      const next = bump({ ...cur, title });
      return { ...state, lists: { ...state.lists, byId: { ...state.lists.byId, [id]: next } } };
    }

    case ACTIONS.LIST_ARCHIVE: {
      const { id } = action.payload;
      const cur = state.lists.byId[id];
      if (!cur) return state;
      const next = bump({ ...cur, archived: true });
      return { ...state, lists: { ...state.lists, byId: { ...state.lists.byId, [id]: next } } };
    }

    case ACTIONS.CARD_ADD: {
      const card = bump(action.payload.card);
      const list = state.lists.byId[card.listId];
      if (!list) return state;
      const nextList = bump({ ...list, cardIds: (list.cardIds || []).concat([card.id]) });
      return {
        ...state,
        cards: { byId: { ...state.cards.byId, [card.id]: card } },
        lists: { ...state.lists, byId: { ...state.lists.byId, [nextList.id]: nextList } },
      };
    }

    case ACTIONS.CARD_UPDATE: {
      const { id, patch } = action.payload;
      const cur = state.cards.byId[id];
      if (!cur) return state;
      const next = bump({ ...cur, ...patch });
      return { ...state, cards: { byId: { ...state.cards.byId, [id]: next } } };
    }

    case ACTIONS.CARD_DELETE: {
      const { id } = action.payload;
      const card = state.cards.byId[id];
      if (!card) return state;
      const nextCards = { ...state.cards.byId };
      delete nextCards[id];

      const list = state.lists.byId[card.listId];
      const nextList = list ? bump({ ...list, cardIds: (list.cardIds || []).filter((c) => c !== id) }) : null;

      return {
        ...state,
        cards: { byId: nextCards },
        lists: nextList ? { ...state.lists, byId: { ...state.lists.byId, [nextList.id]: nextList } } : state.lists,
        ui: state.ui.selectedCardId === id ? { ...state.ui, selectedCardId: null } : state.ui,
      };
    }

    case ACTIONS.CARD_MOVE: {
      const { cardId, fromListId, toListId, toIndex } = action.payload;
      const card = state.cards.byId[cardId];
      const from = state.lists.byId[fromListId];
      const to = state.lists.byId[toListId];
      if (!card || !from || !to) return state;

      const fromIds = (from.cardIds || []).filter((id) => id !== cardId);
      const baseToIds = toListId === fromListId ? fromIds : (to.cardIds || []).slice();
      const idx = Math.max(0, Math.min(Number(toIndex), baseToIds.length));
      const toIds = baseToIds.slice();
      toIds.splice(idx, 0, cardId);

      const nextFrom = bump({ ...from, cardIds: toListId === fromListId ? toIds : fromIds });
      const nextTo = toListId === fromListId ? nextFrom : bump({ ...to, cardIds: toIds });
      const nextCard = bump({ ...card, listId: toListId });

      return {
        ...state,
        cards: { byId: { ...state.cards.byId, [cardId]: nextCard } },
        lists: {
          ...state.lists,
          byId: { ...state.lists.byId, [nextFrom.id]: nextFrom, [nextTo.id]: nextTo },
        },
      };
    }

    case ACTIONS.UI_OPEN_CARD:
      return { ...state, ui: { ...state.ui, selectedCardId: action.payload } };

    case ACTIONS.UI_CLOSE_MODAL:
      return { ...state, ui: { ...state.ui, selectedCardId: null, mergeConflict: null } };

    case ACTIONS.UI_CLEAR_ERROR:
      return { ...state, ui: { ...state.ui, error: null } };

    case ACTIONS.SYNC_ENQUEUE:
      return { ...state, sync: { ...state.sync, queue: state.sync.queue.concat([action.payload]) } };

    case ACTIONS.SYNC_DEQUEUE:
      return { ...state, sync: { ...state.sync, queue: state.sync.queue.filter((o) => o.id !== action.payload.opId) } };

    case ACTIONS.SYNC_SET_STATUS: {
      const { isSyncing, error, lastSyncAt } = action.payload;
      return {
        ...state,
        ui: { ...state.ui, isSyncing: Boolean(isSyncing), error: error || null },
        sync: { ...state.sync, lastSyncAt: lastSyncAt || state.sync.lastSyncAt },
      };
    }

    case ACTIONS.SYNC_APPLY_SERVER:
      return {
        ...state,
        lists: action.payload.serverState.lists,
        cards: action.payload.serverState.cards,
        sync: { ...state.sync, lastSyncAt: nowIso() },
      };

    case ACTIONS.MERGE_REQUIRED:
      return { ...state, ui: { ...state.ui, mergeConflict: action.payload } };

    case ACTIONS.MERGE_CLEAR:
      return { ...state, ui: { ...state.ui, mergeConflict: null } };

    default:
      return state;
  }
}
