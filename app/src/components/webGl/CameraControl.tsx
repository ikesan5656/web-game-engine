import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Vec3 } from "core/math/vec3";
import {
  buttonMask,
  resolveCameraGesture,
  type CameraGesture,
} from "components/webGl/editorCamera/cameraGesture";
import {
  PINCH_DOLLY_RATE,
  WHEEL_DOLLY_RATE,
  createRig,
  dolly,
  fly,
  look,
  orbit,
  pan,
  type EditorCameraRig,
} from "components/webGl/editorCamera/editorCameraRig";
import { useFlyKeys } from "components/webGl/editorCamera/useFlyKeys";
import { isTextEditingElement } from "utils/isTextEditingElement";

interface CameraControlProps {
  /** 初期のカメラ位置。マウントしたとき（camera が変わったとき）だけ使い、後から変えても反映されない */
  initialPosition: Vec3;
  /** 初期の注視点 */
  initialPivot?: Vec3;
  /** false のときは、カメラ操作の開始とホイールのドリーを無視する（ブラウザの既定動作は止め続ける） */
  enabled?: boolean;
}

/** 進行中のカメラ操作 */
interface ActiveGesture {
  type: CameraGesture;
  /** この操作を始めたボタンの PointerEvent.buttons のビット */
  mask: number;
  lastX: number;
  lastY: number;
}

/** Safari のトラックパッドのピンチ（gesture イベント）。lib.dom に型がないため自前で定義する */
interface GestureLikeEvent extends Event {
  scale: number;
}

const ORIGIN: Vec3 = [0, 0, 0];

/** 1 イベントあたりのドリーの指数の上限（Math.exp の結果が極端な値にならないようにする） */
const MAX_DOLLY_EXPONENT = 0.5;

/** WheelEvent.deltaMode に応じて、移動量を px にする */
const wheelDeltaToPixels = (e: WheelEvent, pageHeight: number): number => {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * 16;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * pageHeight;
  return e.deltaY;
};

/**
 * エディタ用のカメラ操作（Unity のシーンビュー風）
 * - 右ドラッグ: 見回し（押している間は W/A/S/D/Q/E + Shift でフライスルー）
 * - 中ドラッグ、Alt+Cmd(Ctrl)+左ドラッグ: パン
 * - Alt+左ドラッグ: オービット
 * - ホイール・ピンチ: ドリー
 * カメラの値は毎フレーム変わるため、Redux には入れず、イベントと useFrame の中で直接更新する
 */
export const CameraControl = ({
  initialPosition,
  initialPivot = ORIGIN,
  enabled = true,
}: CameraControlProps) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const connected = useThree((s) => s.events.connected);
  const element = connected instanceof HTMLElement ? connected : gl.domElement;

  const rigRef = useRef<EditorCameraRig | null>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  // SceneDev の再描画で初期化し直さないよう、props は ref 経由で読む
  const initialRef = useRef({ initialPosition, initialPivot });
  const enabledRef = useRef(enabled);
  useLayoutEffect(() => {
    initialRef.current = { initialPosition, initialPivot };
    enabledRef.current = enabled;
  }, [initialPosition, initialPivot, enabled]);

  const keysRef = useFlyKeys(gestureRef);

  // カメラが変わったときだけ初期化する
  useLayoutEffect(() => {
    const { initialPosition: position, initialPivot: pivot } =
      initialRef.current;
    rigRef.current = createRig(camera, position, pivot);
  }, [camera]);

  useEffect(() => {
    const keys = keysRef.current;
    let lastDownWasCamera = false;
    let gestureScale = 1;
    let gestureActive = false;

    const endGesture = () => {
      gestureRef.current = null;
      window.removeEventListener("pointermove", onWindowPointer, true);
      window.removeEventListener("pointerup", onWindowPointer, true);
      window.removeEventListener("pointercancel", onCancel, true);
    };

    const onCancel = () => {
      endGesture();
      keys.clear();
    };

    const onWindowPointer = (e: PointerEvent) => {
      const gesture = gestureRef.current;
      const rig = rigRef.current;
      if (!gesture || !rig) return;
      if ((e.buttons & gesture.mask) === 0) {
        endGesture();
      } else if (e.type === "pointermove") {
        const dx = e.clientX - gesture.lastX;
        const dy = e.clientY - gesture.lastY;
        gesture.lastX = e.clientX;
        gesture.lastY = e.clientY;
        const cam = get().camera;
        if (gesture.type === "look") look(cam, rig, dx, dy);
        else if (gesture.type === "orbit") orbit(cam, rig, dx, dy);
        else pan(cam, rig, dx, dy, element.clientHeight);
      }
      // ギズモなどに、カメラ操作中のポインタ移動を見せない
      if (e.target instanceof Node && element.contains(e.target)) {
        e.stopPropagation();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isTextEditingElement(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
      const type = resolveCameraGesture(e);
      lastDownWasCamera = type !== null;
      if (!type) return;
      // TransformControls と R3F のイベントに届かせない
      e.stopPropagation();
      e.preventDefault();
      if (!enabledRef.current || gestureRef.current) return;
      gestureRef.current = {
        type,
        mask: buttonMask(e.button),
        lastX: e.clientX,
        lastY: e.clientY,
      };
      window.addEventListener("pointermove", onWindowPointer, true);
      window.addEventListener("pointerup", onWindowPointer, true);
      window.addEventListener("pointercancel", onCancel, true);
    };

    // R3F の onClick・onPointerMissed に届かせない（選択を変えない）
    const onClick = (e: MouseEvent) => {
      if (lastDownWasCamera) e.stopPropagation();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!enabledRef.current) return;
      // Safari はピンチ中に ctrlKey 付きの wheel も出すため、gesture イベント側で処理する
      if (e.ctrlKey && gestureActive) return;
      const rig = rigRef.current;
      if (!rig) return;
      const pixels = wheelDeltaToPixels(e, element.clientHeight);
      const rate = e.ctrlKey ? PINCH_DOLLY_RATE : WHEEL_DOLLY_RATE;
      const exponent = MathUtils.clamp(
        pixels * rate,
        -MAX_DOLLY_EXPONENT,
        MAX_DOLLY_EXPONENT
      );
      if (Number.isNaN(exponent)) return;
      dolly(get().camera, rig, Math.exp(exponent));
    };

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureActive = true;
      gestureScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scale = (e as GestureLikeEvent).scale;
      const rig = rigRef.current;
      if (enabledRef.current && rig && scale > 0 && gestureScale > 0) {
        // 広げる（scale が増える）と近づく。ホイールと同じく 1 回の変化量に上限を掛ける
        const exponent = MathUtils.clamp(
          Math.log(gestureScale / scale),
          -MAX_DOLLY_EXPONENT,
          MAX_DOLLY_EXPONENT
        );
        if (!Number.isNaN(exponent)) {
          dolly(get().camera, rig, Math.exp(exponent));
        }
      }
      gestureScale = scale;
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      gestureActive = false;
    };

    const onWindowBlur = () => {
      endGesture();
      gestureActive = false;
      gestureScale = 1;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onWindowBlur();
    };

    element.addEventListener("pointerdown", onPointerDown, true);
    element.addEventListener("click", onClick, true);
    element.addEventListener("dblclick", onClick, true);
    element.addEventListener("contextmenu", onContextMenu, true);
    element.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
    element.addEventListener("gesturestart", onGestureStart, {
      passive: false,
    });
    element.addEventListener("gesturechange", onGestureChange, {
      passive: false,
    });
    element.addEventListener("gestureend", onGestureEnd, { passive: false });
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      endGesture();
      element.removeEventListener("pointerdown", onPointerDown, true);
      element.removeEventListener("click", onClick, true);
      element.removeEventListener("dblclick", onClick, true);
      element.removeEventListener("contextmenu", onContextMenu, true);
      element.removeEventListener("wheel", onWheel, true);
      element.removeEventListener("gesturestart", onGestureStart);
      element.removeEventListener("gesturechange", onGestureChange);
      element.removeEventListener("gestureend", onGestureEnd);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [element, get, keysRef]);

  // 右ボタンを押している間だけフライスルーする
  useFrame((state, delta) => {
    const rig = rigRef.current;
    if (!rig || gestureRef.current?.type !== "look") return;
    const keys = keysRef.current;
    const axis = (positive: string, negative: string) =>
      (keys.has(positive) ? 1 : 0) - (keys.has(negative) ? 1 : 0);
    fly(
      state.camera,
      rig,
      {
        forward: axis("KeyW", "KeyS"),
        right: axis("KeyD", "KeyA"),
        up: axis("KeyE", "KeyQ"),
        fast: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      },
      delta
    );
  });

  return null;
};
