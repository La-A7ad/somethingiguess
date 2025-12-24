import React, { memo, useCallback, useMemo } from "react";
import useBoardState from "../hooks/useBoardState.js";

function Card({ cardId, index, listId, onDropAt }) {
  const { state, actions } = useBoardState();
  const card = state.cards.byId[cardId];

  const open = useCallback(() => actions.openCard(cardId), [actions, cardId]);

  const visibleTags = useMemo(() => card?.tags || [], [card?.tags]);

  if (!card) return null;

  return (
    <div
      className="bg-white rounded shadow-sm border p-2 cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`card-${cardId}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ cardId, fromListId: listId }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        onDropAt(JSON.parse(raw), index);
      }}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
        if (e.key === "Delete") actions.deleteCard(cardId);

        if (e.altKey && e.key === "ArrowUp") actions.moveCard(cardId, listId, listId, Math.max(0, index - 1));
        if (e.altKey && e.key === "ArrowDown") actions.moveCard(cardId, listId, listId, index + 1);

        const visibleLists = state.lists.allIds.filter((id) => !state.lists.byId[id]?.archived);
        const li = visibleLists.indexOf(listId);

        if (e.altKey && e.key === "ArrowLeft" && li > 0) actions.moveCard(cardId, listId, visibleLists[li - 1], 0);
        if (e.altKey && e.key === "ArrowRight" && li >= 0 && li < visibleLists.length - 1) actions.moveCard(cardId, listId, visibleLists[li + 1], 0);
      }}
    >
      <div className="text-sm font-medium">{card.title}</div>
      {visibleTags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleTags.map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(Card);
