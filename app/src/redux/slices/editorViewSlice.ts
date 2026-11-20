import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * エディタの表示設定
 */
interface EditorViewState {
  // グリッドと X・Z 軸線を表示するか
  gridVisible: boolean;
}

const initialState: EditorViewState = {
  gridVisible: true,
};

const editorViewSlice = createSlice({
  name: "editorView",
  initialState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.gridVisible = action.payload;
    },
  },
});

export const { setGridVisible } = editorViewSlice.actions;
export const editorViewReducer = editorViewSlice.reducer;
