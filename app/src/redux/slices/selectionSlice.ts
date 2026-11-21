import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { EntityId } from "core/scene/entityId";

/**
 * エディタの選択。選択中のエンティティを ID で持つ（Object3D は持たない）。
 * ID に当たる Object3D が要るときは、描画層の useEntityObject で引く
 */
interface SelectionState {
  // 選択中のエンティティ。未選択は null
  selectedEntityId: EntityId | null;
}

const initialState: SelectionState = {
  selectedEntityId: null,
};

const selectionSlice = createSlice({
  name: "selection",
  initialState,
  reducers: {
    selectEntity(state, action: PayloadAction<EntityId>) {
      state.selectedEntityId = action.payload;
    },
    clearSelection(state) {
      state.selectedEntityId = null;
    },
  },
});

export const { selectEntity, clearSelection } = selectionSlice.actions;
export const selectionReducer = selectionSlice.reducer;
