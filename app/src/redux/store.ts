import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch as rawUseDispatch,
  useSelector as rawUseSelector,
  TypedUseSelectorHook,
} from "react-redux";
import editObjReducer from "redux/slices/editObjSlice";
import { editorViewReducer } from "redux/slices/editorViewSlice";

export const store = configureStore({
  reducer: {
    editObj: editObjReducer,
    editorView: editorViewReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useSelector: TypedUseSelectorHook<RootState> = rawUseSelector;
export const useDispatch: () => AppDispatch = rawUseDispatch;
