import type {
  MeshComponent,
  MeshMaterial,
  MeshShape,
} from "core/scene/components";

interface MeshViewProps {
  mesh: MeshComponent;
}

/** 形状を three のジオメトリにする。分割数は three の既定値を使う */
const renderGeometry = (shape: MeshShape) => {
  switch (shape.kind) {
    case "box":
      return <boxGeometry args={[shape.width, shape.height, shape.depth]} />;
    case "sphere":
      return <sphereGeometry args={[shape.radius]} />;
    case "plane":
      return <planeGeometry args={[shape.width, shape.height]} />;
    case "circle":
      return <circleGeometry args={[shape.radius]} />;
    default: {
      const unreachable: never = shape;
      return unreachable;
    }
  }
};

/** マテリアルを three のマテリアルにする */
const renderMaterial = (material: MeshMaterial) => {
  switch (material.kind) {
    case "standard":
      return <meshStandardMaterial color={material.color} />;
    case "normal":
      return <meshNormalMaterial />;
    default: {
      const unreachable: never = material;
      return unreachable;
    }
  }
};

/** 基本形状のメッシュ */
export const MeshView = (props: MeshViewProps) => {
  const { mesh } = props;

  return (
    <mesh castShadow={mesh.castShadow} receiveShadow={mesh.receiveShadow}>
      {renderGeometry(mesh.shape)}
      {renderMaterial(mesh.material)}
    </mesh>
  );
};
