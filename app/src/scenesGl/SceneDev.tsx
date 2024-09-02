/**
 * 開発用シーン
 */

import { TransformControls } from "@react-three/drei";
import { CameraControl } from "components/webGl/CameraControl";
import { DirectionalLightCustom } from "components/webGl/DirectionalLightCustom";
import { ThreeBox } from "components/webGl/ThreeBox";
import { ThreeGizmo } from "components/webGl/ThreeGizmo";
import { useRef } from "react";
import { useSelector } from "redux/store";
import { Vector3 } from "three";

const defaultPos = new Vector3(0, 1, 0);

export const SceneDev = () => {
  const target = useSelector((state) => state.editObj.target);
  const positionTest = useRef(defaultPos);

  return (
    <group>
      <CameraControl />
      <DirectionalLightCustom />
      <ThreeGizmo />
      <gridHelper position={[0, -0.01, 0]} />
      <axesHelper args={[5]} />

      {target && <TransformControls object={target} mode={"translate"} />}
      <ThreeBox position={positionTest.current} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[10]} />
        <meshStandardMaterial />
      </mesh>
      {/*<MMDModel modelPath={miku} />*/}
      {/*<MMDModelWithAnim modelPath={miku} vmdPath={vmd} />*/}
    </group>
  );
};
