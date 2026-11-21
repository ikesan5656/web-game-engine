import { Suspense } from "react";
import type { ModelComponent } from "core/scene/components";
import { GltfModel } from "components/webGl/GltfModel";
import { MMDModel } from "components/webGl/MMDModel";
import { resolvePublicUrl } from "components/webGl/sceneView/resolvePublicUrl";

interface ModelViewProps {
  model: ModelComponent;
}

/** 外部ファイルのモデル。読み込み中はそのモデルだけを表示しない */
export const ModelView = (props: ModelViewProps) => {
  const { model } = props;

  return (
    <Suspense fallback={null}>
      {model.format === "gltf" ? (
        <GltfModel url={resolvePublicUrl(model.url)} />
      ) : (
        <MMDModel
          modelUrl={resolvePublicUrl(model.url)}
          motionUrl={
            model.motionUrl === null ? null : resolvePublicUrl(model.motionUrl)
          }
        />
      )}
    </Suspense>
  );
};
