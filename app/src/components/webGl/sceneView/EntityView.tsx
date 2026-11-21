import { useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import type { Component } from "core/scene/components";
import type { Entity } from "core/scene/entity";
import type { EntityId } from "core/scene/entityId";
import { DirectionalLightCustom } from "components/webGl/DirectionalLightCustom";
import { MeshView } from "components/webGl/sceneView/MeshView";
import { useEntityObjectRegistry } from "components/webGl/sceneView/entityObjectRegistry";
import { ModelView } from "components/webGl/sceneView/ModelView";

interface EntityViewProps {
  entity: Entity;
  /** クリックで選べるか */
  selectable: boolean;
  /** クリックされたときに、エンティティの ID を受け取る。memo を効かせるため、呼び出し側で参照を固定する */
  onSelect: (id: EntityId) => void;
}

/** コンポーネントの種類に応じて描画する */
const renderComponent = (component: Component) => {
  switch (component.type) {
    case "mesh":
      return <MeshView key={component.type} mesh={component} />;
    case "model":
      return <ModelView key={component.type} model={component} />;
    case "directionalLight":
      return <DirectionalLightCustom key={component.type} light={component} />;
    default: {
      const unreachable: never = component;
      return unreachable;
    }
  }
};

/**
 * 1 つのエンティティを描画する。Transform は根の group に反映する。
 * 配列をそのまま渡すので、データが変わらない限り再描画しても Transform を再適用しない
 * （TransformControls で動かした位置が戻らない）。
 * 根の group を ID と結び付けて EntityObjectRegistry に登録する（EntityObjectRegistryProvider の内側で描画すること）。
 * memo で包み、props（entity・selectable・onSelect）が変わらなければ再描画しない
 */
export const EntityView = memo(function EntityView(props: EntityViewProps) {
  const { entity, selectable, onSelect } = props;
  const { position, rotation, scale } = entity.transform;
  const rootRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  // ホバー中に選べなくなると onPointerOut が呼ばれず hovered が残るので、描画中に戻す
  // （effect で戻すと react-hooks/set-state-in-effect に当たるため、描画中に state を調整する）
  if (!selectable && hovered) setHovered(false);
  useCursor(selectable && hovered);

  // 根の group を ID で引けるように登録し、アンマウントや ID の変更で外す。
  // インラインの ref コールバックだと描画ごとに解除と登録が走り、通知が繰り返されるため effect で行う
  const registry = useEntityObjectRegistry();
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    registry.register(entity.id, root);
    return () => registry.unregister(entity.id, root);
  }, [registry, entity.id]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // 子のメッシュから伝わるので、奥の物や親に伝えない
    e.stopPropagation();
    onSelect(entity.id);
  };

  return (
    <group
      ref={rootRef}
      name={entity.name}
      position={position}
      rotation={rotation}
      scale={scale}
      // ハンドラを持たない物は R3F の raycast の対象外になり、クリックすると onPointerMissed で選択が外れる
      onClick={selectable ? onClick : undefined}
      onPointerOver={selectable ? () => setHovered(true) : undefined}
      onPointerOut={selectable ? () => setHovered(false) : undefined}
    >
      {entity.components.map(renderComponent)}
    </group>
  );
});
