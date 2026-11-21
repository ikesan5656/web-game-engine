import { createSlice } from "@reduxjs/toolkit";
import { createDevScene } from "core/scene/devScene";
import type { SceneData } from "core/scene/sceneData";

/**
 * シーンデータ（正となるデータ）。
 * state は immer に凍結されるので、reducer の外で書き換えない。
 * 移動などの編集操作は次以降でコマンドとして reducer に足す
 */
const initialState: SceneData = createDevScene();

const sceneSlice = createSlice({
  name: "scene",
  initialState,
  reducers: {},
});

export const sceneReducer = sceneSlice.reducer;
