import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { SkinnedMesh } from "three";
import { MMDLoader } from "three/addons/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper";

interface MMDModelProps {
  modelPath: string;
  motionPath?: string;
  scale?: number | [number, number, number];
}

export const MMDModel = ({
  modelPath,
  motionPath,
  scale = 1,
}: MMDModelProps) => {
  console.log("描画");
  const mesh = useLoader(MMDLoader, modelPath) as SkinnedMesh;
  const helper = useRef<MMDAnimationHelper>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log("useEffect");
    // MMDLoaderのインスタンスを作成
    const loader = new MMDLoader();
    helper.current = new MMDAnimationHelper({
      afterglow: 2.0,
      physics: false, // TODO: ammo.jsを読み込めるようにする
      ik: true,
    });

    if (!motionPath) {
      console.log("モーションなし");
      setReady(true);
      return;
    }

    loader.loadAnimation(
      motionPath,
      mesh,
      (animation) => {
        helper.current!.add(mesh, {
          animation,
          physics: false, // TODO: ammo.jsを読み込めるようにする
          ik: true,
        });
        console.log("ready");
        setReady(true); // ← ここで初めて表示
      },
      undefined,
      (error) => {
        console.error("VMD load error", error);
      }
    );
  }, [mesh, motionPath]);

  useFrame((_, delta) => {
    if (!ready === true) return;
    console.log(ready);
    helper.current?.update(delta);
  });

  return (
    <group scale={scale} visible={ready}>
      <primitive object={mesh} />
    </group>
  );
};
