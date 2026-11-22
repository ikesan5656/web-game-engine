import { styled } from "@mui/material";
import { editorColors } from "styles/editorColors";

export const StyledEditorPanel = styled("section")({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  backgroundColor: editorColors.panelBackground,
});

export const StyledEditorPanelHeader = styled("div")({
  height: 38,
  flexShrink: 0,
  display: "flex",
  alignItems: "stretch",
  paddingLeft: 12,
  backgroundColor: editorColors.panelHeaderBackground,
  boxSizing: "border-box",
});

export const StyledEditorPanelTitle = styled("h2")({
  margin: 0,
  position: "relative",
  display: "flex",
  alignItems: "center",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: editorColors.panelTitle,
  whiteSpace: "nowrap",
  userSelect: "none",
  // 選択中のタブを表す飾りの下線（押せない）
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: editorColors.activeTabIndicator,
  },
});

interface StyledEditorPanelBodyProps {
  scrollable: boolean;
}

export const StyledEditorPanelBody = styled("div", {
  shouldForwardProp: (prop) => prop !== "scrollable",
})<StyledEditorPanelBodyProps>(({ scrollable }) => ({
  flex: 1,
  minHeight: 0,
  position: "relative",
  color: editorColors.panelSubText,
  fontSize: 12,
  overflow: scrollable ? "auto" : "hidden",
}));
