import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Group } from "three";
import { MMDLoader } from "three/addons/loaders/MMDLoader.js";

interface MMDModelProps {
  modelPath: string;
}

export const MMDModel = (props: MMDModelProps) => {
  const { modelPath } = props;
  const groupRef = useRef<Group>(new Group());

  useEffect(() => {
    // MMDLoaderのインスタンスを作成
    const loader = new MMDLoader();

    loader.load(
      modelPath,
      (model) => {
        // モデルをロードして、グループに追加
        groupRef.current.add(model);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("An error happened while loading MMD model:", error);
      }
    );
  }, [modelPath]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01; // モデルを回転させる例
    }
  });

  return <group ref={groupRef} />;
};
