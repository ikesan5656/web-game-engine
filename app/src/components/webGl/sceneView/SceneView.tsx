import type { Entity } from "core/scene/entity";
import { EntityView } from "components/webGl/sceneView/EntityView";
import type { Object3D } from "three";

interface SceneViewProps {
  entities: Entity[];
  /** クリックで選べるエンティティか */
  isSelectable: (entity: Entity) => boolean;
  /** 選べるエンティティがクリックされたときに、エンティティと根の Object3D を受け取る */
  onSelect: (entity: Entity, root: Object3D) => void;
}

/**
 * シーンデータのエンティティを描画する。エンティティの順序や数が変わっても、ID ごとに描画を保つ
 */
export const SceneView = (props: SceneViewProps) => {
  const { entities, isSelectable, onSelect } = props;

  return (
    <>
      {entities.map((entity) => (
        <EntityView
          key={entity.id}
          entity={entity}
          selectable={isSelectable(entity)}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};
