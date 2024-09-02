import { KeyboardControlsEntry } from "@react-three/drei";
enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  jump = "jump",
  up = "up",
  down = "down",
  leftRotation = "leftRotation",
  rightRotation = "rightRotation",
}

export const keyConfigs: KeyboardControlsEntry<Controls>[] = [
  { name: Controls.forward, keys: ["KeyW"] },
  { name: Controls.backward, keys: ["KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  { name: Controls.up, keys: ["ArrowUp"] },
  { name: Controls.down, keys: ["ArrowDown"] },
  { name: Controls.leftRotation, keys: ["KeyQ"] },
  { name: Controls.rightRotation, keys: ["KeyE"] },
  { name: Controls.jump, keys: ["Space"] },
];
