/**
 * 開発用シーン
 */

import { TransformControls } from "@react-three/drei";
import { CameraControl } from "components/webGl/CameraControl";
import { DirectionalLightCustom } from "components/webGl/DirectionalLightCustom";
import { MMDModel } from "components/webGl/MMDModel";
import { MMDModelWithAnim } from "components/webGl/MMDModelWithAnim";
//import { ThreeBox } from "components/webGl/ThreeBox";
import { ThreeGizmo } from "components/webGl/ThreeGizmo";
//import { useRef } from "react";
import { useSelector } from "redux/store";
//import { Vector3 } from "three";

//const defaultPos = new Vector3(0, 1, 0);

export const SceneDev = () => {
  const target = useSelector((state) => state.editObj.target);
  //const positionTest = useRef(defaultPos);

  // Vite: resolve asset URL so dev server returns the actual binary file,
  // otherwise a relative path may return an HTML 404 page which MMDLoader
  // will interpret incorrectly (e.g. starting with "<!d").
  const mikuModelUrl = new URL("../assets/miku/miku_v2.pmd", import.meta.url)
    .href;
  const mikuVmdUrl = new URL(
    "../assets/miku/vmds/wavefile_v2.vmd",
    import.meta.url
  ).href;

  return (
    <group>
      <CameraControl initialPosition={[0, 7, 8]} />
      <DirectionalLightCustom />
      <ThreeGizmo />
      <gridHelper position={[0, -0.01, 0]} />
      <axesHelper args={[5]} />

      {target && <TransformControls object={target} mode={"translate"} />}
      {/*<ThreeBox position={positionTest.current} />*/}

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[10]} />
        <meshStandardMaterial />
      </mesh>
      <MMDModel modelPath={mikuModelUrl} motionPath={mikuVmdUrl} scale={0.3} />
      {/*<MMDModelWithAnim
        modelPath={mikuModelUrl}
        vmdPath={mikuVmdUrl}
        scale={0.3}
      />*/}
    </group>
  );
};
