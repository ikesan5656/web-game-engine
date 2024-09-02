import { GizmoHelper, GizmoViewport } from "@react-three/drei";

export const ThreeGizmo = () => {
  return (
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
  );
};
