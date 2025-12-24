import React, { Suspense, useMemo } from "react";
import useBoardState from "../hooks/useBoardState.js";
import ListColumn from "./ListColumn.jsx";

const CardDetailModal = React.lazy(() => import("./CardDetailModal.jsx"));

export default function Board() {
  const { state } = useBoardState();
  const listIds = useMemo(
    () => state.lists.allIds.filter((id) => !state.lists.byId[id]?.archived),
    [state.lists.allIds, state.lists.byId]
  );

  return (
    <div className="flex gap-4 overflow-x-auto kanban-scroll pb-3" aria-label="board">
      {listIds.map((id) => (
        <ListColumn key={id} listId={id} />
      ))}

      <Suspense
        fallback={
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white rounded p-4 shadow text-sm" role="status" aria-label="loading-modal">
              Loading…
            </div>
          </div>
        }
      >
        {(state.ui.selectedCardId || state.ui.mergeConflict) && <CardDetailModal />}
      </Suspense>
    </div>
  );
}
