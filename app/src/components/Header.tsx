import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { Box, FormControlLabel, IconButton, Switch } from "@mui/material";
import { redo, undo } from "redux/commands";
import { setGridVisible } from "redux/slices/editorViewSlice";
import { selectCanRedo, selectCanUndo } from "redux/slices/historySlice";
import { useDispatch, useSelector } from "redux/store";
import { StyledHeader } from "styles/components/StyledHeader";

// 背景（#222）の上で見えるように白にし、無効時は薄くする
const iconButtonSx = {
  color: "#fff",
  "&.Mui-disabled": { color: "rgba(255,255,255,0.3)" },
};

export const Header = () => {
  const gridVisible = useSelector((state) => state.editorView.gridVisible);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const dispatch = useDispatch();

  return (
    <StyledHeader>
      <nav>
        <ul className="nav-links">
          <li>Home</li>
          <li>Menu</li>
        </ul>
      </nav>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label="元に戻す (Ctrl+Z)"
          title="元に戻す (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => dispatch(undo())}
          sx={iconButtonSx}
        >
          <UndoIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="やり直す (Ctrl+Shift+Z / Ctrl+Y)"
          title="やり直す (Ctrl+Shift+Z / Ctrl+Y)"
          disabled={!canRedo}
          onClick={() => dispatch(redo())}
          sx={iconButtonSx}
        >
          <RedoIcon fontSize="small" />
        </IconButton>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={gridVisible}
              onChange={(_, checked) => dispatch(setGridVisible(checked))}
              sx={{
                // 背景（#222）の上でオフのトラックが見えるように灰色にする
                "& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track":
                  {
                    backgroundColor: "#9e9e9e",
                    opacity: 1,
                  },
              }}
            />
          }
          label="グリッド"
          sx={{ mr: 2 }}
        />
      </Box>
    </StyledHeader>
  );
};
