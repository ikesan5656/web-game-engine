/** CSS の色文字列（"#rrggbb" を使う） */
export type Color = string;

/** 基本形状。寸法だけを持ち、分割数は描画層で three の既定値を使う。plane と circle は XY 平面にある */
export type MeshShape =
  | { kind: "box"; width: number; height: number; depth: number }
  | { kind: "sphere"; radius: number }
  | { kind: "plane"; width: number; height: number }
  | { kind: "circle"; radius: number };

/** メッシュのマテリアル */
export type MeshMaterial =
  { kind: "standard"; color: Color } | { kind: "normal" };

/** 基本形状のメッシュ */
export type MeshComponent = {
  type: "mesh";
  shape: MeshShape;
  material: MeshMaterial;
  castShadow: boolean;
  receiveShadow: boolean;
};

/** 外部ファイルから読み込むモデル */
export type ModelComponent = {
  type: "model";
  format: "gltf";
  /** public/ からの相対パス（先頭に / を付けない）。描画層で BASE_URL を前に付ける。フェーズ 4 でアセット ID に置き換える */
  url: string;
};

/** ディレクショナルライト。向きは位置から原点（three の既定の target）へ向かう。Transform の回転とスケールは使わない */
export type DirectionalLightComponent = {
  type: "directionalLight";
  color: Color;
  intensity: number;
  castShadow: boolean;
};

/** エンティティに付けるコンポーネント。type で判別する */
export type Component =
  MeshComponent | ModelComponent | DirectionalLightComponent;

/** コンポーネントの種類 */
export type ComponentType = Component["type"];
