import { Plane } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { DoubleSide, TextureLoader } from "three";
import img from "assets/taiyou.png";

/** 太陽のテクスチャを貼った板。親（ライトの根の group）の原点に置く */
export const PlaneTexture = () => {
  const texture = useLoader(TextureLoader, img);
  return (
    <Plane args={[1, 1]}>
      {/* マテリアルにテクスチャを適用 */}
      <meshStandardMaterial
        map={texture}
        side={DoubleSide}
        transparent={true} // アルファチャンネル適用
      />
    </Plane>
  );
};
