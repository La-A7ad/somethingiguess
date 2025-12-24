// src/services/api.js
import { STORAGE_KEYS, loadJson, saveJson } from "./storage.js";
import { nowIso } from "../utils/helpers.js";

const IS_TEST =
  typeof process !== "undefined" && process.env?.NODE_ENV === "test";

function genId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

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
  return {
    ...entity,
    version: (entity.version || 0) + 1,
    lastModifiedAt: nowIso(),
  };
}

function conflict(res, ctx, entityType, id, serverEntity) {
  return res(
    ctx.status(409),
    ctx.json({ error: "conflict", entityType, id, serverEntity })
  );
}

/**
 * Build MSW handlers lazily (so Jest never imports MSW/browser-only stuff).
 */
const buildHandlers = (rest) => [
  rest.get("/api/state", async (_req, res, ctx) => {
    await withDelay();
    return res(ctx.status(200), ctx.json(loadServerState()));
  }),

  rest.post("/api/lists", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const body = await req.json().catch(() => ({}));
    const list = body?.list || {};
    const state = loadServerState();

    const next = bump({
      ...list,
      id: list.id || genId("list"),
      archived: false,
      cardIds: list.cardIds || [],
    });

    state.lists.byId[next.id] = next;
    if (!state.lists.allIds.includes(next.id)) state.lists.allIds.push(next.id);
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ list: next }));
  }),

  rest.put("/api/lists/:id", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const { id } = req.params;
    const { patch, baseVersion } = await req.json();
    const state = loadServerState();
    const current = state.lists.byId[id];

    if (!current) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((current.version || 0) > (baseVersion || 0))
      return conflict(res, ctx, "list", id, current);

    const next = bump({ ...current, ...patch });
    state.lists.byId[id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ list: next }));
  }),

  rest.post("/api/cards", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const body = await req.json().catch(() => ({}));
    const card = body?.card || {};
    const state = loadServerState();

    const next = bump({ ...card, id: card.id || genId("card") });
    state.cards.byId[next.id] = next;

    // ensure card exists in its list
    const list = state.lists.byId[next.listId];
    if (list) {
      const ids = new Set(list.cardIds || []);
      ids.add(next.id);
      list.cardIds = Array.from(ids);
      state.lists.byId[list.id] = bump(list);
    }

    saveServerState(state);
    return res(ctx.status(200), ctx.json({ card: next }));
  }),

  rest.put("/api/cards/:id", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const { id } = req.params;
    const { patch, baseVersion } = await req.json();
    const state = loadServerState();
    const current = state.cards.byId[id];

    if (!current) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((current.version || 0) > (baseVersion || 0))
      return conflict(res, ctx, "card", id, current);

    const next = bump({ ...current, ...patch });
    state.cards.byId[id] = next;
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ card: next }));
  }),

  rest.put("/api/cards/:id/force", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

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
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const { id } = req.params;
    const state = loadServerState();

    // remove from lists
    for (const listId of state.lists.allIds) {
      const l = state.lists.byId[listId];
      if (!l) continue;
      if ((l.cardIds || []).includes(id)) {
        l.cardIds = (l.cardIds || []).filter((c) => c !== id);
        state.lists.byId[listId] = bump(l);
      }
    }

    delete state.cards.byId[id];
    saveServerState(state);
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),

  rest.put("/api/move", async (req, res, ctx) => {
    await withDelay();
    if (shouldFail())
      return res(ctx.status(500), ctx.json({ error: "server_failure" }));

    const { cardId, fromListId, toListId, toIndex, baseCardVersion } =
      await req.json();

    const state = loadServerState();
    const card = state.cards.byId[cardId];

    if (!card) return res(ctx.status(404), ctx.json({ error: "not_found" }));
    if ((card.version || 0) > (baseCardVersion || 0))
      return conflict(res, ctx, "card", cardId, card);

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
    setControls(defaultControls);
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),
];

let started = false;

/**
 * Fallback mock "server" for when MSW fails to start:
 * patches window.fetch for /api/* routes.
 */
function startFallbackMockServer() {
  if (typeof window === "undefined") return;
  if (window.__KANBAN_FETCH_PATCHED__) return;

  const originalFetch = window.fetch.bind(window);

  const json = (status, data, headers = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });

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
    const url = new URL(
      typeof input === "string" ? input : input.url,
      window.location.origin
    );

    if (!url.pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    // simulate delay/fail using the same controls
    const { delayMs } = getControls();
    if (Number(delayMs) > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (shouldFail()) return json(500, { error: "server_failure" });

    const method = (init.method || "GET").toUpperCase();
    const path = url.pathname.replace(/^\/api\//, "");
    const parts = path.split("/").filter(Boolean);
    const body = await readBody(init);

    try {
      // GET /api/state
      if (method === "GET" && parts[0] === "state") {
        return json(200, loadServerState());
      }

      // POST /api/lists
      if (method === "POST" && parts[0] === "lists" && parts.length === 1) {
        const { list } = body || {};
        const state = loadServerState();
        const next = bump({
          ...(list || {}),
          id: list?.id || genId("list"),
          archived: false,
          cardIds: list?.cardIds || [],
        });
        state.lists.byId[next.id] = next;
        if (!state.lists.allIds.includes(next.id)) state.lists.allIds.push(next.id);
        saveServerState(state);
        return json(200, { list: next });
      }

      // PUT /api/lists/:id
      if (method === "PUT" && parts[0] === "lists" && parts.length === 2) {
        const id = parts[1];
        const { patch, baseVersion } = body || {};
        const state = loadServerState();
        const current = state.lists.byId[id];
        if (!current) return json(404, { error: "not_found" });
        if ((current.version || 0) > (baseVersion || 0)) {
          return json(409, {
            error: "conflict",
            entityType: "list",
            id,
            serverEntity: current,
          });
        }
        const next = bump({ ...current, ...(patch || {}) });
        state.lists.byId[id] = next;
        saveServerState(state);
        return json(200, { list: next });
      }

      // POST /api/cards
      if (method === "POST" && parts[0] === "cards" && parts.length === 1) {
        const { card } = body || {};
        const state = loadServerState();
        const next = bump({ ...(card || {}), id: card?.id || genId("card") });
        state.cards.byId[next.id] = next;

        const list = state.lists.byId[next.listId];
        if (list) {
          const ids = new Set(list.cardIds || []);
          ids.add(next.id);
          list.cardIds = Array.from(ids);
          state.lists.byId[list.id] = bump(list);
        }

        saveServerState(state);
        return json(200, { card: next });
      }

      // PUT /api/cards/:id
      if (method === "PUT" && parts[0] === "cards" && parts.length === 2) {
        const id = parts[1];
        const { patch, baseVersion } = body || {};
        const state = loadServerState();
        const current = state.cards.byId[id];
        if (!current) return json(404, { error: "not_found" });
        if ((current.version || 0) > (baseVersion || 0)) {
          return json(409, {
            error: "conflict",
            entityType: "card",
            id,
            serverEntity: current,
          });
        }
        const next = bump({ ...current, ...(patch || {}) });
        state.cards.byId[id] = next;
        saveServerState(state);
        return json(200, { card: next });
      }

      // PUT /api/cards/:id/force
      if (method === "PUT" && parts[0] === "cards" && parts[2] === "force") {
        const id = parts[1];
        const { card } = body || {};
        const state = loadServerState();
        const current = state.cards.byId[id] || card;
        const next = bump({ ...current, ...(card || {}), id });
        state.cards.byId[id] = next;
        saveServerState(state);
        return json(200, { card: next });
      }

      // DELETE /api/cards/:id
      if (method === "DELETE" && parts[0] === "cards" && parts.length === 2) {
        const id = parts[1];
        const state = loadServerState();

        for (const listId of state.lists.allIds) {
          const l = state.lists.byId[listId];
          if (!l) continue;
          if ((l.cardIds || []).includes(id)) {
            l.cardIds = (l.cardIds || []).filter((c) => c !== id);
            state.lists.byId[listId] = bump(l);
          }
        }

        delete state.cards.byId[id];
        saveServerState(state);
        return json(200, { ok: true });
      }

      // PUT /api/move
      if (method === "PUT" && parts[0] === "move") {
        const { cardId, fromListId, toListId, toIndex, baseCardVersion } =
          body || {};
        const state = loadServerState();
        const card = state.cards.byId[cardId];
        if (!card) return json(404, { error: "not_found" });
        if ((card.version || 0) > (baseCardVersion || 0)) {
          return json(409, {
            error: "conflict",
            entityType: "card",
            id: cardId,
            serverEntity: card,
          });
        }

        const from = state.lists.byId[fromListId];
        const to = state.lists.byId[toListId];
        if (!from || !to) return json(404, { error: "not_found" });

        from.cardIds = (from.cardIds || []).filter((id) => id !== cardId);

        const nextTo = (to.cardIds || []).slice();
        const idx = Math.max(0, Math.min(Number(toIndex), nextTo.length));
        nextTo.splice(idx, 0, cardId);
        to.cardIds = nextTo;

        state.lists.byId[fromListId] = bump(from);
        state.lists.byId[toListId] = bump(to);
        state.cards.byId[cardId] = bump({ ...card, listId: toListId });

        saveServerState(state);
        return json(200, {
          card: state.cards.byId[cardId],
          fromList: state.lists.byId[fromListId],
          toList: state.lists.byId[toListId],
        });
      }

      // POST /api/server-controls
      if (method === "POST" && parts[0] === "server-controls") {
        const { patch } = body || {};
        const next = { ...getControls(), ...patch };
        setControls(next);
        return json(200, { controls: next });
      }

      // POST /api/reset-server
      if (method === "POST" && parts[0] === "reset-server") {
        saveServerState(defaultServerState);
        setControls(defaultControls);
        return json(200, { ok: true });
      }

      return json(404, { error: "not_found" });
    } catch (e) {
      return json(500, { error: e?.message || "server_error" });
    }
  };

  window.__KANBAN_FETCH_PATCHED__ = true;
}

/**
 * Start MSW in the browser (dev). Jest will never import/execute MSW.
 * Call this once near app startup (e.g., in main.jsx).
 */
export async function startMockServer() {
  if (started) return;
  if (typeof window === "undefined") return;
  if (IS_TEST) return;

  const host = window.location?.hostname || "";
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  if (!isLocalhost) return;

  try {
    const { setupWorker, rest } = await import("msw");
    const worker = setupWorker(...buildHandlers(rest));

    const startPromise = worker.start({ onUnhandledRequest: "bypass" });
    Promise.resolve(startPromise).catch((err) => {
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
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
  createList: (list) =>
    request("/api/lists", { method: "POST", body: JSON.stringify({ list }) }),
  updateList: (id, patch, baseVersion) =>
    request(`/api/lists/${id}`, {
      method: "PUT",
      body: JSON.stringify({ patch, baseVersion }),
    }),
  createCard: (card) =>
    request("/api/cards", { method: "POST", body: JSON.stringify({ card }) }),
  updateCard: (id, patch, baseVersion) =>
    request(`/api/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify({ patch, baseVersion }),
    }),
  forceCard: (id, card) =>
    request(`/api/cards/${id}/force`, {
      method: "PUT",
      body: JSON.stringify({ card }),
    }),
  deleteCard: (id) => request(`/api/cards/${id}`, { method: "DELETE" }),
  moveCard: (payload) =>
    request("/api/move", { method: "PUT", body: JSON.stringify(payload) }),
  setServerControls: (patch) =>
    request("/api/server-controls", {
      method: "POST",
      body: JSON.stringify({ patch }),
    }),
  resetServer: () => request("/api/reset-server", { method: "POST" }),
};
