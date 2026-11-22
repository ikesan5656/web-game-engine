import { Canvas } from "@react-three/fiber";
import { styled } from "@mui/material";
import { SceneDev } from "scenesGl/SceneDev";
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
      <Canvas
        style={{ background: "#808080" }}
        onPointerMissed={canvasPointerMissed}
        shadows={true}
      >
        {/* エンティティ ID から根の Object3D を引く表。シーンを包む固定の位置に置く */}
        <EntityObjectRegistryProvider>
          {/*シーンコンポーネント*/}
          <SceneDev />
        </EntityObjectRegistryProvider>
      </Canvas>
    </EditorContainer>
  );
};

export default EditorCanvas;
