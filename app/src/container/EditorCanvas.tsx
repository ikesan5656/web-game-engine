import { Canvas } from "@react-three/fiber";
import { styled } from "@mui/material";
import useResizeObserver from "../hooks/useResizeObserver";
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";

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

  return (
    <EditorContainer ref={ref}>
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
      >
        <OrbitControls />
        <GizmoHelper
          alignment="top-right" // widget alignment within scene
          margin={[80, 80]} // widget margins (X, Y)
        >
          <GizmoViewport
            axisColors={["red", "green", "blue"]}
            labelColor="black"
            disabled={true} //クリックできないように設定
          />
        </GizmoHelper>
        <gridHelper position={[0, -0.01, 0]} />
        <axesHelper args={[5]} />

        <mesh rotation={[0, 0, 0]} position={[0, 1, 0]}>
          <boxGeometry />
          <meshNormalMaterial />
        </mesh>
      </Canvas>
    </EditorContainer>
  );
};
