import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch as rawUseDispatch,
  useSelector as rawUseSelector,
  TypedUseSelectorHook,
} from "react-redux";
import { editorViewReducer } from "redux/slices/editorViewSlice";
import { sceneReducer } from "redux/slices/sceneSlice";
import { selectionReducer } from "redux/slices/selectionSlice";

export const store = configureStore({
  reducer: {
    selection: selectionReducer,
    editorView: editorViewReducer,
    scene: sceneReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useSelector: TypedUseSelectorHook<RootState> = rawUseSelector;
export const useDispatch: () => AppDispatch = rawUseDispatch;
