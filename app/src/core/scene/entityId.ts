/** シーン内で一意な文字列。名前や URL と取り違えないようにブランド型にする */
export type EntityId = string & { readonly __brand: "EntityId" };

/** 固定の ID や、JSON から読んだ文字列を EntityId として扱う */
export const toEntityId = (value: string): EntityId => value as EntityId;

/** 新しいエンティティ ID を作る（セキュアコンテキストが必要。localhost と https では使える） */
export const createEntityId = (): EntityId => toEntityId(crypto.randomUUID());
