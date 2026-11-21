import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

interface GltfModelProps {
  /** 読み込む URL（BASE_URL を付けたもの） */
  url: string;
}

/**
 * glTF（.gltf/.glb）のモデル。
 * useLoader は同じ URL で同じ scene を返すので、複製して同じモデルを複数置けるようにする
 */
export const GltfModel = (props: GltfModelProps) => {
  const { url } = props;
  const { scene } = useLoader(GLTFLoader, url);
  const model = useMemo(() => clone(scene), [scene]);

  return <primitive object={model} />;
};
