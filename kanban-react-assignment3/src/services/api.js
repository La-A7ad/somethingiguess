import { setupWorker, rest } from "msw";
import { STORAGE_KEYS, loadJson, saveJson } from "./storage.js";
import { nowIso } from "../utils/helpers.js";

const defaultServerState = {
  lists: { byId: {}, allIds: [] },
  cards: { byId: {} },
  meta: { updatedAt: nowIso() },
};

const defaultControls = { delayMs: 250, failRate: 0, failNext: false };

function getControls() {
  return loadJson(STORAGE_KEYS.SERVER_CONTROLS, defaultControls);
}
function setControls(next) {
  saveJson(STORAGE_KEYS.SERVER_CONTROLS, next);
}

function withDelay() {
  const { delayMs } = getControls();
  return new Promise((r) => setTimeout(r, Number(delayMs) || 0));
}

function shouldFail() {
  const c = getControls();
  if (c.failNext) {
    setControls({ ...c, failNext: false });
    return true;
  }
  return Math.random() < (Number(c.failRate) || 0);
}

function loadServerState() {
  return loadJson(STORAGE_KEYS.SERVER, defaultServerState);
}
function saveServerState(state) {
  state.meta = { updatedAt: nowIso() };
  saveJson(STORAGE_KEYS.SERVER, state);
}

function bump(entity) {
  return { ...entity, version: (entity.version || 0) + 1, lastModifiedAt: nowIso() };
}

function conflict(res, ctx, entityType, id, serverEntity) {
  return res(
    ctx.status(409),
    ctx.json({ error: "conflict", entityType, id, serverEntity })
  );
}

const handlers = [
  rest.get("/api/state", async (_req, res, ctx) => {
    await withDelay();
    return res(ctx.status(200), ctx.json(loadServerState()));
  }),

  rest.post("/api/lists", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { list } = await req.json();
    const state = loadServerState();
    const next = bump({ ...list, archived: false, cardIds: list.cardIds || [] });
    state.lists.byId[next.id] = next;
    if (!state.lists.allIds.includes(next.id)) state.lists.allIds.push(next.id);
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ list: next }));
  }),

  rest.put("/api/lists/:id", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { id } = req.params;
    const { patch, baseVersion } = await req.json();
    const state = loadServerState();
    const current = state.lists.byId[id];
    if (!current) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((current.version || 0) > (baseVersion || 0)) return conflict(res, ctx, "list", id, current);

    const next = bump({ ...current, ...patch });
    state.lists.byId[id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ list: next }));
  }),

  rest.post("/api/cards", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { card } = await req.json();
    const state = loadServerState();
    const next = bump(card);
    state.cards.byId[next.id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ card: next }));
  }),

  rest.put("/api/cards/:id", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { id } = req.params;
    const { patch, baseVersion } = await req.json();
    const state = loadServerState();
    const current = state.cards.byId[id];
    if (!current) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((current.version || 0) > (baseVersion || 0)) return conflict(res, ctx, "card", id, current);

    const next = bump({ ...current, ...patch });
    state.cards.byId[id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ card: next }));
  }),

  rest.put("/api/cards/:id/force", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { id } = req.params;
    const { card } = await req.json();
    const state = loadServerState();
    const current = state.cards.byId[id] || card;
    const next = bump({ ...current, ...card, id });
    state.cards.byId[id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ card: next }));
  }),

  rest.delete("/api/cards/:id", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { id } = req.params;
    const state = loadServerState();
    delete state.cards.byId[id];
    // remove from lists
    for (const listId of state.lists.allIds) {
      const l = state.lists.byId[listId];
      if (!l) continue;
      if ((l.cardIds || []).includes(id)) {
        l.cardIds = (l.cardIds || []).filter((c) => c !== id);
        state.lists.byId[listId] = bump(l);
      }
    }
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),

  rest.put("/api/move", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail()) return res(ctx.status(500), ctx.json({ error: "server_failure" }));
    const { cardId, fromListId, toListId, toIndex, baseCardVersion } = await req.json();
    const state = loadServerState();
    const card = state.cards.byId[cardId];
    if (!card) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((card.version || 0) > (baseCardVersion || 0)) return conflict(res, ctx, "card", cardId, card);

    const from = state.lists.byId[fromListId];
    const to = state.lists.byId[toListId];
    if (!from || !to) return res(ctx.status(404), ctx.json({ error: "not_found" }));

    from.cardIds = (from.cardIds || []).filter((id) => id !== cardId);
    const nextTo = (to.cardIds || []).slice();
    const idx = Math.max(0, Math.min(Number(toIndex), nextTo.length));
    nextTo.splice(idx, 0, cardId);
    to.cardIds = nextTo;

    state.lists.byId[fromListId] = bump(from);
    state.lists.byId[toListId] = bump(to);
    state.cards.byId[cardId] = bump({ ...card, listId: toListId });

    saveServerState(state);
    return res(
      ctx.status(200),
      ctx.json({
        card: state.cards.byId[cardId],
        fromList: state.lists.byId[fromListId],
        toList: state.lists.byId[toListId],
      })
    );
  }),

  rest.post("/api/server-controls", async (req, res, ctx) => {
    const { patch } = await req.json();
    const next = { ...getControls(), ...patch };
    setControls(next);
    return res(ctx.status(200), ctx.json({ controls: next }));
  }),

  rest.post("/api/reset-server", async (_req, res, ctx) => {
    saveServerState(defaultServerState);
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),
];

let started = false;

function startFallbackMockServer() {
  if (typeof window === "undefined") return;
  if (window.__KANBAN_FETCH_PATCHED__) return;

  const originalFetch = window.fetch.bind(window);

  const json = (status, data, headers = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const readBody = async (init) => {
    const body = init?.body;
    if (!body) return null;
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
    return null;
  };

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    // Simulate latency/failure using current controls stored on the "server"
    const state = loadServerState();
    if (state.serverControls?.delayMs) await sleep(state.serverControls.delayMs);
    if (Math.random() < (state.serverControls?.failRate || 0)) {
      return json(500, { error: "Forced server failure" });
    }

    const method = (init.method || "GET").toUpperCase();
    const path = url.pathname.replace(/^\/api\//, "");
    const parts = path.split("/").filter(Boolean);
    const body = await readBody(init);

    try {
      // GET /api/state
      if (method === "GET" && parts[0] === "state") {
        const { lists, cards } = loadServerState();
        return json(200, { lists, cards });
      }

      // POST /api/lists
      if (method === "POST" && parts[0] === "lists" && parts.length === 1) {
        const st = loadServerState();
        const list = body.list;
        if (!list.id) list.id = nanoid();
        st.lists.byId[list.id] = { ...list };
        st.lists.allIds = Array.from(new Set([...st.lists.allIds, list.id]));
        st.lists.versionById[list.id] = bump(st.lists.versionById[list.id]);
        saveServerState(st);
        return json(200, { ok: true, list: { ...st.lists.byId[list.id], version: st.lists.versionById[list.id] } });
      }

      // PUT /api/lists/:id
      if (method === "PUT" && parts[0] === "lists" && parts.length === 2) {
        const id = parts[1];
        const st = loadServerState();
        const baseVersion = body.baseVersion ?? 0;
        const currentVersion = st.lists.versionById[id] ?? 0;
        if (baseVersion !== currentVersion) {
          const serverList = st.lists.byId[id];
          return json(409, { error: "Version conflict", server: { ...serverList, version: currentVersion } });
        }
        st.lists.byId[id] = { ...st.lists.byId[id], ...body.patch };
        st.lists.versionById[id] = bump(currentVersion);
        saveServerState(st);
        return json(200, { ok: true, list: { ...st.lists.byId[id], version: st.lists.versionById[id] } });
      }

      // POST /api/cards
      if (method === "POST" && parts[0] === "cards" && parts.length === 1) {
        const st = loadServerState();
        const card = body.card;
        if (!card.id) card.id = nanoid();
        st.cards.byId[card.id] = { ...card };
        st.cards.versionById[card.id] = bump(st.cards.versionById[card.id]);
        // ensure in list
        const list = st.lists.byId[card.listId];
        if (list) {
          const ids = new Set(list.cardIds || []);
          ids.add(card.id);
          list.cardIds = Array.from(ids);
        }
        saveServerState(st);
        return json(200, { ok: true, card: { ...st.cards.byId[card.id], version: st.cards.versionById[card.id] } });
      }

      // PUT /api/cards/:id
      if (method === "PUT" && parts[0] === "cards" && parts.length === 2) {
        const id = parts[1];
        const st = loadServerState();
        const baseVersion = body.baseVersion ?? 0;
        const currentVersion = st.cards.versionById[id] ?? 0;
        if (baseVersion !== currentVersion) {
          const serverCard = st.cards.byId[id];
          return json(409, { error: "Version conflict", server: { ...serverCard, version: currentVersion } });
        }
        st.cards.byId[id] = { ...st.cards.byId[id], ...body.patch };
        st.cards.versionById[id] = bump(currentVersion);
        saveServerState(st);
        return json(200, { ok: true, card: { ...st.cards.byId[id], version: st.cards.versionById[id] } });
      }

      // PUT /api/cards/:id/force
      if (method === "PUT" && parts[0] === "cards" && parts[2] === "force") {
        const id = parts[1];
        const st = loadServerState();
        st.cards.byId[id] = { ...body.card, id };
        st.cards.versionById[id] = bump(st.cards.versionById[id]);
        saveServerState(st);
        return json(200, { ok: true, card: { ...st.cards.byId[id], version: st.cards.versionById[id] } });
      }

      // DELETE /api/cards/:id
      if (method === "DELETE" && parts[0] === "cards" && parts.length === 2) {
        const id = parts[1];
        const st = loadServerState();
        const card = st.cards.byId[id];
        if (card) {
          const list = st.lists.byId[card.listId];
          if (list) list.cardIds = (list.cardIds || []).filter((x) => x !== id);
        }
        delete st.cards.byId[id];
        delete st.cards.versionById[id];
        saveServerState(st);
        return json(200, { ok: true });
      }

      // PUT /api/move
      if (method === "PUT" && parts[0] === "move") {
        const st = loadServerState();
        const { cardId, fromListId, toListId, toIndex } = body;
        const from = st.lists.byId[fromListId];
        const to = st.lists.byId[toListId];
        if (!from || !to) return json(400, { error: "Invalid list" });
        from.cardIds = (from.cardIds || []).filter((id) => id !== cardId);
        const next = [...(to.cardIds || [])];
        const idx = Math.max(0, Math.min(toIndex ?? next.length, next.length));
        next.splice(idx, 0, cardId);
        to.cardIds = next;
        if (st.cards.byId[cardId]) st.cards.byId[cardId].listId = toListId;
        saveServerState(st);
        return json(200, { ok: true });
      }

      // POST /api/server-controls
      if (method === "POST" && parts[0] === "server-controls") {
        const st = loadServerState();
        st.serverControls = { ...st.serverControls, ...(body || {}) };
        saveServerState(st);
        return json(200, { ok: true });
      }

      // POST /api/reset-server
      if (method === "POST" && parts[0] === "reset-server") {
        saveServerState(defaultServerState);
        return json(200, { ok: true });
      }

      return json(404, { error: "Not found" });
    } catch (e) {
      return json(500, { error: e?.message || "Server error" });
    }
  };

  window.__KANBAN_FETCH_PATCHED__ = true;
}

export function startMockServer() {
  if (started) return;
  if (typeof window === "undefined") return;

  try {
    const worker = setupWorker(...handlers);
    const startPromise = worker.start({ onUnhandledRequest: "bypass" });
    Promise.resolve(startPromise).catch((err) => {
      // MSW can't start (e.g., missing/invalid service worker). Fall back to a fetch patch
      console.warn("[mock] MSW failed to start, using fallback mock server.", err);
      startFallbackMockServer();
    });
  } catch (err) {
    console.warn("[mock] MSW init failed, using fallback mock server.", err);
    startFallbackMockServer();
  }

  started = true;
}


async function request(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || "request_failed");
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export const api = {
  getState: () => request("/api/state"),
  createList: (list) => request("/api/lists", { method: "POST", body: JSON.stringify({ list }) }),
  updateList: (id, patch, baseVersion) =>
    request(`/api/lists/${id}`, { method: "PUT", body: JSON.stringify({ patch, baseVersion }) }),
  createCard: (card) => request("/api/cards", { method: "POST", body: JSON.stringify({ card }) }),
  updateCard: (id, patch, baseVersion) =>
    request(`/api/cards/${id}`, { method: "PUT", body: JSON.stringify({ patch, baseVersion }) }),
  forceCard: (id, card) => request(`/api/cards/${id}/force`, { method: "PUT", body: JSON.stringify({ card }) }),
  deleteCard: (id) => request(`/api/cards/${id}`, { method: "DELETE" }),
  moveCard: (payload) => request("/api/move", { method: "PUT", body: JSON.stringify(payload) }),
  setServerControls: (patch) => request("/api/server-controls", { method: "POST", body: JSON.stringify({ patch }) }),
  resetServer: () => request("/api/reset-server", { method: "POST" }),
};
