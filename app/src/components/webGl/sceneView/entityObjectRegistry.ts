import { createContext, useContext, useSyncExternalStore } from "react";
import type { Object3D } from "three";
import type { EntityId } from "core/scene/entityId";

/**
 * エンティティ ID から、そのエンティティの根の Object3D（EntityView の根の group）を引く表。
 * Object3D は Redux に持たないため、描画層のこの表で ID と結び付ける
 */
export interface EntityObjectRegistry {
  /** ID に根の Object3D を結び付ける。同じ ID の登録があれば置き換える */
  register: (id: EntityId, object: Object3D) => void;
  /**
   * 登録を外す。登録中の Object3D が object と同じときだけ外す
   * （StrictMode などで別の Object3D が先に登録し直された場合に、それを消さないため）
   */
  unregister: (id: EntityId, object: Object3D) => void;
  /** ID に結び付いた Object3D。登録がなければ undefined */
  get: (id: EntityId) => Object3D | undefined;
  /** 登録が変わったときに呼ぶ関数を足す。戻り値で外す */
  subscribe: (listener: () => void) => () => void;
}

export const createEntityObjectRegistry = (): EntityObjectRegistry => {
  const objects = new Map<EntityId, Object3D>();
  const listeners = new Set<() => void>();

  const notify = () => {
    // 呼び出し中に購読の追加・解除で listeners が変わっても影響しないよう、写しを回す
    [...listeners].forEach((listener) => listener());
  };

  return {
    register: (id, object) => {
      if (objects.get(id) === object) return;
      objects.set(id, object);
      notify();
    },
    unregister: (id, object) => {
      if (objects.get(id) !== object) return;
      objects.delete(id);
      notify();
    },
    get: (id) => objects.get(id),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const EntityObjectRegistryContext =
  createContext<EntityObjectRegistry | null>(null);

/** 表を取り出す。EntityObjectRegistryProvider の外で呼ぶと例外を投げる */
export const useEntityObjectRegistry = (): EntityObjectRegistry => {
  const registry = useContext(EntityObjectRegistryContext);
  if (registry === null) {
    throw new Error(
      "EntityObjectRegistry が見つかりません。EntityObjectRegistryProvider の内側で描画すること"
    );
  }
  return registry;
};

/**
 * ID に当たる根の Object3D を返す。未選択（null）や未登録なら undefined。
 * 登録や登録の解除に追従して再描画する
 */
export const useEntityObject = (id: EntityId | null): Object3D | undefined => {
  const registry = useEntityObjectRegistry();
  return useSyncExternalStore(registry.subscribe, () =>
    id === null ? undefined : registry.get(id)
  );
};
