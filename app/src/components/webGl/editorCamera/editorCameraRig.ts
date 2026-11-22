import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import type { Camera } from "three";

/** カメラの向きと、注視点までの距離（注視点は 位置 + 前方向 × distance で求める） */
export interface EditorCameraRig {
  yaw: number;
  pitch: number;
  distance: number;
}

/** フライスルーの入力。forward・right・up は -1〜1 */
export interface FlyInput {
  forward: number;
  right: number;
  up: number;
  fast: boolean;
}

/** フライスルーの速度（単位/秒） */
const FLY_SPEED = 5;
/** Shift を押しているときの速度の倍率 */
const FLY_FAST_MULTIPLIER = 3;
/** 見回しの感度（rad/px） */
const LOOK_SENSITIVITY = 0.003;
/** オービットの感度（rad/px） */
const ORBIT_SENSITIVITY = 0.005;
/** 注視点までの最小距離 */
export const MIN_DISTANCE = 0.1;
/** ドリーの 1 回あたりの移動量を決めるときの、距離の下限（最小距離付近でも動けるようにする） */
const DOLLY_MIN_STEP_DISTANCE = 1;
/** pitch の上限（真上・真下を避ける） */
const MAX_PITCH = Math.PI / 2 - 0.01;
/** PerspectiveCamera でないときの、パンの 1px あたりの移動量 */
const FALLBACK_PAN_PER_PIXEL = 0.01;

// 毎回確保しないよう、作業用のベクトルを使い回す
const forwardVec = new Vector3();
const rightVec = new Vector3();
const upVec = new Vector3();
const pivotVec = new Vector3();
const moveVec = new Vector3();

const clampPitch = (pitch: number) =>
  MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH);

/** yaw・pitch からカメラの前方向を求める */
const getForward = (rig: EditorCameraRig, out: Vector3): Vector3 => {
  const cosPitch = Math.cos(rig.pitch);
  return out.set(
    -Math.sin(rig.yaw) * cosPitch,
    Math.sin(rig.pitch),
    -Math.cos(rig.yaw) * cosPitch
  );
};

/** rig の yaw・pitch をカメラの向きに反映する */
export const applyRotation = (camera: Camera, rig: EditorCameraRig): void => {
  camera.rotation.set(rig.pitch, rig.yaw, 0, "YXZ");
};

/** 位置と注視点から rig を作り、カメラを配置して注視点に向ける */
export const createRig = (
  camera: Camera,
  position: readonly [number, number, number],
  pivot: readonly [number, number, number]
): EditorCameraRig => {
  camera.rotation.order = "YXZ";
  camera.position.set(position[0], position[1], position[2]);
  const dir = pivotVec.set(pivot[0], pivot[1], pivot[2]).sub(camera.position);
  const length = dir.length();
  const rig: EditorCameraRig = {
    yaw: 0,
    pitch: 0,
    distance: Math.max(length, MIN_DISTANCE),
  };
  if (length > 1e-6) {
    dir.divideScalar(length);
    rig.yaw = Math.atan2(-dir.x, -dir.z);
    rig.pitch = clampPitch(Math.asin(MathUtils.clamp(dir.y, -1, 1)));
  }
  applyRotation(camera, rig);
  return rig;
};

/** 見回し: 位置と注視点までの距離を保ち、向きだけを変える */
export const look = (
  camera: Camera,
  rig: EditorCameraRig,
  dx: number,
  dy: number
): void => {
  rig.yaw -= dx * LOOK_SENSITIVITY;
  rig.pitch = clampPitch(rig.pitch - dy * LOOK_SENSITIVITY);
  applyRotation(camera, rig);
};

/** オービット: 注視点との距離を保ったまま、注視点のまわりを回る */
export const orbit = (
  camera: Camera,
  rig: EditorCameraRig,
  dx: number,
  dy: number
): void => {
  // 回す前の注視点
  pivotVec
    .copy(camera.position)
    .addScaledVector(getForward(rig, forwardVec), rig.distance);
  rig.yaw -= dx * ORBIT_SENSITIVITY;
  rig.pitch = clampPitch(rig.pitch - dy * ORBIT_SENSITIVITY);
  applyRotation(camera, rig);
  camera.position
    .copy(pivotVec)
    .addScaledVector(getForward(rig, forwardVec), -rig.distance);
};

/** パン: 向きを変えずに、カメラ（と注視点）を画面の上下左右に平行移動する */
export const pan = (
  camera: Camera,
  rig: EditorCameraRig,
  dx: number,
  dy: number,
  viewportHeight: number
): void => {
  const perPixel =
    camera instanceof PerspectiveCamera && viewportHeight > 0
      ? (2 * rig.distance * Math.tan(MathUtils.degToRad(camera.fov) / 2)) /
        viewportHeight
      : FALLBACK_PAN_PER_PIXEL;
  rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
  upVec.set(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position
    .addScaledVector(rightVec, -dx * perPixel)
    .addScaledVector(upVec, dy * perPixel);
};

/**
 * ドリー: 注視点との距離を scale 倍にする（scale < 1 で近づく）
 * 最小距離より近づくときは、注視点ごと前に押し出す
 */
export const dolly = (
  camera: Camera,
  rig: EditorCameraRig,
  scale: number
): void => {
  const step = Math.max(rig.distance, DOLLY_MIN_STEP_DISTANCE) * (1 - scale);
  camera.position.addScaledVector(getForward(rig, forwardVec), step);
  // 最小距離より近づく分は、注視点ごと前に押し出される（distance は MIN_DISTANCE のまま）
  rig.distance = Math.max(rig.distance - step, MIN_DISTANCE);
};

/** フライスルー: 前後は傾きを含む前方向、左右は水平方向、上下はワールドの Y 方向に動く */
export const fly = (
  camera: Camera,
  rig: EditorCameraRig,
  input: FlyInput,
  delta: number
): void => {
  getForward(rig, forwardVec);
  rightVec.set(Math.cos(rig.yaw), 0, -Math.sin(rig.yaw));
  moveVec
    .set(0, 0, 0)
    .addScaledVector(forwardVec, input.forward)
    .addScaledVector(rightVec, input.right)
    .addScaledVector(upVec.set(0, 1, 0), input.up);
  if (moveVec.lengthSq() === 0) return;
  const speed = FLY_SPEED * (input.fast ? FLY_FAST_MULTIPLIER : 1);
  camera.position.addScaledVector(moveVec.normalize(), speed * delta);
};

/** ホイールのドリーの係数（px あたり） */
export const WHEEL_DOLLY_RATE = 0.0015;
/** ピンチ（ctrlKey 付きの wheel）のドリーの係数（px あたり） */
export const PINCH_DOLLY_RATE = 0.01;
