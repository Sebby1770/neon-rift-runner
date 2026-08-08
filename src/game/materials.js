import * as THREE from 'three';

export const palette = {
  cyan: 0x29f6c9,
  amber: 0xffb13d,
  rose: 0xff3f65,
  lime: 0xb8ff4d,
  blue: 0x4cb3ff,
  violet: 0xbf72ff,
  white: 0xf8fbff,
};

export function createMaterials() {
  return {
    shipBody: new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      metalness: 0.78,
      roughness: 0.18,
      emissive: 0x172c34,
      emissiveIntensity: 0.3,
    }),
    shipGlass: new THREE.MeshStandardMaterial({
      color: 0x10151b,
      metalness: 0.2,
      roughness: 0.08,
      emissive: palette.cyan,
      emissiveIntensity: 0.7,
    }),
    shipTrail: new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    gate: new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    }),
    hazard: new THREE.MeshStandardMaterial({
      color: 0x22060b,
      emissive: palette.rose,
      emissiveIntensity: 1.9,
      metalness: 0.45,
      roughness: 0.22,
    }),
    pickup: new THREE.MeshStandardMaterial({
      color: 0x13231b,
      emissive: palette.lime,
      emissiveIntensity: 1.7,
      metalness: 0.25,
      roughness: 0.18,
    }),
    shieldPickup: new THREE.MeshStandardMaterial({
      color: 0x121b2a,
      emissive: palette.blue,
      emissiveIntensity: 1.8,
      metalness: 0.25,
      roughness: 0.12,
    }),
    riftPickup: new THREE.MeshStandardMaterial({
      color: 0x211324,
      emissive: palette.violet,
      emissiveIntensity: 2.1,
      metalness: 0.35,
      roughness: 0.12,
    }),
    shockwave: new THREE.MeshBasicMaterial({
      color: palette.white,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    speedStreak: new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    rail: new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    }),
    cityA: new THREE.MeshStandardMaterial({
      color: 0x11151c,
      metalness: 0.38,
      roughness: 0.58,
      emissive: 0x061212,
      emissiveIntensity: 0.25,
    }),
    cityB: new THREE.MeshStandardMaterial({
      color: 0x151018,
      metalness: 0.28,
      roughness: 0.66,
      emissive: 0x180a10,
      emissiveIntensity: 0.25,
    }),
  };
}
