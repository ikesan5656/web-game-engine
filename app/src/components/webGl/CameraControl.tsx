import { useFrame } from "@react-three/fiber";
import { /*OrbitControls, */ useKeyboardControls } from "@react-three/drei";
import { Vector3 } from "three";

// カメラの移動速度
const CAMERA_SPEED = 1;

const anglePerSecond = (30 * Math.PI) / 180;

/*
 * カメラ制御を行うコンポーネント
 */
export const CameraControl = () => {
  const [, get] = useKeyboardControls();

  useFrame((state, delta) => {
    const {
      forward,
      backward,
      left,
      right,
      up,
      down,
      leftRotation,
      rightRotation,
    } = get();

    // カメラの向いてる方向を取得する
    const direction = new Vector3();
    state.camera.getWorldDirection(direction); //directionにコピーされる
    // Y軸の成分を無視するために、Y成分をゼロに設定
    direction.y = 0;
    direction.normalize(); // ベクトルの正規化

    // 横方向の移動を設定
    const rightVec = new Vector3();
    state.camera.getWorldDirection(rightVec);
    // Y軸の成分を無視するために、Y成分をゼロに設定
    rightVec.y = 0;
    rightVec.normalize(); // ベクトルの正規化
    rightVec.cross(state.camera.up);

    // 前に進む
    if (forward) {
      console.log("forward");
      state.camera.position.addScaledVector(direction, CAMERA_SPEED * delta);
    }
    // 後ろに進む
    if (backward) {
      console.log("back");
      state.camera.position.addScaledVector(direction, -CAMERA_SPEED * delta);
    }
    // 右に進む
    if (right) {
      console.log("right");
      state.camera.position.addScaledVector(rightVec, CAMERA_SPEED * delta);
    }
    // 左に進む
    if (left) {
      state.camera.position.addScaledVector(rightVec, -CAMERA_SPEED * delta);
    }
    // 上昇
    if (up) {
      state.camera.position.y += CAMERA_SPEED * delta;
    }
    // 下降
    if (down) {
      state.camera.position.y -= CAMERA_SPEED * delta;
    }
    // 左回転 (ワールドのY軸を基準にして回転)
    if (leftRotation) {
      // カメラの現在の高さを保持
      //const originalY = state.camera.position.y;
      // カメラのY座標を元の高さに固定
      //state.camera.position.y = originalY;

      //const angle = anglePerSecond * delta;
      //state.camera.rotation.y += angle; // カメラをY軸周りに回転

      const angle = anglePerSecond * delta;
      state.camera.rotateOnWorldAxis(new Vector3(0, 1, 0), angle);
    }
    // 右回転
    if (rightRotation) {
      const angle = anglePerSecond * delta;
      state.camera.rotateOnWorldAxis(new Vector3(0, 1, 0), -angle);
    }
  });

  return null;
  /*<group>
      <OrbitControls />
    </group>*/
};
