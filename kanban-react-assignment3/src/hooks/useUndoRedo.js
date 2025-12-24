import { useCallback } from "react";
import { ACTIONS } from "../context/boardReducer.js";

/**
 * Multi-level undo/redo for board operations.
 * State storage is in reducer (state.undo). This hook only exposes controls.
 */
export default function useUndoRedo(dispatch) {
  const push = useCallback(() => dispatch({ type: ACTIONS.UNDO_PUSH }), [dispatch]);
  const undo = useCallback(() => dispatch({ type: ACTIONS.UNDO }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: ACTIONS.REDO }), [dispatch]);
  return { push, undo, redo };
}
