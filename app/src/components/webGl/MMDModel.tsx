import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AnimationClip, SkinnedMesh } from "three";
import { MMDAnimationHelper, MMDLoader } from "three-stdlib";

interface MMDModelProps {
  /** モデル（.pmd/.pmx）の URL（BASE_URL を付けたもの）。テクスチャは同じフォルダから読む */
  modelUrl: string;
  /** モーション（.vmd）の URL（BASE_URL を付けたもの）。モーションがなければ null */
  motionUrl: string | null;
}

/**
 * MMD のモデル。モーションがあれば、読み終えるまで隠してから再生する。
 * useLoader は同じ URL で同じ mesh を返し、MMDAnimationHelper は同じ mesh を 2 回登録できないため、
 * 同じ URL のモデルを 2 体置けない
 */
export const MMDModel = (props: MMDModelProps) => {
  const { modelUrl, motionUrl } = props;
  const mesh = useLoader(MMDLoader, modelUrl) as SkinnedMesh;
  const helperRef = useRef<MMDAnimationHelper>(undefined);
  const [motionState, setMotionState] = useState<
    "loading" | "loaded" | "failed"
  >("loading");
  // モーションがなければ読み込みを待たずに表示する。読み込みに失敗したときはモーションなしで表示する
  const ready = motionUrl === null || motionState !== "loading";

  useEffect(() => {
    if (motionUrl === null) return;
    // 後片付けのあとに読み込みが終わったときに、helper に登録しないようにする（StrictMode の二重実行など）
    let cancelled = false;
    // IK は既定で有効
    const helper = new MMDAnimationHelper({ afterglow: 2.0 });

    new MMDLoader().loadAnimation(
      motionUrl,
      mesh,
      (animation) => {
        if (cancelled) return;
        // SkinnedMesh に読み込んだときは AnimationClip が返る
        if (!(animation instanceof AnimationClip)) {
          console.error("VMD is not AnimationClip", animation);
          setMotionState("failed");
          return;
        }
        helper.add(mesh, {
          animation,
          physics: false, // TODO: ammo.js を読み込めるようにする
        });
        helperRef.current = helper;
        setMotionState("loaded");
      },
      undefined,
      (error) => {
        if (cancelled) return;
        console.error("VMD load error", error);
        setMotionState("failed");
      }
    );

    return () => {
      cancelled = true;
      if (helperRef.current === helper) {
        // helper.remove は mixer を止めずポーズも戻さないので、先に止めてから外し、初期の姿勢に戻す
        const mixer = helper.objects.get(mesh)?.mixer;
        mixer?.stopAllAction();
        mixer?.uncacheRoot(mesh);
        helper.remove(mesh);
        mesh.pose();
        helperRef.current = undefined;
      }
      setMotionState("loading");
    };
  }, [mesh, motionUrl]);

  useFrame((_, delta) => {
    if (!ready) return;
    helperRef.current?.update(delta);
  });

  return (
    <group visible={ready}>
      <primitive object={mesh} />
    </group>
  );
};
