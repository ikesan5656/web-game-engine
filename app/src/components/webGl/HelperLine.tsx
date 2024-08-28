import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export const HelperLine = () => {
  const { camera } = useThree();
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      // カメラからの距離に応じてスケールを調整
      const distance = ref.current.position.distanceTo(camera.position);
      const scale = distance * 0.1; // スケールを距離の逆数に設定
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <>
      <gridHelper position={[0, -0.01, 0]} />
      <axesHelper args={[5]} />
    </>
  );
};
