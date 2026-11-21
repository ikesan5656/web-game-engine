import { configureStore, ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import {
  useDispatch as rawUseDispatch,
  useSelector as rawUseSelector,
  TypedUseSelectorHook,
} from "react-redux";
import { editorViewReducer } from "redux/slices/editorViewSlice";
import { historyReducer } from "redux/slices/historySlice";
import { sceneReducer } from "redux/slices/sceneSlice";
import { selectionReducer } from "redux/slices/selectionSlice";
import { transformEditReducer } from "redux/slices/transformEditSlice";

export const store = configureStore({
  reducer: {
    selection: selectionReducer,
    editorView: editorViewReducer,
    scene: sceneReducer,
    history: historyReducer,
    transformEdit: transformEditReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk = ThunkAction<void, RootState, unknown, UnknownAction>;
export const useSelector: TypedUseSelectorHook<RootState> = rawUseSelector;
export const useDispatch: () => AppDispatch = rawUseDispatch;
