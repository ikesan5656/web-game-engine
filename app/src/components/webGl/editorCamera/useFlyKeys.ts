import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CameraGesture } from "components/webGl/editorCamera/cameraGesture";
import { isTextEditingElement } from "utils/isTextEditingElement";

/** フライスルー中に他へ届かせないキー */
const FLY_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ShiftLeft",
  "ShiftRight",
]);

/**
 * 押されているキー（`KeyboardEvent.code`）の Set を ref で返す。毎フレーム読むため state にしない。
 * gestureRef の操作が見回し（look）の間は、フライスルーのキーを他のショートカットに届かせない。
 * blur・タブが隠れたときのキー状態のクリアもここで行う
 */
export const useFlyKeys = (
  gestureRef: RefObject<{ type: CameraGesture } | null>
): RefObject<Set<string>> => {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const pressed = keys.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || isTextEditingElement(e.target)) return;
      pressed.add(e.code);
      if (gestureRef.current?.type === "look" && FLY_CODES.has(e.code)) {
        e.stopPropagation();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code);
      // Mac では Meta を押している間、他のキーの keyup が届かない
      if (e.key === "Meta") pressed.clear();
    };
    const clear = () => pressed.clear();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") pressed.clear();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      pressed.clear();
    };
  }, [gestureRef]);

  return keys;
};
