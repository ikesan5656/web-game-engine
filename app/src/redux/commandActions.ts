import { createAction } from "@reduxjs/toolkit";
import type { Command } from "core/command/command";

/** コマンドを実行した（履歴に積む）。redux/commands.ts の executeCommand からだけ dispatch する */
export const commandExecuted = createAction<Command>("command/executed");
/**
 * コマンドを取り消した（Undo）。redux/commands.ts の undo からだけ dispatch する。
 * historySlice は payload を見ずに past から取り出すため、直接 dispatch すると履歴とシーンが食い違う
 */
export const commandUndone = createAction<Command>("command/undone");
/**
 * 取り消したコマンドをやり直した（Redo）。redux/commands.ts の redo からだけ dispatch する。
 * historySlice は payload を見ずに future から取り出すため、直接 dispatch すると履歴とシーンが食い違う
 */
export const commandRedone = createAction<Command>("command/redone");
