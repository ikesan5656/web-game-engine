import type { Component, ComponentType } from "core/scene/components";
import type { EntityId } from "core/scene/entityId";
import type { Transform } from "core/scene/transform";

/**
 * シーンに置くもの。同じ種類のコンポーネントは 1 つまで（型では強制しない約束）。
 * 親子関係はフェーズ 3 で parentId: EntityId | null を足す
 */
export type Entity = {
  id: EntityId;
  name: string;
  transform: Transform;
  components: Component[];
};

/** 指定した種類のコンポーネントを返す。なければ undefined */
export const findComponent = <T extends ComponentType>(
  entity: Entity,
  type: T
): Extract<Component, { type: T }> | undefined =>
  entity.components.find(
    (c): c is Extract<Component, { type: T }> => c.type === type
  );
