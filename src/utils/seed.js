import { STORAGE_KEYS, saveJson } from "../services/storage.js";
import { nowIso } from "./helpers.js";
import { v4 as uuidv4 } from "uuid";

export function seed500() {
  const listCount = 5;
  const perList = 120; // 600 cards total

  const lists = { byId: {}, allIds: [] };
  const cards = { byId: {} };

  for (let i = 0; i < listCount; i += 1) {
    const id = uuidv4();
    lists.allIds.push(id);
    lists.byId[id] = {
      id,
      title: `List ${i + 1}`,
      archived: false,
      cardIds: [],
      version: 1,
      lastModifiedAt: nowIso(),
    };
  }

  const tagsPool = ["ui", "bug", "perf", "docs", "a11y", "api", "test", "refactor"];

  for (const listId of lists.allIds) {
    for (let j = 0; j < perList; j += 1) {
      const id = uuidv4();
      const tags = [tagsPool[(j + listId.length) % tagsPool.length]];
      cards.byId[id] = {
        id,
        listId,
        title: `Task ${j + 1}`,
        description: "Generated seed task for performance testing.",
        tags,
        version: 1,
        lastModifiedAt: nowIso(),
      };
      lists.byId[listId].cardIds.push(id);
    }
  }

  const persisted = {
    lists,
    cards,
    ui: { selectedCardId: null, confirm: null, mergeConflict: null, error: null, isSyncing: false, forceOffline: false },
    sync: { lastSyncAt: null },
    undo: { past: [], future: [] },
  };

  saveJson(STORAGE_KEYS.BOARD, persisted);
  saveJson(STORAGE_KEYS.QUEUE, []);
}
