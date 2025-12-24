import { useCallback, useEffect, useRef } from "react";
import { ACTIONS } from "../context/boardReducer.js";
import { api } from "../services/api.js";
import { stableJson, nowIso } from "../utils/helpers.js";

function threeWayMerge(base, local, server, fields) {
  const merged = { ...server };
  const conflicts = [];
  const eq = (x, y) => stableJson(x) === stableJson(y);

  for (const f of fields) {
    const b = base?.[f];
    const l = local?.[f];
    const s = server?.[f];

    if (eq(l, s)) {
      merged[f] = l;
      continue;
    }
    if (eq(l, b) && !eq(s, b)) {
      merged[f] = s;
      continue;
    }
    if (eq(s, b) && !eq(l, b)) {
      merged[f] = l;
      continue;
    }
    if (eq(l, b) && eq(s, b)) {
      merged[f] = b;
      continue;
    }
    conflicts.push(f);
  }

  return { merged, conflicts };
}

export default function useOfflineSync(state, dispatch) {
  const syncingRef = useRef(false);

  const isOnline = useCallback(() => {
    if (state.ui.forceOffline) return false;
    return typeof navigator === "undefined" ? true : navigator.onLine;
  }, [state.ui.forceOffline]);

  const fetchAndApplyServer = useCallback(async () => {
    const serverState = await api.getState();
    dispatch({ type: ACTIONS.SYNC_APPLY_SERVER, payload: { serverState } });
  }, [dispatch]);

  const processOp = useCallback(async (op) => {
    if (op.type === "list.create") return api.createList(op.payload.list);
    if (op.type === "list.update") return api.updateList(op.payload.id, op.payload.patch, op.payload.baseVersion);
    if (op.type === "card.create") return api.createCard(op.payload.card);
    if (op.type === "card.update") return api.updateCard(op.payload.id, op.payload.patch, op.payload.baseVersion);
    if (op.type === "card.delete") return api.deleteCard(op.payload.id);
    if (op.type === "card.move") return api.moveCard(op.payload);
    return { ok: true };
  }, []);

  const handleConflict = useCallback(async (op, conflictPayload) => {
    const { entityType, id, serverEntity } = conflictPayload;

    if (entityType === "card") {
      const local = state.cards.byId[id];
      const base = op.base?.base || null;

      const { merged, conflicts } = threeWayMerge(base, local, serverEntity, [
        "title",
        "description",
        "tags",
        "listId",
      ]);

      if (conflicts.length === 0) {
        await api.forceCard(id, merged);
        dispatch({ type: ACTIONS.SYNC_DEQUEUE, payload: { opId: op.id } });
        return { autoResolved: true };
      }

      dispatch({
        type: ACTIONS.MERGE_REQUIRED,
        payload: { kind: "card", opId: op.id, id, base, local, server: serverEntity, conflicts },
      });
      return { awaitingUser: true };
    }

    // list conflicts: require user choice (title/archived)
    const local = state.lists.byId[id];
    const base = op.base?.base || null;
    dispatch({
      type: ACTIONS.MERGE_REQUIRED,
      payload: { kind: "list", opId: op.id, id, base, local, server: serverEntity, conflicts: ["title", "archived"] },
    });
    return { awaitingUser: true };
  }, [dispatch, state.cards.byId, state.lists.byId]);

  const flushQueue = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnline()) return;
    if (state.ui.mergeConflict) return;
    if (state.sync.queue.length === 0) return;

    syncingRef.current = true;
    dispatch({ type: ACTIONS.SYNC_SET_STATUS, payload: { isSyncing: true, error: null } });

    try {
      for (const op of state.sync.queue) {
        if (state.ui.mergeConflict) break;
        try {
          await processOp(op);
          dispatch({ type: ACTIONS.SYNC_DEQUEUE, payload: { opId: op.id } });
        } catch (e) {
          if (e?.status === 409 && e.payload?.error === "conflict") {
            const r = await handleConflict(op, e.payload);
            if (r?.awaitingUser) {
              dispatch({ type: ACTIONS.SYNC_SET_STATUS, payload: { isSyncing: false, error: null } });
              syncingRef.current = false;
              return;
            }
            continue;
          }

          // failure: revert by re-applying server state + show error
          await fetchAndApplyServer().catch(() => {});
          dispatch({ type: ACTIONS.SYNC_SET_STATUS, payload: { isSyncing: false, error: String(e.message || e) } });
          syncingRef.current = false;
          return;
        }
      }

      await fetchAndApplyServer();
      dispatch({ type: ACTIONS.SYNC_SET_STATUS, payload: { isSyncing: false, error: null, lastSyncAt: nowIso() } });
    } catch (e) {
      dispatch({ type: ACTIONS.SYNC_SET_STATUS, payload: { isSyncing: false, error: String(e.message || e) } });
    } finally {
      syncingRef.current = false;
    }
  }, [dispatch, fetchAndApplyServer, handleConflict, isOnline, processOp, state.sync.queue, state.ui.mergeConflict]);

  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => {
      flushQueue();
      if (isOnline()) fetchAndApplyServer().catch(() => {});
    }, 45000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [fetchAndApplyServer, flushQueue, isOnline]);

  const resolveMerge = useCallback(async (resolution) => {
    const c = state.ui.mergeConflict;
    if (!c) return;

    if (c.kind === "card") {
      const pick = (field) => (resolution[field] === "server" ? c.server[field] : c.local[field]);
      const merged = {
        ...c.server,
        title: pick("title"),
        description: pick("description"),
        tags: pick("tags"),
        listId: pick("listId"),
      };
      await api.forceCard(c.id, merged);
    } else {
      const patch = {
        title: resolution.title === "server" ? c.server.title : c.local.title,
        archived: resolution.archived === "server" ? c.server.archived : c.local.archived,
      };
      await api.updateList(c.id, patch, c.server.version || 0);
    }

    dispatch({ type: ACTIONS.MERGE_CLEAR });
    dispatch({ type: ACTIONS.SYNC_DEQUEUE, payload: { opId: c.opId } });
    await fetchAndApplyServer();
    flushQueue();
  }, [dispatch, fetchAndApplyServer, flushQueue, state.ui.mergeConflict]);

  return { flushQueue, resolveMerge };
}
