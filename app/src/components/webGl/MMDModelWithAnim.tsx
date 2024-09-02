import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { AnimationClip, Group } from "three";
import { MMDLoader } from "three/addons/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/addons/animation/MMDAnimationHelper.js";

interface MMDModelProps {
  modelPath: string;
  vmdPath: string;
}

export const MMDModelWithAnim = (props: MMDModelProps) => {
  const { modelPath, vmdPath } = props;
  const groupRef = useRef<Group>(new Group());

  const helper = useRef(new MMDAnimationHelper());

  useEffect(() => {
    // MMDLoaderのインスタンスを作成
    const loader = new MMDLoader();

    loader.load(
      modelPath,
      (model) => {
        // モデルをロードして、グループに追加
        groupRef.current.add(model);
        // meshがロード出来たらポーズ情報取得
        loader.loadAnimation(
          vmdPath, // モーションファイル
          model,
          (motion) => {
            if (motion instanceof AnimationClip)
              // 型エラー回避
              helper.current.add(model, { animation: motion, physics: false });
          }
        );
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("An error happened while loading MMD model:", error);
      }
    );
  }, [modelPath, vmdPath]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      //groupRef.current.rotation.y += 0.01; // モデルを回転させる例
      helper.current.update(delta);
    }
  });

  return <group ref={groupRef} />;
};
