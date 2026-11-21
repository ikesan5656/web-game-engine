import type { SceneData } from "core/scene/sceneData";
import { toEntityId } from "core/scene/entityId";

/** 開発用シーンのエンティティの ID（固定） */
export const devSceneIds = {
  light: toEntityId("light"),
  floor: toEntityId("floor"),
  avatar: toEntityId("avatar"),
  cube: toEntityId("cube"),
  miku: toEntityId("miku"),
} as const;

/** 開発用シーンの初期データを作る。毎回新しいオブジェクトを返す（共有したデータを書き換えてしまう事故を防ぐ） */
export const createDevScene = (): SceneData => ({
  entities: [
    {
      id: devSceneIds.light,
      name: "ディレクショナルライト",
      transform: {
        position: [5, 5, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          type: "directionalLight",
          color: "#ffffff",
          intensity: 1,
          castShadow: true,
        },
      ],
    },
    {
      id: devSceneIds.floor,
      name: "床",
      transform: {
        position: [0, 0, 0],
        rotation: [-Math.PI / 2, 0, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          type: "mesh",
          shape: { kind: "circle", radius: 10 },
          material: { kind: "standard", color: "#ffffff" },
          castShadow: false,
          receiveShadow: true,
        },
      ],
    },
    {
      id: devSceneIds.avatar,
      name: "アバター",
      transform: {
        position: [0, 3, 0],
        rotation: [0, Math.PI, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          type: "model",
          format: "gltf",
          url: "AvatarSample_M_converted.glb",
        },
      ],
    },
    {
      id: devSceneIds.cube,
      name: "立方体",
      transform: {
        position: [-2, 1, -2],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          type: "mesh",
          shape: { kind: "box", width: 1, height: 1, depth: 1 },
          material: { kind: "normal" },
          castShadow: true,
          receiveShadow: false,
        },
      ],
    },
    {
      id: devSceneIds.miku,
      name: "初音ミク",
      transform: {
        position: [4, 0, -2],
        rotation: [0, 0, 0],
        scale: [0.3, 0.3, 0.3],
      },
      components: [
        {
          type: "model",
          format: "mmd",
          url: "miku/miku_v2.pmd",
          motionUrl: "miku/vmds/wavefile_v2.vmd",
        },
      ],
    },
  ],
});
