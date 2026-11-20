import { Grid } from "@react-three/drei";
import { GroundAxes } from "components/webGl/GroundAxes";
import { noRaycast } from "components/webGl/noRaycast";

// グリッドと軸線が消えるまでの距離（m）
const FADE_DISTANCE = 50;
// フェードのかかり方
const FADE_STRENGTH = 1.5;
// 細線・太線の間隔（m）
const CELL_SIZE = 1;
const SECTION_SIZE = 10;
// 線の色（無彩色。赤・青は軸線だけに使う）
const CELL_COLOR = "#4a4a4a";
const SECTION_COLOR = "#1f1f1f";
// 線の太さ
const CELL_THICKNESS = 0.6;
const SECTION_THICKNESS = 1.4;
// 床とのちらつきを避けるため、地面からわずかに浮かせる高さ
const GRID_HEIGHT = 0.01;

/**
 * 原点を起点とするエディタ用のグリッド。
 * 1m・10m の 2 段の線と、原点を通る X 軸・Z 軸を地面に描く。
 */
export const EditorGrid = () => {
  return (
    <group>
      {/* args は必須。ないと板の端で線が切れる */}
      <Grid
        args={[2, 2]}
        cellSize={CELL_SIZE}
        sectionSize={SECTION_SIZE}
        cellColor={CELL_COLOR}
        sectionColor={SECTION_COLOR}
        cellThickness={CELL_THICKNESS}
        sectionThickness={SECTION_THICKNESS}
        fadeDistance={FADE_DISTANCE}
        fadeStrength={FADE_STRENGTH}
        infiniteGrid
        followCamera
        position={[0, GRID_HEIGHT, 0]}
        renderOrder={1}
        raycast={noRaycast}
      />
      <GroundAxes fadeDistance={FADE_DISTANCE} fadeStrength={FADE_STRENGTH} />
    </group>
  );
};
