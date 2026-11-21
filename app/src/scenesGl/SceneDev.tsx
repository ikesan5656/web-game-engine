/**
 * 開発用シーン
 * `EntityObjectRegistryProvider` の内側で描画すること（`useEntityObject` を使うため）
 */

import { TransformControls } from "@react-three/drei";
import { useCallback, useEffect } from "react";
import type { Object3D } from "three";
import { CameraControl } from "components/webGl/CameraControl";
import { EditorGrid } from "components/webGl/EditorGrid";
import { useEntityObject } from "components/webGl/sceneView/entityObjectRegistry";
import { SceneView } from "components/webGl/sceneView/SceneView";
import { ThreeGizmo } from "components/webGl/ThreeGizmo";
import { devSceneIds } from "core/scene/devScene";
import { findComponent, type Entity } from "core/scene/entity";
import type { Vec3 } from "core/math/vec3";
import type { EntityId } from "core/scene/entityId";
import { beginTransformDrag, endTransformDrag } from "redux/commands";
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

/** Object3D の位置を Vec3 にする（Vector3 は state に入れない） */
const toVec3 = (object: Object3D): Vec3 => [
  object.position.x,
  object.position.y,
  object.position.z,
];

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

  // TransformControls のドラッグ開始・確定。確定時に移動コマンドとして履歴に積む
  const onDragStart = useCallback(() => {
    if (selectedEntityId) dispatch(beginTransformDrag(selectedEntityId));
  }, [dispatch, selectedEntityId]);
  const onDragEnd = useCallback(() => {
    if (selectedEntityId && selectedObject) {
      dispatch(endTransformDrag(selectedEntityId, toVec3(selectedObject)));
    }
  }, [dispatch, selectedEntityId, selectedObject]);

  // ドラッグ中に TransformControls が外れたときも確定する（ドラッグ中でなければ何も起きない）
  useEffect(() => {
    if (!selectedEntityId || !selectedObject) return;
    // この effect が対象にしていたエンティティの ID と Object3D
    const entityId = selectedEntityId;
    const object = selectedObject;
    return () => {
      dispatch(endTransformDrag(entityId, toVec3(object)));
    };
  }, [dispatch, selectedEntityId, selectedObject]);

  return (
    <group>
      <CameraControl initialPosition={[0, 7, 8]} />
      <ThreeGizmo />
      {gridVisible && <EditorGrid />}

      {selectedObject && (
        <TransformControls
          object={selectedObject}
          mode={"translate"}
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
        />
      )}

      <SceneView
        entities={entities}
        isSelectable={isSelectable}
        onSelect={onSelect}
      />
    </group>
  );
};
