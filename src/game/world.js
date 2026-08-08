import * as THREE from 'three';
import { palette } from './materials.js';
import { randFloat, randFloatSpread, random } from './rng.js';

export function createWorldGroups() {
  const groups = {
    world: new THREE.Group(),
    obstacles: new THREE.Group(),
    pickups: new THREE.Group(),
    gates: new THREE.Group(),
    rails: new THREE.Group(),
    skyline: new THREE.Group(),
    particles: new THREE.Group(),
    streaks: new THREE.Group(),
    nebula: new THREE.Group(),
    effects: new THREE.Group(),
  };
  groups.world.add(
    groups.obstacles,
    groups.pickups,
    groups.gates,
    groups.rails,
    groups.skyline,
    groups.particles,
    groups.streaks,
    groups.nebula,
    groups.effects,
  );
  return groups;
}

export function createTunnel() {
  const tunnelGeometry = new THREE.CylinderGeometry(8.5, 8.5, 230, 36, 18, true);
  const tunnelMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a1014,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
    wireframe: true,
  });
  const tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
  tunnelMesh.rotation.x = Math.PI / 2;
  tunnelMesh.position.z = -82;
  return tunnelMesh;
}

export function createStarField() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(70);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(0, 32);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-190, 42);
    color.setHSL(THREE.MathUtils.randFloat(0.42, 0.62), 0.78, THREE.MathUtils.randFloat(0.58, 0.9));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    }),
  );
}

export function createRails(materials) {
  const railGeometry = new THREE.BoxGeometry(0.08, 0.08, 10);
  const created = [];

  for (let row = 0; row < 24; row += 1) {
    for (const x of [-6.6, 6.6]) {
      const rail = new THREE.Mesh(railGeometry, materials.rail.clone());
      rail.position.set(x, 0.36, -row * 10);
      rail.userData.speedFactor = row % 2 === 0 ? 1 : 1.15;
      created.push(rail);
    }
  }

  return created;
}

export function createSkyline(materials) {
  const created = [];
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: palette.amber,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < 70; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const width = THREE.MathUtils.randFloat(0.8, 1.9);
    const height = THREE.MathUtils.randFloat(2.2, 10.8);
    const depth = THREE.MathUtils.randFloat(1.4, 3.4);
    const building = new THREE.Group();
    building.position.set(side * THREE.MathUtils.randFloat(8.6, 15.5), height / 2 - 1.05, -i * 4.2);
    building.rotation.y = side * THREE.MathUtils.randFloat(0.04, 0.18);
    building.userData.depthLoop = -290;

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      (i + side) % 3 === 0 ? materials.cityA : materials.cityB,
    );
    building.add(tower);

    const rows = Math.floor(height / 0.9);
    for (let row = 1; row < rows; row += 2) {
      const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.05, 0.03), windowMaterial);
      windowStrip.position.set(0, -height / 2 + row * 0.82, depth / 2 + 0.02);
      windowStrip.visible = Math.random() > 0.3;
      building.add(windowStrip);
    }

    created.push(building);
  }

  return created;
}

export function resetParticle(particle, firstPass = false) {
  particle.position.set(
    randFloatSpread(13),
    randFloat(0.3, 7.5),
    firstPass ? randFloat(-155, 20) : randFloat(-155, -120),
  );
  particle.scale.setScalar(randFloat(0.7, 2.2));
  particle.userData.drift = randFloat(0.1, 0.9);
}

export function createParticles(count) {
  const geometry = new THREE.IcosahedronGeometry(0.055, 0);
  const material = new THREE.MeshBasicMaterial({
    color: palette.lime,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
  });
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const particle = new THREE.Mesh(geometry, material.clone());
    resetParticle(particle, true);
    created.push(particle);
  }

  return created;
}

export function resetSpeedStreak(streak, firstPass = false) {
  streak.position.set(
    randFloatSpread(15),
    randFloat(0.45, 7.5),
    firstPass ? randFloat(-150, 18) : randFloat(-150, -118),
  );
  streak.scale.set(randFloat(0.65, 1.3), randFloat(0.65, 1.3), randFloat(3.5, 8.5));
}

export function createSpeedStreaks(count, materials) {
  const geometry = new THREE.BoxGeometry(0.028, 0.028, 1);
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const streak = new THREE.Mesh(geometry, materials.speedStreak.clone());
    streak.userData.depth = randFloat(0.8, 1.8);
    streak.userData.baseHue = random() > 0.34 ? palette.cyan : palette.amber;
    streak.material.color.setHex(streak.userData.baseHue);
    resetSpeedStreak(streak, true);
    created.push(streak);
  }

  return created;
}

function createNebulaTexture() {
  const nebulaCanvas = document.createElement('canvas');
  nebulaCanvas.width = 256;
  nebulaCanvas.height = 256;
  const context = nebulaCanvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 6, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,0.68)');
  gradient.addColorStop(0.22, 'rgba(255,220,120,0.24)');
  gradient.addColorStop(0.52, 'rgba(42,244,188,0.16)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 46; i += 1) {
    context.fillStyle = `rgba(255,255,255,${THREE.MathUtils.randFloat(0.04, 0.16)})`;
    context.beginPath();
    context.arc(
      THREE.MathUtils.randFloat(35, 220),
      THREE.MathUtils.randFloat(35, 220),
      THREE.MathUtils.randFloat(1, 4),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(nebulaCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createNebulaBands() {
  const created = [];
  const texture = createNebulaTexture();

  for (let i = 0; i < 7; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: i % 2 === 0 ? 0x2af4bc : 0xffb13d,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const band = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), material);
    band.position.set(randFloatSpread(10), randFloat(3.2, 9), -42 - i * 26);
    band.rotation.set(randFloat(-0.4, 0.4), 0, randFloat(-0.45, 0.45));
    band.userData.drift = randFloat(0.18, 0.36);
    created.push(band);
  }

  return created;
}
