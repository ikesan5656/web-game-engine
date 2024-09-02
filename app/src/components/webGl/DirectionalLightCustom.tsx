import { useHelper } from "@react-three/drei";
import { useRef } from "react";
import { DirectionalLight, DirectionalLightHelper } from "three";
import { PlaneTexture } from "components/webGl/PlaneTexture";

export const DirectionalLightCustom = () => {
  const lightRef = useRef<DirectionalLight>(new DirectionalLight());
  useHelper(lightRef, DirectionalLightHelper, 1, "red");

  return (
    <>
      <directionalLight
        color="#ffffff"
        position={[5, 5, 5]}
        castShadow
        ref={lightRef}
      />
      <PlaneTexture targetRef={lightRef} />
    </>
  );
};
