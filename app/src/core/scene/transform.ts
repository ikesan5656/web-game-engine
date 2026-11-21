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

/** 2 つの Transform の中身が等しいか（要素ごとに `===` で比べる） */
export const transformEquals = (a: Transform, b: Transform): boolean => {
  const vecEquals = (x: Vec3, y: Vec3) =>
    x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
  return (
    vecEquals(a.position, b.position) &&
    vecEquals(a.rotation, b.rotation) &&
    vecEquals(a.scale, b.scale)
  );
};
