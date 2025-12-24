import React from "react";
import useBoardState from "../hooks/useBoardState.js";
import { ACTIONS } from "../context/boardReducer.js";
import MergeConflictBanner from "./MergeConflictBanner.jsx";

export default function MergeConflictBannerContainer() {
  const { state, dispatch, offlineSync } = useBoardState();
  const conflict = state.ui.mergeConflict;

  if (!conflict || conflict.kind !== "list") return null;

  return (
    <MergeConflictBanner
      conflict={conflict}
      onResolve={offlineSync.resolveMerge}
      onDismiss={() => dispatch({ type: ACTIONS.MERGE_CLEAR })}
    />
  );
}
