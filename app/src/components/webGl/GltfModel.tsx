import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

const GltfModel = () => {
  const { scene, animations } = useLoader(
    GLTFLoader,
    "/AvatarSample_M_converted.glb"
  );
  const mixer = new THREE.AnimationMixer(scene);
  //mixer.clipAction(animations[0]).play();
  //mixer.clipAction(animations[1]).play();

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return (
    <primitive object={scene} position={[0, 3, 0]} rotation={[0, Math.PI, 0]} />
  );
};

export default GltfModel;
