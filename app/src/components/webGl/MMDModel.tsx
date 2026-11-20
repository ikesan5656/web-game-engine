import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AnimationClip, SkinnedMesh } from "three";
import { MMDAnimationHelper, MMDLoader } from "three-stdlib";

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
  const helper = useRef<MMDAnimationHelper>(undefined);
  const [motionLoaded, setMotionLoaded] = useState(false);
  // モーションがなければ読み込みを待たずに表示する
  const ready = !motionPath || motionLoaded;

  useEffect(() => {
    console.log("useEffect");
    // MMDLoaderのインスタンスを作成
    const loader = new MMDLoader();
    // IK はデフォルトで有効
    helper.current = new MMDAnimationHelper({ afterglow: 2.0 });

    if (!motionPath) {
      console.log("モーションなし");
      return;
    }

    loader.loadAnimation(
      motionPath,
      mesh,
      (animation) => {
        // SkinnedMesh に読み込んだときは AnimationClip が返る
        if (!(animation instanceof AnimationClip)) return;
        helper.current!.add(mesh, {
          animation,
          physics: false, // TODO: ammo.jsを読み込めるようにする
        });
        console.log("ready");
        setMotionLoaded(true); // ← ここで初めて表示
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
