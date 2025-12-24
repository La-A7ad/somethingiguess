/*
  Seed script (browser-localStorage):
  - This assignment requires a local data-seeding script that inserts 500+ cards into localStorage.
  - Run: npm run seed
  - Then copy/paste the printed snippet into the browser DevTools console on the app page.
*/
import fs from "node:fs";

const snippet = `(() => {
  const KEY = "kanban_board_state_v1";
  const QUEUE = "kanban_sync_queue_v1";
  const now = () => new Date().toISOString();
  const uuid = () => crypto.randomUUID();
  const lists = { byId: {}, allIds: [] };
  const cards = { byId: {} };
  const listCount = 5, perList = 120;
  for (let i=0;i<listCount;i++){
    const id = uuid();
    lists.allIds.push(id);
    lists.byId[id] = { id, title: "List " + (i+1), archived:false, cardIds:[], version:1, lastModifiedAt: now() };
  }
  const tagsPool = ["ui","bug","perf","docs","a11y","api","test","refactor"];
  for (const listId of lists.allIds){
    for (let j=0;j<perList;j++){
      const id = uuid();
      const tags = [tagsPool[(j + listId.length) % tagsPool.length]];
      cards.byId[id] = { id, listId, title: "Task " + (j+1), description:"Generated seed task.", tags, version:1, lastModifiedAt: now() };
      lists.byId[listId].cardIds.push(id);
    }
  }
  localStorage.setItem(KEY, JSON.stringify({ lists, cards, ui:{selectedCardId:null,mergeConflict:null,error:null,isSyncing:false,forceOffline:false}, sync:{lastSyncAt:null}, undo:{past:[],future:[]} }));
  localStorage.setItem(QUEUE, JSON.stringify([]));
  console.log("Seeded 600 cards. Reload the page.");
})();`;

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/seed-snippet.txt", snippet, "utf-8");
console.log("\nPaste this into your browser console on the app page:\n\n" + snippet + "\n");
