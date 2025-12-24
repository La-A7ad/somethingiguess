import { deepClone } from "../utils/helpers.js";

export const STORAGE_KEYS = {
  BOARD: "kanban_board_state_v1",
  QUEUE: "kanban_sync_queue_v1",
  SERVER: "kanban_server_state_v1",
  SERVER_CONTROLS: "kanban_server_controls_v1",
};

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return deepClone(fallback);
    return JSON.parse(raw);
  } catch {
    return deepClone(fallback);
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
