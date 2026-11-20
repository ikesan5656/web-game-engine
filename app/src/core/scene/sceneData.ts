import type { Entity } from "core/scene/entity";

/** シーン全体のデータ。配列の順序がヒエラルキーの表示順。ID はシーン内で一意 */
export type SceneData = { entities: Entity[] };
