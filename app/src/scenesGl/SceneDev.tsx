/**
 * 開発用シーン
 */

import { TransformControls } from "@react-three/drei";
import { useCallback } from "react";
import type { Object3D } from "three";
import { CameraControl } from "components/webGl/CameraControl";
import { EditorGrid } from "components/webGl/EditorGrid";
import { SceneView } from "components/webGl/sceneView/SceneView";
import { ThreeGizmo } from "components/webGl/ThreeGizmo";
import { devSceneIds } from "core/scene/devScene";
import { findComponent, type Entity } from "core/scene/entity";
import { setTarget } from "redux/slices/editObjSlice";
import { useDispatch, useSelector } from "redux/store";

/**
 * クリックで選べるエンティティか。選択と移動を確かめるための暫定で、mesh を持つもの（床を除く）だけを選べる。
 * どれを選べるようにするかは、シーンビューのクリックでの選択（フェーズ 2）で決める
 */
const isSelectable = (entity: Entity) =>
  findComponent(entity, "mesh") !== undefined &&
  entity.id !== devSceneIds.floor;

export const SceneDev = () => {
  const dispatch = useDispatch();
  const target = useSelector((state) => state.editObj.target);
  const gridVisible = useSelector((state) => state.editorView.gridVisible);
  const entities = useSelector((state) => state.scene.entities);

  // 暫定で Object3D を選択として持つ。選択の ID 化で置き換える
  const onSelect = useCallback(
    (_entity: Entity, root: Object3D) => {
      dispatch(setTarget(root));
    },
    [dispatch]
  );

  return (
    <group>
      <CameraControl initialPosition={[0, 7, 8]} />
      <ThreeGizmo />
      {gridVisible && <EditorGrid />}

      {target && <TransformControls object={target} mode={"translate"} />}

      <SceneView
        entities={entities}
        isSelectable={isSelectable}
        onSelect={onSelect}
      />
    </group>
  );
};
