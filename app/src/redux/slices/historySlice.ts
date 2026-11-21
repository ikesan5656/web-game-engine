import { createSlice } from "@reduxjs/toolkit";
import type { Command } from "core/command/command";
import {
  commandExecuted,
  commandRedone,
  commandUndone,
} from "redux/commandActions";

/** 履歴に残すコマンドの上限。超えたら古いものから捨てる */
export const HISTORY_LIMIT = 100;

/** Undo/Redo の履歴。past の末尾が直近に実行したコマンド */
interface HistoryState {
  past: Command[];
  future: Command[];
}

const initialState: HistoryState = { past: [], future: [] };

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(commandExecuted, (state, action) => {
        state.past.push(action.payload);
        if (state.past.length > HISTORY_LIMIT) {
          state.past.splice(0, state.past.length - HISTORY_LIMIT);
        }
        state.future = [];
      })
      .addCase(commandUndone, (state) => {
        const command = state.past.pop();
        if (command) state.future.push(command);
      })
      .addCase(commandRedone, (state) => {
        const command = state.future.pop();
        if (command) state.past.push(command);
      });
  },
});

export const historyReducer = historySlice.reducer;

export const selectCanUndo = (state: { history: HistoryState }) =>
  state.history.past.length > 0;
export const selectCanRedo = (state: { history: HistoryState }) =>
  state.history.future.length > 0;
