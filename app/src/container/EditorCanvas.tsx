import { Canvas } from "@react-three/fiber";
import { styled } from "@mui/material";
import useResizeObserver from "../hooks/useResizeObserver";
import { KeyboardControls } from "@react-three/drei";
import { SceneDev } from "scenesGl/SceneDev";
import { keyConfigs } from "config/keyConfig";
import { useDispatch } from "react-redux";
import { setTarget } from "redux/slices/editObjSlice";
/*import miku from "assets/miku/miku_v2.pmd";
import vmd from "assets/miku/vmds/wavefile_v2.vmd";
import { MMDModelWithAnim } from "components/webGl/MMDModelWithAnim";*/

export const EditorContainer = styled("div")({
  height: "100%",
  width: "100%",
  flex: 1,
  position: "relative",
  display: "flex",
  boxSizing: "border-box",
  overflow: "hidden",
});

export const EditorCanvas = () => {
  const { ref, dimensions } = useResizeObserver();
  const dispatch = useDispatch();

  const canvasPointerMissed = () => {
    dispatch(setTarget(undefined));
  };

  return (
    <EditorContainer ref={ref}>
      <KeyboardControls map={keyConfigs}>
        <Canvas
          style={{
            background: "#808080",
            height: `${dimensions.height}px`,
            width: `${dimensions.width}px`,
            margin: 0,
            padding: 0,
            position: "absolute",
            top: 0,
            left: 0,
          }}
          camera={{ position: [0, 3, 5] }}
          onPointerMissed={canvasPointerMissed}
          shadows={true}
        >
          {/*シーンコンポーネント*/}
          <SceneDev />
        </Canvas>
      </KeyboardControls>
    </EditorContainer>
  );
};
