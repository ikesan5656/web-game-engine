import type { Vec3 } from "core/math/vec3";

/** エンティティの位置・回転・スケール */
export type Transform = {
  position: Vec3;
  /** オイラー角（ラジアン）。回転の順序は XYZ 固定（three の Euler の既定と同じ） */
  rotation: Vec3;
  scale: Vec3;
};

/** 既定の Transform を作る。毎回新しい配列を返す（共有した配列を書き換えてしまう事故を防ぐ） */
export const createDefaultTransform = (): Transform => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
});
