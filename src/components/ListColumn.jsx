import React, { useCallback, useMemo, useState } from "react";
import { FixedSizeList as VirtualList } from "react-window";
import useBoardState from "../hooks/useBoardState.js";
import InlineEditor from "./InlineEditor.jsx";
import Card from "./Card.jsx";

export default function ListColumn({ listId }) {
  const { state, actions } = useBoardState();
  const list = state.lists.byId[listId];
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  const cardIds = useMemo(() => (list?.cardIds || []).filter((id) => Boolean(state.cards.byId[id])), [list?.cardIds, state.cards.byId]);

  const onDropAt = useCallback(
    (data, targetIndex) => {
      if (!data?.cardId || !data?.fromListId) return;
      actions.moveCard(data.cardId, data.fromListId, listId, targetIndex);
    },
    [actions, listId]
  );

  const onDropToEnd = useCallback(
    (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data = JSON.parse(raw);
      actions.moveCard(data.cardId, data.fromListId, listId, cardIds.length);
    },
    [actions, cardIds.length, listId]
  );

  if (!list) return null;

  return (
    <section className="w-80 shrink-0" aria-label={`list-${listId}`}>
      <div className="bg-slate-50 border rounded-lg p-3 flex flex-col gap-2 min-h-[240px]">
        <header className="flex items-start gap-2">
          <div className="flex-1">
            {editingTitle ? (
              <InlineEditor
                initialValue={list.title}
                placeholder="List title"
                ariaLabel="edit-list-title"
                onSave={(v) => {
                  actions.renameList(listId, v);
                  setEditingTitle(false);
                }}
                onCancel={() => setEditingTitle(false)}
              />
            ) : (
              <button className="text-left w-full font-semibold" onClick={() => setEditingTitle(true)} aria-label="start-rename-list">
                {list.title}
              </button>
            )}
          </div>

          <button className="text-sm px-2 py-1 rounded bg-slate-200" onClick={() => actions.archiveList(listId)} aria-label="archive-list">
            Archive
          </button>
        </header>

        <div className="flex gap-2 items-center">
          {addingCard ? (
            <InlineEditor
              initialValue=""
              placeholder="Card title"
              ariaLabel="new-card-title"
              onSave={(v) => {
                actions.addCard(listId, v);
                setAddingCard(false);
              }}
              onCancel={() => setAddingCard(false)}
            />
          ) : (
            <button className="text-sm px-2 py-1 rounded bg-blue-600 text-white" onClick={() => setAddingCard(true)} aria-label="add-card">
              Add Card
            </button>
          )}
          <div className="ml-auto text-xs text-slate-600" aria-label="card-count">
            {cardIds.length} cards
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2" onDragOver={(e) => e.preventDefault()} onDrop={onDropToEnd} aria-label="card-list">
          {cardIds.length > 30 ? (
            <VirtualList height={520} itemCount={cardIds.length} itemSize={84} width={"100%"} itemKey={(i) => cardIds[i]}>
              {({ index, style }) => (
                <div style={style} className="pr-1">
                  <Card cardId={cardIds[index]} index={index} listId={listId} onDropAt={onDropAt} />
                </div>
              )}
            </VirtualList>
          ) : (
            cardIds.map((id, idx) => <Card key={id} cardId={id} index={idx} listId={listId} onDropAt={onDropAt} />)
          )}
        </div>
      </div>
    </section>
  );
}
