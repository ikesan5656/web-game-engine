import { useEffect } from "react";
import { redo, undo } from "redux/commands";
import { useDispatch } from "redux/store";
import { isTextEditingElement } from "utils/isTextEditingElement";

/** Ctrl/Cmd+Z で Undo、Ctrl/Cmd+Shift+Z・Ctrl/Cmd+Y で Redo */
export const useUndoRedoShortcuts = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.altKey) return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (isTextEditingElement(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch(undo());
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        dispatch(redo());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);
};
