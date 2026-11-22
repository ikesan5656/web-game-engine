import { Canvas } from "@react-three/fiber";
import { styled } from "@mui/material";
import { KeyboardControls } from "@react-three/drei";
import { SceneDev } from "scenesGl/SceneDev";
import { keyConfigs } from "config/keyConfig";
import { useDispatch } from "redux/store";
import { clearSelection } from "redux/slices/selectionSlice";
import { EntityObjectRegistryProvider } from "components/webGl/sceneView/EntityObjectRegistryProvider";

const EditorContainer = styled("div")({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
});

const EditorCanvas = () => {
  const dispatch = useDispatch();

  const canvasPointerMissed = () => {
    dispatch(clearSelection());
  };

  return (
    <EditorContainer>
      <KeyboardControls map={keyConfigs}>
        <Canvas
          style={{ background: "#808080" }}
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
