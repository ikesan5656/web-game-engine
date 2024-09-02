import { MutableRefObject, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { DirectionalLight, DoubleSide, Mesh, TextureLoader } from "three";
import img from "assets/taiyou.png";

import { Plane } from "@react-three/drei";

interface PlaneTextureProps {
  targetRef: MutableRefObject<DirectionalLight>;
}

export const PlaneTexture = (props: PlaneTextureProps) => {
  const { targetRef } = props;
  const sunRef = useRef<Mesh>(null);
  useFrame(() => {
    sunRef.current?.position.copy(targetRef.current.position);
  });
  const texture = useLoader(TextureLoader, img);
  return (
    <Plane position={[5, 2, 0]} args={[1, 1]} rotation={[0, 0, 0]} ref={sunRef}>
      {/* マテリアルにテクスチャを適用 */}
      <meshStandardMaterial
        map={texture}
        side={DoubleSide}
        transparent={true} // アルファチャンネル適用
      />
    </Plane>
  );
};
