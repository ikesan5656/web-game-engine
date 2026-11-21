import { useHelper } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { DirectionalLight, DirectionalLightHelper } from "three";
import type { DirectionalLightComponent } from "core/scene/components";
import { PlaneTexture } from "components/webGl/PlaneTexture";

interface DirectionalLightCustomProps {
  light: DirectionalLightComponent;
}

/**
 * ディレクショナルライト。位置はエンティティの根の group で決まり、向きは原点（three の既定の target）へ向かう。
 * エディタ用のヘルパーと太陽のテクスチャも表示する
 */
export const DirectionalLightCustom = (props: DirectionalLightCustomProps) => {
  const { light } = props;
  const lightRef = useRef<DirectionalLight>(null!);
  useHelper(lightRef, DirectionalLightHelper, 1, "red");

  return (
    <>
      <directionalLight
        ref={lightRef}
        color={light.color}
        intensity={light.intensity}
        castShadow={light.castShadow}
      />
      <Suspense fallback={null}>
        <PlaneTexture />
      </Suspense>
    </>
  );
};
