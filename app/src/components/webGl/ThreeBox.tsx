import { ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import { useDispatch } from "react-redux";
import { setTarget } from "redux/slices/editObjSlice";
import { useCursor } from "@react-three/drei";
import { useState } from "react";

interface ThreeBoxProps {
  position: Vector3;
}

export const ThreeBox = (props: ThreeBoxProps) => {
  const { position } = props;
  const dispatch = useDispatch();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    dispatch(setTarget(e.object));
  };

  return (
    <mesh
      rotation={[0, 0, 0]}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
    >
      <boxGeometry />
      <meshNormalMaterial />
    </mesh>
  );
};
