/** カメラ操作の種類 */
export type CameraGesture = "look" | "pan" | "orbit";

/**
 * pointerdown からカメラ操作の種類を決める。カメラ操作でなければ null（左クリックなどは選択・ギズモに任せる）
 * - 右ボタン: 見回し
 * - 中ボタン、Alt+Cmd（Windows・Linux では Alt+Ctrl）+左ボタン: パン
 * - Alt+左ボタン: オービット
 */
export const resolveCameraGesture = (e: PointerEvent): CameraGesture | null => {
  if (e.pointerType !== "mouse" && e.pointerType !== "pen") return null;
  if (e.button === 2) return "look";
  if (e.button === 1) return "pan";
  if (e.button === 0 && e.altKey) {
    return e.metaKey || e.ctrlKey ? "pan" : "orbit";
  }
  return null;
};

/** PointerEvent.button に対応する PointerEvent.buttons のビット */
export const buttonMask = (button: number): number => {
  switch (button) {
    case 0:
      return 1;
    case 1:
      return 4;
    case 2:
      return 2;
    default:
      return 0;
  }
};
