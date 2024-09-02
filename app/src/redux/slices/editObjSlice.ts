import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Object3D } from "three";
import { v4 as uuidv4 } from "uuid";

// 1. Stateの型定義
interface EditObjState {
  count: number;
  target: Object3D | undefined;
}

// 初期状態の定義
const initialState: EditObjState = {
  count: 0,
  target: undefined,
};

export const edirObjSlice = createSlice({
  name: "counter",
  initialState: initialState,
  reducers: {
    additional: (state, action) => {
      if (Number.isNaN(action.payload)) return;
      state.count += action.payload;
    },
    subtraction: (state, action) => {
      if (Number.isNaN(action.payload)) return;
      state.count -= action.payload;
    },
    setTarget: (state, action: PayloadAction<Object3D | undefined>) => {
      if (action.payload == undefined) return;
      if (state.target?.uuid == action.payload.uuid) return;

      console.log(action.payload);
      const obj = action.payload;
      obj.uuid = uuidv4();
      console.log(obj.uuid);
      state.target = obj;
    },
  },
});

export const { additional, subtraction, setTarget } = edirObjSlice.actions;
export default edirObjSlice.reducer;
