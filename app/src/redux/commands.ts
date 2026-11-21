import type { Command } from "core/command/command";
import type { Vec3 } from "core/math/vec3";
import type { EntityId } from "core/scene/entityId";
import { transformEquals } from "core/scene/transform";
import {
  commandExecuted,
  commandRedone,
  commandUndone,
} from "redux/commandActions";
import { dragEnded, dragStarted } from "redux/slices/transformEditSlice";
import type { AppThunk } from "redux/store";

/** コマンドを実行して履歴に積む */
export const executeCommand =
  (command: Command): AppThunk =>
  (dispatch) => {
    dispatch(commandExecuted(command));
  };

/** 直近のコマンドを取り消す。ドラッグ中や履歴が空のときは何もしない */
export const undo = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  if (state.transformEdit.dragStart !== null) return;
  const command = state.history.past[state.history.past.length - 1];
  if (!command) return;
  dispatch(commandUndone(command));
};

/** 取り消したコマンドをやり直す。ドラッグ中や履歴が空のときは何もしない */
export const redo = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  if (state.transformEdit.dragStart !== null) return;
  const command = state.history.future[state.history.future.length - 1];
  if (!command) return;
  dispatch(commandRedone(command));
};

/** TransformControls のドラッグ開始。動かす前の Transform を覚える */
export const beginTransformDrag =
  (entityId: EntityId): AppThunk =>
  (dispatch, getState) => {
    const entity = getState().scene.entities.find((e) => e.id === entityId);
    if (!entity) return;
    dispatch(dragStarted({ entityId, before: entity.transform }));
  };

/**
 * TransformControls のドラッグ確定。位置が変わっていれば移動コマンドとして積む。
 * 今は translate 固定なので、回転とスケールは動かす前のまま
 */
export const endTransformDrag =
  (entityId: EntityId, position: Vec3): AppThunk =>
  (dispatch, getState) => {
    const dragStart = getState().transformEdit.dragStart;
    if (dragStart === null) return;
    const { before } = dragStart;
    const after = { ...before, position };
    // 開始時と別のエンティティの確定や、位置が変わっていないときは積まない
    if (dragStart.entityId === entityId && !transformEquals(before, after)) {
      dispatch(executeCommand({ type: "moveEntity", entityId, before, after }));
    }
    dispatch(dragEnded());
  };
