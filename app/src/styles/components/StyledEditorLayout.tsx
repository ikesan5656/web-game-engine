import { styled } from "@mui/material";
import { editorColors } from "styles/editorColors";

/** パネルの配置先の名前（grid-area） */
export type EditorLayoutArea = "hierarchy" | "scene" | "inspector" | "project";

/**
 * エディタのパネル配置（Hierarchy／Scene／Inspector／Project）。
 * gap の 1px を境界線に見せるため、背景を境界線の色で塗る
 */
export const StyledEditorLayout = styled("div")({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "240px minmax(0, 1fr) 300px",
  gridTemplateRows: "minmax(0, 1fr) 200px",
  gridTemplateAreas: '"hierarchy scene inspector" "project project inspector"',
  gap: "1px",
  backgroundColor: editorColors.panelBorder,
  // #root の text-align: center を打ち消す
  textAlign: "left",
});
