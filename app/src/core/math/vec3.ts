/**
 * [x, y, z]。値は有限の数（NaN・Infinity を入れない。JSON にすると null になるため）。
 * readonly にしない（R3F の position などに渡すと型エラーになるため）
 */
export type Vec3 = [x: number, y: number, z: number];
