/**
 * 開発用シーン
 * `EntityObjectRegistryProvider` の内側で描画すること（`useEntityObject` を使うため）
 */

import { TransformControls } from "@react-three/drei";
import { useCallback } from "react";
import { CameraControl } from "components/webGl/CameraControl";
import { EditorGrid } from "components/webGl/EditorGrid";
import { useEntityObject } from "components/webGl/sceneView/entityObjectRegistry";
import { SceneView } from "components/webGl/sceneView/SceneView";
import { ThreeGizmo } from "components/webGl/ThreeGizmo";
import { devSceneIds } from "core/scene/devScene";
import { findComponent, type Entity } from "core/scene/entity";
import type { EntityId } from "core/scene/entityId";
import { selectEntity } from "redux/slices/selectionSlice";
import { useDispatch, useSelector } from "redux/store";

/**
 * クリックで選べるエンティティか。選択と移動を確かめるための暫定で、mesh を持つもの（床を除く）だけを選べる。
 * どれを選べるようにするかは、シーンビューのクリックでの選択（フェーズ 2）で決める。
 * SceneView の memo を効かせるため、コンポーネントの外に置いて参照を固定する
 */
const isSelectable = (entity: Entity) =>
  findComponent(entity, "mesh") !== undefined &&
  entity.id !== devSceneIds.floor;

export const SceneDev = () => {
  const dispatch = useDispatch();
  const selectedEntityId = useSelector(
    (state) => state.selection.selectedEntityId
  );
  const gridVisible = useSelector((state) => state.editorView.gridVisible);
  const entities = useSelector((state) => state.scene.entities);

  // 選択中の ID に当たる根の Object3D。未選択や、まだ描画されていないときは undefined
  const selectedObject = useEntityObject(selectedEntityId);

  // SceneView・EntityView の memo を効かせるため、useCallback で参照を固定する
  const onSelect = useCallback(
    (id: EntityId) => {
      dispatch(selectEntity(id));
    },
    [dispatch]
  );

  return (
    <group>
      <CameraControl initialPosition={[0, 7, 8]} />
      <ThreeGizmo />
      {gridVisible && <EditorGrid />}

      {selectedObject && (
        <TransformControls object={selectedObject} mode={"translate"} />
      )}

      <SceneView
        entities={entities}
        isSelectable={isSelectable}
        onSelect={onSelect}
      />
    </group>
  );
};
