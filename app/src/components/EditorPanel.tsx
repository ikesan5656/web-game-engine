import { Typography } from "@mui/material";
import { useId, type ReactNode } from "react";
import {
  StyledEditorPanel,
  StyledEditorPanelBody,
  StyledEditorPanelHeader,
  StyledEditorPanelTitle,
} from "styles/components/StyledEditorPanel";
import type { EditorLayoutArea } from "styles/components/StyledEditorLayout";
import { editorColors } from "styles/editorColors";

interface EditorPanelProps {
  /** 見出し */
  title: string;
  /** 配置先 */
  area: EditorLayoutArea;
  /** 本文があふれたときにスクロールするか。false なら切り捨てる（既定 true） */
  scrollable?: boolean;
  children?: ReactNode;
}

/** エディタの 4 つのパネルに共通の枠（見出しと本文） */
export const EditorPanel = ({
  title,
  area,
  scrollable = true,
  children,
}: EditorPanelProps) => {
  const titleId = useId();
  return (
    <StyledEditorPanel sx={{ gridArea: area }} aria-labelledby={titleId}>
      <StyledEditorPanelHeader>
        <StyledEditorPanelTitle id={titleId}>{title}</StyledEditorPanelTitle>
      </StyledEditorPanelHeader>
      <StyledEditorPanelBody scrollable={scrollable}>
        {children}
      </StyledEditorPanelBody>
    </StyledEditorPanel>
  );
};

/** パネルの中身を実装するまでの仮の表示 */
export const EditorPanelPlaceholder = () => (
  <Typography
    variant="body2"
    sx={{ p: 1.5, color: editorColors.panelSubText, fontFamily: "inherit" }}
  >
    （後続の Issue で実装）
  </Typography>
);
