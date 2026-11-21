import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch as rawUseDispatch,
  useSelector as rawUseSelector,
  TypedUseSelectorHook,
} from "react-redux";
import editObjReducer, { setTarget } from "redux/slices/editObjSlice";
import { editorViewReducer } from "redux/slices/editorViewSlice";
import { sceneReducer } from "redux/slices/sceneSlice";

export const store = configureStore({
  reducer: {
    editObj: editObjReducer,
    editorView: editorViewReducer,
    scene: sceneReducer,
  },
  // editObj.target は Object3D をそのまま持ち、TransformControls や MMD のモーションが
  // 書き換えるため、開発時のチェックから外す。選択の ID 化で削除する
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: { ignoredPaths: ["editObj.target"] },
      serializableCheck: {
        ignoredPaths: ["editObj.target"],
        ignoredActions: [setTarget.type],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useSelector: TypedUseSelectorHook<RootState> = rawUseSelector;
export const useDispatch: () => AppDispatch = rawUseDispatch;
