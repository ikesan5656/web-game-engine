import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { EntityId } from "core/scene/entityId";
import type { Transform } from "core/scene/transform";

/**
 * TransformControls でのドラッグ中の状態。
 * ドラッグを始めたときの Transform を覚えておき、確定時に移動コマンドの before にする
 */
interface TransformEditState {
  // ドラッグ中でなければ null
  dragStart: { entityId: EntityId; before: Transform } | null;
}

const initialState: TransformEditState = { dragStart: null };

const transformEditSlice = createSlice({
  name: "transformEdit",
  initialState,
  reducers: {
    dragStarted(
      state,
      action: PayloadAction<{ entityId: EntityId; before: Transform }>
    ) {
      state.dragStart = action.payload;
    },
    dragEnded(state) {
      state.dragStart = null;
    },
  },
});

export const { dragStarted, dragEnded } = transformEditSlice.actions;
export const transformEditReducer = transformEditSlice.reducer;

export const selectIsTransformDragging = (state: {
  transformEdit: TransformEditState;
}) => state.transformEdit.dragStart !== null;
