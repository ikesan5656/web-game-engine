import { useState, type ReactNode } from "react";
import {
  createEntityObjectRegistry,
  EntityObjectRegistryContext,
} from "components/webGl/sceneView/entityObjectRegistry";

interface EntityObjectRegistryProviderProps {
  children: ReactNode;
}

/**
 * エンティティ ID から根の Object3D を引く表を、子孫に渡す。
 * EntityView と useEntityObject を使う部品は、この内側で描画する
 */
export const EntityObjectRegistryProvider = (
  props: EntityObjectRegistryProviderProps
) => {
  const { children } = props;
  // 表は描画をまたいで同じものを使う
  const [registry] = useState(createEntityObjectRegistry);

  return (
    <EntityObjectRegistryContext value={registry}>
      {children}
    </EntityObjectRegistryContext>
  );
};
