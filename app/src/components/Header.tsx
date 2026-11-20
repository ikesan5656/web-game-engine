import { FormControlLabel, Switch } from "@mui/material";
import { setGridVisible } from "redux/slices/editorViewSlice";
import { useDispatch, useSelector } from "redux/store";
import { StyledHeader } from "styles/components/StyledHeader";

export const Header = () => {
  const gridVisible = useSelector((state) => state.editorView.gridVisible);
  const dispatch = useDispatch();

  return (
    <StyledHeader>
      <nav>
        <ul className="nav-links">
          <li>Home</li>
          <li>Menu</li>
        </ul>
      </nav>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={gridVisible}
            onChange={(_, checked) => dispatch(setGridVisible(checked))}
            sx={{
              // 背景（#222）の上でオフのトラックが見えるように灰色にする
              "& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track": {
                backgroundColor: "#9e9e9e",
                opacity: 1,
              },
            }}
          />
        }
        label="グリッド"
        sx={{ mr: 2 }}
      />
    </StyledHeader>
  );
};
