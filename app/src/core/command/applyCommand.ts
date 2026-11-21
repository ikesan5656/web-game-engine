import type { Command } from "core/command/command";
import type { EntityId } from "core/scene/entityId";
import type { SceneData } from "core/scene/sceneData";
import type { Transform } from "core/scene/transform";

/**
 * 対象のエンティティの transform を差し替えた新しいシーンを返す。
 * 他のエンティティは参照を保つ。対象の ID がなければ scene をそのまま返す
 */
const replaceEntityTransform = (
  scene: SceneData,
  id: EntityId,
  transform: Transform
): SceneData => {
  if (!scene.entities.some((e) => e.id === id)) return scene;
  return {
    ...scene,
    entities: scene.entities.map((e) =>
      e.id === id ? { ...e, transform } : e
    ),
  };
};

/** コマンドを適用した新しいシーンを返す */
export const applyCommand = (scene: SceneData, command: Command): SceneData => {
  switch (command.type) {
    case "moveEntity":
      return replaceEntityTransform(scene, command.entityId, command.after);
  }
};

/** コマンドを取り消した新しいシーンを返す */
export const revertCommand = (
  scene: SceneData,
  command: Command
): SceneData => {
  switch (command.type) {
    case "moveEntity":
      return replaceEntityTransform(scene, command.entityId, command.before);
  }
};
