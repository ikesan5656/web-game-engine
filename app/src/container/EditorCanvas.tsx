import { Canvas } from "@react-three/fiber";
import { styled } from "@mui/material";
import useResizeObserver from "../hooks/useResizeObserver";
import { KeyboardControls } from "@react-three/drei";
import { SceneDev } from "scenesGl/SceneDev";
import { keyConfigs } from "config/keyConfig";
import { useDispatch } from "redux/store";
import { clearSelection } from "redux/slices/selectionSlice";
import { EntityObjectRegistryProvider } from "components/webGl/sceneView/EntityObjectRegistryProvider";

const EditorContainer = styled("div")({
  height: "100%",
  width: "100%",
  flex: 1,
  position: "relative",
  display: "flex",
  boxSizing: "border-box",
  overflow: "hidden",
});

const EditorCanvas = () => {
  const { ref, dimensions } = useResizeObserver();
  const dispatch = useDispatch();

  const canvasPointerMissed = () => {
    dispatch(clearSelection());
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
          {/* エンティティ ID から根の Object3D を引く表。シーンを包む固定の位置に置く */}
          <EntityObjectRegistryProvider>
            {/*シーンコンポーネント*/}
            <SceneDev />
          </EntityObjectRegistryProvider>
        </Canvas>
      </KeyboardControls>
    </EditorContainer>
  );
};

export default EditorCanvas;
