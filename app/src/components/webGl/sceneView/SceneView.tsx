import { memo } from "react";
import type { Entity } from "core/scene/entity";
import type { EntityId } from "core/scene/entityId";
import { EntityView } from "components/webGl/sceneView/EntityView";

interface SceneViewProps {
  entities: Entity[];
  /** クリックで選べるエンティティか。memo を効かせるため、参照を固定する（コンポーネントの外で定義するなど） */
  isSelectable: (entity: Entity) => boolean;
  /** 選べるエンティティがクリックされたときに、エンティティの ID を受け取る。memo を効かせるため、useCallback などで参照を固定する */
  onSelect: (id: EntityId) => void;
}

/**
 * シーンデータのエンティティを描画する。エンティティの順序や数が変わっても、ID ごとに描画を保つ。
 * memo で包み、props が変わらなければ（選択の変更などで親が再描画されても）再描画しない。
 * EntityObjectRegistryProvider の内側で描画すること
 */
export const SceneView = memo(function SceneView(props: SceneViewProps) {
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
});
