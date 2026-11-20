import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { noRaycast } from "components/webGl/noRaycast";
import * as THREE from "three";

// 軸線の色
const X_AXIS_COLOR = "#e04040";
const Z_AXIS_COLOR = "#4070e0";
// 軸線の太さ（ピクセル）
const AXIS_THICKNESS = 2.0;
// 床・グリッドとのちらつきを避けるため、地面からわずかに浮かせる高さ
const AXES_HEIGHT = 0.02;

// カメラ位置を板の平面へ投影するための作業用オブジェクト（毎フレーム new しない）
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3(0, 0, 0);
const plane = new THREE.Plane();

// 頂点シェーダー。drei の Grid の infiniteGrid + followCamera の処理と同じ
const vertexShader = /* glsl */ `
  varying vec3 localPosition;
  varying vec4 worldPosition;

  uniform vec3 worldCamProjPosition;
  uniform vec3 worldPlanePosition;
  uniform float fadeDistance;

  void main() {
    localPosition = position.xzy;
    localPosition *= 1.0 + fadeDistance;

    worldPosition = modelMatrix * vec4(localPosition, 1.0);
    worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
    localPosition = (inverse(modelMatrix) * worldPosition).xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

// フラグメントシェーダー。z = 0 に X 軸、x = 0 に Z 軸を引き、Grid と同じ距離でフェードする
const fragmentShader = /* glsl */ `
  varying vec3 localPosition;
  varying vec4 worldPosition;

  uniform vec3 worldCamProjPosition;
  uniform vec3 xColor;
  uniform vec3 zColor;
  uniform float thickness;
  uniform float fadeDistance;
  uniform float fadeStrength;

  void main() {
    float aX = 1.0 - min(abs(localPosition.z) / fwidth(localPosition.z) + 1.0 - thickness, 1.0);
    float aZ = 1.0 - min(abs(localPosition.x) / fwidth(localPosition.x) + 1.0 - thickness, 1.0);

    float dist = distance(worldCamProjPosition, worldPosition.xyz);
    float d = 1.0 - min(dist / fadeDistance, 1.0);

    // 線の中心では aX・aZ が 1 を超えるので 0〜1 に収めてからフェードを掛ける
    float a = clamp(max(aX, aZ), 0.0, 1.0);
    vec3 color = aX >= aZ ? xColor : zColor;
    gl_FragColor = vec4(color, a * pow(d, fadeStrength));
    if (gl_FragColor.a <= 0.0) discard;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

interface GroundAxesProps {
  // フェードが終わる距離（カメラを地面に投影した点から）
  fadeDistance: number;
  // フェードのかかり方（大きいほど早く薄くなる）
  fadeStrength: number;
}

/**
 * 原点を通る X 軸（赤）と Z 軸（青）を地面に描く。
 * 板をカメラに追従させるので、端が見えず無限に伸びて見える。
 */
export const GroundAxes = ({ fadeDistance, fadeStrength }: GroundAxesProps) => {
  const ref =
    useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);

  // uniforms は一度だけ作る。カメラ追従の値は useFrame、props の値は useEffect で更新する
  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      worldCamProjPosition: { value: new THREE.Vector3() },
      worldPlanePosition: { value: new THREE.Vector3() },
      xColor: { value: new THREE.Color(X_AXIS_COLOR) },
      zColor: { value: new THREE.Color(Z_AXIS_COLOR) },
      thickness: { value: AXIS_THICKNESS },
      fadeDistance: { value: fadeDistance },
      fadeStrength: { value: fadeStrength },
    }),
    // 初期値にだけ使い、以降の変更は useEffect で反映する
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const u = mesh.material.uniforms;
    u.fadeDistance.value = fadeDistance;
    u.fadeStrength.value = fadeStrength;
  }, [fadeDistance, fadeStrength]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const u = mesh.material.uniforms;
    mesh.getWorldPosition(u.worldPlanePosition.value);
    plane
      .setFromNormalAndCoplanarPoint(UP, ZERO)
      .applyMatrix4(mesh.matrixWorld);
    plane.projectPoint(state.camera.position, u.worldCamProjPosition.value);
  });

  return (
    <mesh
      ref={ref}
      position={[0, AXES_HEIGHT, 0]}
      renderOrder={2}
      frustumCulled={false}
      raycast={noRaycast}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
};
