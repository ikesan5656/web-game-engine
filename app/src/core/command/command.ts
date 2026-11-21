import type { EntityId } from "core/scene/entityId";
import type { Transform } from "core/scene/transform";

/**
 * エンティティを動かすコマンド。
 * 履歴をシリアライズできるよう、データだけを持ち関数は持たない
 */
export type MoveEntityCommand = {
  type: "moveEntity";
  entityId: EntityId;
  before: Transform;
  after: Transform;
};

/** 編集操作を表すコマンド。種類が増えたらここに足す */
export type Command = MoveEntityCommand;
