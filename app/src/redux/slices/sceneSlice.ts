import { createSlice } from "@reduxjs/toolkit";
import { applyCommand, revertCommand } from "core/command/applyCommand";
import { createDevScene } from "core/scene/devScene";
import type { SceneData } from "core/scene/sceneData";
import {
  commandExecuted,
  commandRedone,
  commandUndone,
} from "redux/commandActions";

/**
 * シーンデータ（正となるデータ）。
 * state は immer に凍結されるので、reducer の外で書き換えない。
 * 編集操作はコマンド（core/command）として applyCommand・revertCommand で反映する。
 * 実行・やり直しは applyCommand、取り消しは revertCommand
 */
const initialState: SceneData = createDevScene();

const sceneSlice = createSlice({
  name: "scene",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(commandExecuted, (state, action) =>
        applyCommand(state, action.payload)
      )
      .addCase(commandRedone, (state, action) =>
        applyCommand(state, action.payload)
      )
      .addCase(commandUndone, (state, action) =>
        revertCommand(state, action.payload)
      );
  },
});

export const sceneReducer = sceneSlice.reducer;
