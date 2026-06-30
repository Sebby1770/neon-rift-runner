import './styles.css';
import { createIcons, icons } from 'lucide';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

createIcons({ icons });

const canvas = document.querySelector('#scene');
const game = document.querySelector('#game');
const splash = document.querySelector('#splash');
const pausePanel = document.querySelector('#pausePanel');
const gameOverPanel = document.querySelector('#gameOverPanel');
const scoreEl = document.querySelector('#score');
const bestScoreEl = document.querySelector('#bestScore');
const comboEl = document.querySelector('#combo');
const gatesEl = document.querySelector('#gates');
const streakEl = document.querySelector('#streak');
const finalScoreEl = document.querySelector('#finalScore');
const finalBestEl = document.querySelector('#finalBest');
const hullBar = document.querySelector('#hullBar');
const boostBar = document.querySelector('#boostBar');
const riftBar = document.querySelector('#riftBar');
const fpsValue = document.querySelector('#fpsValue');
const qualityMode = document.querySelector('#qualityMode');
const errorLogCount = document.querySelector('#errorLogCount');
const pauseButton = document.querySelector('#pauseButton');
const soundButton = document.querySelector('#soundButton');
const qualityButton = document.querySelector('#qualityButton');
const startButton = document.querySelector('#startButton');
const zenButton = document.querySelector('#zenButton');
const resumeButton = document.querySelector('#resumeButton');
const restartButton = document.querySelector('#restartButton');
const restartFromPause = document.querySelector('#restartFromPause');
const callout = document.querySelector('#callout');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050609, 0.055);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 260);
camera.position.set(0, 4.6, 13.5);

const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.88,
  0.66,
  0.12,
);
const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const audio = createAudio();

const STORAGE_KEYS = {
  bestScore: 'neon-rift-runner:best-score',
  settings: 'neon-rift-runner:settings',
  errors: 'neon-rift-runner:errors',
};

const savedSettings = readJson(STORAGE_KEYS.settings, {});

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false,
};

const bounds = {
  x: 5.3,
  yMin: 1.1,
  yMax: 5.8,
};

const state = {
  mode: 'title',
  zen: false,
  muted: Boolean(savedSettings.muted),
  performanceMode: Boolean(savedSettings.performanceMode),
  bestScore: readNumber(STORAGE_KEYS.bestScore, 0),
  fps: 60,
  errorCount: readJson(STORAGE_KEYS.errors, []).length,
  score: 0,
  scoreCarry: 0,
  gates: 0,
  streak: 0,
  hull: 100,
  boost: 100,
  rift: 0,
  overdrive: 0,
  combo: 1,
  speed: 28,
  targetSpeed: 28,
  spawnTimer: 0,
  pickupTimer: 0,
  hazardTimer: 0,
  lanePulse: 0,
  invulnerable: 0,
  shake: 0,
  runTime: 0,
  calloutTimer: 0,
};

applyQualitySettings();

const palette = {
  cyan: 0x29f6c9,
  amber: 0xffb13d,
  rose: 0xff3f65,
  lime: 0xb8ff4d,
  blue: 0x4cb3ff,
  violet: 0xbf72ff,
  white: 0xf8fbff,
};

const materials = {
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

scene.add(groups.world);
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

const ship = createShip();
ship.position.set(0, 2.6, 0);
scene.add(ship);

const shield = createShield();
ship.add(shield);

const starField = createStarField();
scene.add(starField);

const tunnel = createTunnel();
scene.add(tunnel);

const rails = createRails();
rails.forEach((rail) => groups.rails.add(rail));

const buildings = createSkyline();
buildings.forEach((building) => groups.skyline.add(building));

const particles = createParticles(120);
particles.forEach((particle) => groups.particles.add(particle));

const speedStreaks = createSpeedStreaks(48);
speedStreaks.forEach((streak) => groups.streaks.add(streak));

const nebulaBands = createNebulaBands();
nebulaBands.forEach((band) => groups.nebula.add(band));

const ambientLight = new THREE.AmbientLight(0x8cb7ff, 0.38);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-4, 8, 7);
scene.add(sun);

const sideLight = new THREE.PointLight(palette.amber, 30, 45);
sideLight.position.set(7, 4, -14);
scene.add(sideLight);

const pointerTargets = [ship];

function createShip() {
  const craft = new THREE.Group();
  craft.name = 'rift-runner';

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.62, 8, 18), materials.shipBody);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1.18, 0.82, 0.55);
  craft.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.18, 4), materials.shipBody);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.18;
  nose.scale.y = 0.65;
  craft.add(nose);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12), materials.shipGlass);
  cockpit.position.set(0.15, 0.16, 0.31);
  cockpit.scale.set(1, 0.58, 0.42);
  craft.add(cockpit);

  const wingGeometry = new THREE.BoxGeometry(0.18, 1.68, 0.08);
  const leftWing = new THREE.Mesh(wingGeometry, materials.shipBody);
  leftWing.position.set(-0.2, 0.72, -0.03);
  leftWing.rotation.z = -0.35;
  const rightWing = leftWing.clone();
  rightWing.position.y = -0.72;
  rightWing.rotation.z = 0.35;
  craft.add(leftWing, rightWing);

  const engineGeometry = new THREE.ConeGeometry(0.2, 1.45, 18, 1, true);
  const leftTrail = new THREE.Mesh(engineGeometry, materials.shipTrail);
  leftTrail.position.set(-1.15, 0.33, -0.02);
  leftTrail.rotation.z = Math.PI / 2;
  leftTrail.scale.set(1, 0.58, 0.58);
  leftTrail.userData.baseScale = leftTrail.scale.clone();
  const rightTrail = leftTrail.clone();
  rightTrail.position.y = -0.33;
  rightTrail.userData.baseScale = rightTrail.scale.clone();
  craft.add(leftTrail, rightTrail);
  craft.userData.trails = [leftTrail, rightTrail];

  const glow = new THREE.PointLight(palette.cyan, 6, 8);
  glow.position.set(-1.2, 0, -0.2);
  craft.add(glow);
  craft.userData.glow = glow;

  return craft;
}

function createShield() {
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 32, 16),
    new THREE.MeshBasicMaterial({
      color: palette.blue,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    }),
  );
  shieldMesh.scale.set(1.24, 0.82, 0.72);
  return shieldMesh;
}

function createTunnel() {
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

function createStarField() {
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

function createRails() {
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

function createSkyline() {
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

function createParticles(count) {
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

function resetParticle(particle, firstPass = false) {
  particle.position.set(
    THREE.MathUtils.randFloatSpread(13),
    THREE.MathUtils.randFloat(0.3, 7.5),
    firstPass ? THREE.MathUtils.randFloat(-155, 20) : THREE.MathUtils.randFloat(-155, -120),
  );
  particle.scale.setScalar(THREE.MathUtils.randFloat(0.7, 2.2));
  particle.userData.drift = THREE.MathUtils.randFloat(0.1, 0.9);
}

function createSpeedStreaks(count) {
  const geometry = new THREE.BoxGeometry(0.028, 0.028, 1);
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const streak = new THREE.Mesh(geometry, materials.speedStreak.clone());
    streak.userData.depth = THREE.MathUtils.randFloat(0.8, 1.8);
    streak.userData.baseHue = Math.random() > 0.34 ? palette.cyan : palette.amber;
    streak.material.color.setHex(streak.userData.baseHue);
    resetSpeedStreak(streak, true);
    created.push(streak);
  }

  return created;
}

function resetSpeedStreak(streak, firstPass = false) {
  streak.position.set(
    THREE.MathUtils.randFloatSpread(15),
    THREE.MathUtils.randFloat(0.45, 7.5),
    firstPass ? THREE.MathUtils.randFloat(-150, 18) : THREE.MathUtils.randFloat(-150, -118),
  );
  streak.scale.set(
    THREE.MathUtils.randFloat(0.65, 1.3),
    THREE.MathUtils.randFloat(0.65, 1.3),
    THREE.MathUtils.randFloat(3.5, 8.5),
  );
}

function createNebulaBands() {
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
    band.position.set(THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloat(3.2, 9), -42 - i * 26);
    band.rotation.set(THREE.MathUtils.randFloat(-0.4, 0.4), 0, THREE.MathUtils.randFloat(-0.45, 0.45));
    band.userData.drift = THREE.MathUtils.randFloat(0.18, 0.36);
    created.push(band);
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

function createGate() {
  const group = new THREE.Group();
  const ringMaterial = materials.gate.clone();
  ringMaterial.color.setHex(Math.random() > 0.5 ? palette.cyan : palette.amber);
  const radius = THREE.MathUtils.randFloat(1.25, 1.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.065, 10, 48), ringMaterial);
  ring.rotation.y = Math.PI / 2;

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.62, 0.024, 8, 36),
    new THREE.MeshBasicMaterial({
      color: palette.white,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
    }),
  );
  inner.rotation.y = Math.PI / 2;

  const light = new THREE.PointLight(ringMaterial.color, 8, 10);
  light.position.z = 0.4;
  group.add(ring, inner, light);
  group.position.set(randomFlightX(0.55), THREE.MathUtils.randFloat(1.7, 5.0), -128);
  group.userData = {
    type: 'gate',
    radius,
    hitRadius: radius * 0.88,
    scored: false,
    spin: THREE.MathUtils.randFloat(0.8, 1.8),
  };
  return group;
}

function createHazard() {
  const variant = Math.random() > 0.62 ? 'slicer' : 'mine';
  const group = new THREE.Group();

  if (variant === 'slicer') {
    const barMaterial = new THREE.MeshBasicMaterial({
      color: palette.rose,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.08), barMaterial);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.08), barMaterial.clone());
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), materials.hazard);
    group.add(bar, cross, core);
  } else {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), materials.hazard);
    const spikes = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.65, 0.06, 72, 8, 2, 5),
      new THREE.MeshBasicMaterial({
        color: palette.rose,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(core, spikes);
  }

  const light = new THREE.PointLight(palette.rose, 12, 9);
  group.add(light);
  group.position.set(randomFlightX(0.3), THREE.MathUtils.randFloat(1.2, 5.7), -132);
  group.scale.setScalar(variant === 'slicer' ? THREE.MathUtils.randFloat(0.78, 1.12) : THREE.MathUtils.randFloat(0.75, 1.35));
  group.userData = {
    type: 'hazard',
    variant,
    baseX: group.position.x,
    radius: (variant === 'slicer' ? 1.25 : 0.9) * group.scale.x,
    spin: THREE.MathUtils.randFloat(-2.1, 2.1),
    sway: THREE.MathUtils.randFloat(0.3, 1.2),
    phase: THREE.MathUtils.randFloat(0, Math.PI * 2),
  };
  return group;
}

function createPickup(kind = 'boost') {
  const material = kind === 'boost' ? materials.pickup : kind === 'rift' ? materials.riftPickup : materials.shieldPickup;
  const color = kind === 'boost' ? palette.lime : kind === 'rift' ? palette.violet : palette.blue;
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    kind === 'rift' ? new THREE.IcosahedronGeometry(0.4, 0) : new THREE.OctahedronGeometry(0.36, 0),
    material,
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.035, 8, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.018, 8, 36),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: kind === 'rift' ? 0.52 : 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.rotation.y = Math.PI / 2;
  const light = new THREE.PointLight(color, kind === 'rift' ? 14 : 9, 8);
  group.add(core, ring, light);
  if (kind === 'rift') group.add(halo);
  group.position.set(randomFlightX(0.25), THREE.MathUtils.randFloat(1.25, 5.6), -124);
  group.userData = {
    type: kind,
    baseY: group.position.y,
    radius: kind === 'rift' ? 0.86 : 0.72,
    spin: THREE.MathUtils.randFloat(1.4, 3.4),
    phase: THREE.MathUtils.randFloat(0, Math.PI * 2),
  };
  return group;
}

function startGame(zen = false) {
  state.mode = 'playing';
  state.zen = zen;
  state.score = 0;
  state.scoreCarry = 0;
  state.gates = 0;
  state.streak = 0;
  state.hull = zen ? 999 : 100;
  state.boost = 100;
  state.rift = 0;
  state.overdrive = 0;
  state.combo = 1;
  state.speed = zen ? 23 : 28;
  state.targetSpeed = state.speed;
  state.spawnTimer = 0;
  state.pickupTimer = 0;
  state.hazardTimer = 1.2;
  state.invulnerable = 1.6;
  state.shake = 0;
  state.runTime = 0;
  state.calloutTimer = 0;
  ship.position.set(0, 2.6, 0);
  ship.rotation.set(0, 0, 0);
  game.classList.remove('is-overdrive');
  callout.classList.remove('is-visible');
  callout.textContent = '';
  clearDynamicGroups();
  for (let i = 0; i < 3; i += 1) {
    const gate = createGate();
    gate.position.z = -55 - i * 33;
    groups.gates.add(gate);
  }
  setOverlay(splash, false);
  setOverlay(pausePanel, false);
  setOverlay(gameOverPanel, false);
  audio.resume();
  audio.play('launch');
  updateHud();
}

function clearDynamicGroups() {
  [groups.obstacles, groups.gates, groups.pickups, groups.effects].forEach((group) => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
  });
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material && !Object.values(materials).includes(child.material)) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  setOverlay(pausePanel, true);
  audio.play('tap');
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = 'playing';
  setOverlay(pausePanel, false);
  audio.play('launch');
}

function endGame() {
  if (state.mode === 'gameover') return;
  state.mode = 'gameover';
  persistBestScore();
  finalScoreEl.textContent = formatScore(state.score);
  finalBestEl.textContent = formatScore(state.bestScore);
  setOverlay(gameOverPanel, true);
  audio.play('crash');
}

function setOverlay(element, visible) {
  element.classList.toggle('is-visible', visible);
}

function update(delta) {
  const playing = state.mode === 'playing';
  const elapsed = clock.elapsedTime;
  const overdriveActive = playing && state.overdrive > 0;
  const boostActive = playing && (overdriveActive || (keys.boost && state.boost > 2));
  state.targetSpeed =
    (state.zen ? 23 : 28) +
    Math.min(17, state.runTime * 0.36) +
    (keys.boost && state.boost > 2 ? 17 : 0) +
    (overdriveActive ? 20 : 0);
  state.speed = THREE.MathUtils.lerp(state.speed, state.targetSpeed, 1 - Math.exp(-delta * 2.5));

  if (playing) {
    state.runTime += delta;
    state.spawnTimer -= delta;
    state.pickupTimer -= delta;
    state.hazardTimer -= delta;
    state.invulnerable = Math.max(0, state.invulnerable - delta);
    state.overdrive = Math.max(0, state.overdrive - delta);
    state.shake = Math.max(0, state.shake - delta * 2.4);
    state.combo = Math.max(1, state.combo - delta * (overdriveActive ? 0.01 : 0.05));
    state.calloutTimer = Math.max(0, state.calloutTimer - delta);

    if (state.rift >= 100 && !overdriveActive) {
      triggerOverdrive();
    }

    if (keys.boost && state.boost > 2 && !overdriveActive) {
      state.boost = Math.max(0, state.boost - delta * 22);
      state.combo = Math.min(6, state.combo + delta * 0.18);
    } else {
      state.boost = Math.min(100, state.boost + delta * (overdriveActive ? 13 : 7.5));
    }

    if (overdriveActive) {
      state.rift = Math.max(0, state.rift - delta * 16.5);
      state.combo = Math.min(8, state.combo + delta * 0.25);
      state.invulnerable = Math.max(state.invulnerable, 0.16);
    }

    moveShip(delta, boostActive);
    spawnObjects();
    state.scoreCarry += delta * state.speed * state.combo * (boostActive ? 2.1 : 1) * (overdriveActive ? 1.7 : 1);
    if (state.scoreCarry >= 1) {
      const gained = Math.floor(state.scoreCarry);
      state.score += gained;
      state.scoreCarry -= gained;
    }
    updateCollisions();
    if (!state.performanceMode && state.runTime > 8 && state.fps < 38) {
      setPerformanceMode(true, true);
      showCallout('Performance mode enabled');
    }
  } else {
    ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, Math.sin(elapsed) * 0.04, 1 - Math.exp(-delta * 2));
    ship.position.y = THREE.MathUtils.lerp(ship.position.y, 2.6 + Math.sin(elapsed * 1.4) * 0.12, 1 - Math.exp(-delta * 2));
  }

  if (state.calloutTimer === 0) callout.classList.remove('is-visible');
  game.classList.toggle('is-overdrive', state.overdrive > 0);
  updateWorld(delta, elapsed, playing, overdriveActive);
  updateCamera(delta, boostActive, elapsed, overdriveActive);
  updateHud();
}

function moveShip(delta, boostActive) {
  const xLimit = getXLimit();
  const overdriveActive = state.overdrive > 0;
  const horizontal = Number(keys.right) - Number(keys.left);
  const vertical = Number(keys.up) - Number(keys.down);
  const moveSpeed = boostActive ? 9.3 : 7.6;
  ship.position.x += horizontal * moveSpeed * delta;
  ship.position.y += vertical * moveSpeed * delta;
  ship.position.x = THREE.MathUtils.clamp(ship.position.x, -xLimit, xLimit);
  ship.position.y = THREE.MathUtils.clamp(ship.position.y, bounds.yMin, bounds.yMax);
  ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -horizontal * 0.42, 1 - Math.exp(-delta * 10));
  ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, vertical * 0.16, 1 - Math.exp(-delta * 8));
  ship.userData.trails.forEach((trail, index) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 18 + index) * 0.14 + (boostActive ? 0.45 : 0);
    trail.scale.set(
      trail.userData.baseScale.x * pulse,
      trail.userData.baseScale.y,
      trail.userData.baseScale.z,
    );
    trail.material.color.setHex(overdriveActive ? palette.amber : palette.cyan);
    trail.material.opacity = overdriveActive ? 0.96 : boostActive ? 0.88 : 0.56;
  });
  ship.userData.glow.color.setHex(overdriveActive ? palette.amber : palette.cyan);
  ship.userData.glow.intensity = overdriveActive ? 18 : boostActive ? 12 : 6;
}

function spawnObjects() {
  const gateInterval = THREE.MathUtils.clamp(1.45 - state.runTime * 0.015, 0.84, 1.45);
  if (state.spawnTimer <= 0) {
    state.spawnTimer = gateInterval;
    if (Math.random() > 0.24) {
      groups.gates.add(createGate());
    }
  }

  if (!state.zen && state.overdrive <= 0 && state.hazardTimer <= 0) {
    state.hazardTimer = THREE.MathUtils.clamp(1.12 - state.runTime * 0.01, 0.52, 1.12);
    groups.obstacles.add(createHazard());
  }

  if (state.pickupTimer <= 0) {
    state.pickupTimer = THREE.MathUtils.randFloat(2.5, 4.6);
    const roll = Math.random();
    const kind = roll > 0.86 ? 'rift' : roll > 0.68 ? 'shield' : 'boost';
    groups.pickups.add(createPickup(kind));
  }
}

function updateWorld(delta, elapsed, playing, overdriveActive) {
  const travel = state.speed * delta * (playing ? 1 : 0.42);

  tunnel.rotation.z += delta * (overdriveActive ? 0.16 : 0.04);
  tunnel.position.z += travel * 0.08;
  if (tunnel.position.z > -72) tunnel.position.z = -92;

  starField.position.z += travel * 0.18;
  if (starField.position.z > 55) starField.position.z = 0;

  groups.rails.children.forEach((rail, index) => {
    rail.position.z += travel * rail.userData.speedFactor;
    rail.material.opacity = 0.24 + Math.sin(elapsed * 5 + index) * 0.08 + (keys.boost ? 0.22 : 0);
    if (rail.position.z > 18) rail.position.z -= 240;
  });

  groups.skyline.children.forEach((building, index) => {
    building.position.z += travel * 0.78;
    building.position.x += Math.sin(elapsed * 0.8 + index) * delta * 0.05;
    if (building.position.z > 28) {
      building.position.z -= 294;
      building.position.x = Math.sign(building.position.x || 1) * THREE.MathUtils.randFloat(8.8, 15.8);
    }
  });

  groups.particles.children.forEach((particle) => {
    particle.position.z += travel * (1.2 + particle.userData.drift + (overdriveActive ? 0.85 : 0));
    particle.position.y += Math.sin(elapsed * 3 + particle.position.x) * delta * 0.15;
    if (particle.position.z > 20) resetParticle(particle);
  });

  groups.streaks.children.forEach((streak) => {
    streak.position.z += travel * (1.8 + streak.userData.depth + (overdriveActive ? 1.6 : 0));
    streak.material.opacity = THREE.MathUtils.lerp(
      streak.material.opacity,
      overdriveActive ? 0.88 : THREE.MathUtils.mapLinear(state.speed, 24, 62, 0.14, 0.56),
      1 - Math.exp(-delta * 5),
    );
    streak.scale.z = THREE.MathUtils.lerp(streak.scale.z, overdriveActive ? 14 : 7, 1 - Math.exp(-delta * 4));
    if (streak.position.z > 22) resetSpeedStreak(streak);
  });

  groups.nebula.children.forEach((band, index) => {
    band.position.z += travel * band.userData.drift;
    band.rotation.z += delta * (index % 2 === 0 ? 0.015 : -0.012);
    band.material.opacity = overdriveActive ? 0.16 : 0.08 + Math.sin(elapsed + index) * 0.015;
    if (band.position.z > 34) {
      band.position.z -= 188;
      band.position.x = THREE.MathUtils.randFloatSpread(10);
    }
  });

  moveDynamicGroup(groups.gates, travel, delta, elapsed);
  moveDynamicGroup(groups.obstacles, travel, delta, elapsed);
  moveDynamicGroup(groups.pickups, travel, delta, elapsed);
  updateEffects(delta);

  shield.rotation.y += delta * 1.4;
  shield.rotation.z -= delta * 0.8;
  shield.material.opacity = THREE.MathUtils.lerp(
    shield.material.opacity,
    state.invulnerable > 0 || overdriveActive ? 0.3 + Math.sin(elapsed * 16) * 0.08 : 0,
    1 - Math.exp(-delta * 8),
  );
}

function moveDynamicGroup(group, travel, delta, elapsed) {
  for (let i = group.children.length - 1; i >= 0; i -= 1) {
    const object = group.children[i];
    object.position.z += travel;
    object.rotation.z += delta * (object.userData.spin || 0);
    object.rotation.y += delta * (object.userData.spin || 0) * 0.44;
    if (object.userData.variant === 'slicer') {
      object.position.x = object.userData.baseX + Math.sin(elapsed * 1.8 + object.userData.phase) * object.userData.sway;
    }
    if (object.userData.type === 'boost' || object.userData.type === 'shield' || object.userData.type === 'rift') {
      object.position.y = object.userData.baseY + Math.sin(elapsed * 2.4 + object.userData.phase) * 0.18;
    }
    object.scale.multiplyScalar(1 + Math.sin(elapsed * 5 + object.position.z) * 0.0008);
    if (object.position.z > 12) {
      group.remove(object);
      disposeObject(object);
    }
  }
}

function updateCollisions() {
  const shipPosition = ship.position;

  groups.gates.children.forEach((gate) => {
    if (gate.userData.scored || gate.position.z < -1.2 || gate.position.z > 1.1) return;
    const distance = shipPosition.distanceTo(gate.position);
    gate.userData.scored = true;
    if (distance < gate.userData.hitRadius) {
      state.gates += 1;
      state.streak += 1;
      state.combo = Math.min(6, state.combo + 0.38);
      state.score += Math.round((260 + state.streak * 16) * state.combo);
      state.boost = Math.min(100, state.boost + 10);
      state.rift = Math.min(100, state.rift + 12 + Math.min(10, state.streak));
      pulseObject(gate, palette.lime);
      createShockwave(gate.position, state.streak >= 4 ? palette.amber : palette.lime, gate.userData.radius);
      if (state.streak === 4) showCallout('Gate streak: rift charge climbing');
      if (state.streak > 0 && state.streak % 7 === 0) showCallout(`${state.streak} gate streak`);
      audio.play('gate');
    } else {
      state.streak = 0;
      state.combo = Math.max(1, state.combo * 0.76);
      state.score = Math.max(0, state.score - 90);
      state.rift = Math.max(0, state.rift - 8);
      pulseObject(gate, palette.rose);
      createShockwave(gate.position, palette.rose, gate.userData.radius * 0.7);
      audio.play('miss');
    }
  });

  for (let i = groups.pickups.children.length - 1; i >= 0; i -= 1) {
    const pickup = groups.pickups.children[i];
    if (shipPosition.distanceTo(pickup.position) > pickup.userData.radius + 0.65) continue;
    if (pickup.userData.type === 'boost') {
      state.boost = Math.min(100, state.boost + 34);
      state.score += 170;
      audio.play('pickup');
      showCallout('Boost charge');
    } else {
      if (pickup.userData.type === 'rift') {
        state.rift = Math.min(100, state.rift + 32);
        state.combo = Math.min(8, state.combo + 0.45);
        state.score += 320;
        audio.play('rift');
        showCallout('Rift shard');
      } else {
        state.invulnerable = Math.max(state.invulnerable, 4.8);
        state.score += 220;
        audio.play('shield');
        showCallout('Shield online');
      }
    }
    createShockwave(pickup.position, pickup.userData.type === 'rift' ? palette.violet : palette.lime, pickup.userData.radius);
    groups.pickups.remove(pickup);
    disposeObject(pickup);
  }

  if (state.overdrive > 0) {
    for (let i = groups.obstacles.children.length - 1; i >= 0; i -= 1) {
      const hazard = groups.obstacles.children[i];
      if (shipPosition.distanceTo(hazard.position) > hazard.userData.radius + 0.72) continue;
      state.score += 420;
      state.rift = Math.min(100, state.rift + 5);
      state.shake = Math.max(state.shake, 0.35);
      createShockwave(hazard.position, palette.amber, hazard.userData.radius);
      groups.obstacles.remove(hazard);
      disposeObject(hazard);
      audio.play('pickup');
    }
    return;
  }

  if (state.zen || state.invulnerable > 0) return;
  for (let i = groups.obstacles.children.length - 1; i >= 0; i -= 1) {
    const hazard = groups.obstacles.children[i];
    if (shipPosition.distanceTo(hazard.position) > hazard.userData.radius + 0.58) continue;
    state.hull -= 24;
    state.combo = 1;
    state.streak = 0;
    state.rift = Math.max(0, state.rift - 18);
    state.shake = 1;
    state.invulnerable = 1.1;
    state.speed *= 0.86;
    audio.play('hit');
    groups.obstacles.remove(hazard);
    disposeObject(hazard);
    if (state.hull <= 0) {
      state.hull = 0;
      endGame();
      break;
    }
  }
}

function pulseObject(object, color) {
  const flash = new THREE.PointLight(color, 30, 16);
  flash.position.copy(object.position);
  groups.world.add(flash);
  setTimeout(() => {
    groups.world.remove(flash);
    if (typeof flash.dispose === 'function') flash.dispose();
  }, 130);
}

function triggerOverdrive() {
  state.overdrive = 6.2;
  state.rift = 100;
  state.invulnerable = Math.max(state.invulnerable, 6.2);
  state.combo = Math.min(8, state.combo + 1.2);
  state.shake = Math.max(state.shake, 0.7);
  showCallout('Overdrive');
  createShockwave(ship.position, palette.white, 1.4, 1.6);
  audio.play('overdrive');
}

function createShockwave(position, color, radius = 1, force = 1) {
  const material = materials.shockwave.clone();
  material.color.setHex(color);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 8, 72), material);
  ring.position.copy(position);
  ring.rotation.y = Math.PI / 2;
  ring.scale.setScalar(Math.max(0.3, radius * 0.45));
  ring.userData = {
    life: 0.58 * force,
    maxLife: 0.58 * force,
    growth: 6.4 * force,
  };
  groups.effects.add(ring);
}

function updateEffects(delta) {
  for (let i = groups.effects.children.length - 1; i >= 0; i -= 1) {
    const effect = groups.effects.children[i];
    effect.userData.life -= delta;
    effect.scale.addScalar(effect.userData.growth * delta);
    effect.material.opacity = Math.max(0, (effect.userData.life / effect.userData.maxLife) * 0.74);
    if (effect.userData.life <= 0) {
      groups.effects.remove(effect);
      disposeObject(effect);
    }
  }
}

function showCallout(message) {
  callout.textContent = message;
  callout.classList.add('is-visible');
  state.calloutTimer = 1.45;
}

function updateCamera(delta, boostActive, elapsed, overdriveActive) {
  const shake = state.shake * 0.28;
  const sideFollow = camera.aspect < 0.72 ? 0.74 : 0.32;
  const lookFollow = camera.aspect < 0.72 ? 0.5 : 0.2;
  const target = new THREE.Vector3(
    ship.position.x * sideFollow + (Math.random() - 0.5) * shake,
    ship.position.y + 2.05 + (Math.random() - 0.5) * shake,
    12.4 - (boostActive ? 1.2 : 0),
  );
  camera.position.lerp(target, 1 - Math.exp(-delta * 4.8));
  const lookAt = new THREE.Vector3(ship.position.x * lookFollow, ship.position.y + 0.25, -10);
  camera.lookAt(lookAt);
  camera.fov = THREE.MathUtils.lerp(camera.fov, overdriveActive ? 73 : boostActive ? 69 : 64, 1 - Math.exp(-delta * 3));
  camera.updateProjectionMatrix();
  bloomPass.strength = THREE.MathUtils.lerp(
    bloomPass.strength,
    (overdriveActive ? 1.55 : boostActive ? 1.25 : 0.88 + Math.sin(elapsed) * 0.06) *
      (state.performanceMode ? 0.62 : 1),
    1 - Math.exp(-delta * 2),
  );
}

function updateHud() {
  scoreEl.textContent = formatScore(state.score);
  bestScoreEl.textContent = formatScore(Math.max(state.bestScore, state.score));
  comboEl.textContent = `x${state.combo.toFixed(1)}`;
  streakEl.textContent = String(state.streak);
  gatesEl.textContent = String(state.gates);
  fpsValue.textContent = String(Math.max(0, Math.round(state.fps)));
  qualityMode.textContent = state.performanceMode ? 'Perf' : 'Ultra';
  errorLogCount.textContent = String(state.errorCount);
  hullBar.style.transform = `scaleX(${THREE.MathUtils.clamp(state.hull, 0, 100) / 100})`;
  boostBar.style.transform = `scaleX(${state.boost / 100})`;
  riftBar.style.transform = `scaleX(${state.rift / 100})`;
  hullBar.style.filter = state.hull <= 30 ? 'saturate(1.4) brightness(1.15)' : '';
  boostBar.style.filter = keys.boost ? 'brightness(1.35)' : '';
  riftBar.style.filter = state.overdrive > 0 ? 'brightness(1.8) saturate(1.5)' : '';
  qualityButton.classList.toggle('is-active', state.performanceMode);
  soundButton.classList.toggle('is-active', !state.muted);
  soundButton.title = state.muted ? 'Sound muted' : 'Sound on';
  syncSoundIcon();
}

function getXLimit() {
  if (camera.aspect < 0.58) return 3.25;
  if (camera.aspect < 0.82) return 4.15;
  return bounds.x;
}

function randomFlightX(edgePadding = 0) {
  const limit = Math.max(1.2, getXLimit() - edgePadding);
  return THREE.MathUtils.randFloat(-limit, limit);
}

function formatScore(score) {
  return Math.max(0, Math.round(score)).toLocaleString('en-US');
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  if (delta > 0) {
    state.fps = THREE.MathUtils.lerp(state.fps, 1 / delta, 0.08);
  }
  update(delta);
  composer.render();
  requestAnimationFrame(animate);
}

function handleKey(event, isDown) {
  const key = event.key.toLowerCase();
  const before = { ...keys };

  if (key === 'arrowleft' || key === 'a') keys.left = isDown;
  if (key === 'arrowright' || key === 'd') keys.right = isDown;
  if (key === 'arrowup' || key === 'w') keys.up = isDown;
  if (key === 'arrowdown' || key === 's') keys.down = isDown;
  if (key === ' ' || key === 'shift') keys.boost = isDown;
  if (key === 'escape' && isDown) {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  }

  if (Object.keys(keys).some((name) => keys[name] !== before[name])) {
    event.preventDefault();
  }
}

function bindHoldButton(button) {
  const action = button.dataset.hold;
  const setHeld = (held) => {
    keys[action] = held;
    button.classList.toggle('is-held', held);
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setHeld(true);
  });
  button.addEventListener('pointerup', () => setHeld(false));
  button.addEventListener('pointercancel', () => setHeld(false));
  button.addEventListener('lostpointercapture', () => setHeld(false));
}

function handlePointerMove(event) {
  if (state.mode !== 'playing' || event.pointerType !== 'mouse') return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(pointerTargets, true);
  document.body.style.cursor = intersects.length ? 'crosshair' : '';
}

function createAudio() {
  let context;
  const sounds = {
    launch: [130, 220, 420],
    gate: [500, 760],
    pickup: [660, 980],
    rift: [440, 660, 990],
    overdrive: [180, 360, 720, 1080],
    shield: [320, 620, 880],
    miss: [250, 140],
    hit: [120, 90],
    crash: [180, 90, 45],
    tap: [340],
  };

  return {
    resume() {
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') context.resume();
    },
    play(name) {
      if (state.muted) return;
      if (!context) return;
      const sequence = sounds[name];
      if (!sequence) return;
      const now = context.currentTime;
      sequence.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = name === 'hit' || name === 'crash' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(40, frequency * 0.7),
          now + index * 0.055 + 0.12,
        );
        gain.gain.setValueAtTime(0.001, now + index * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.055, now + index * 0.055 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.055 + 0.17);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.055);
        oscillator.stop(now + index * 0.055 + 0.19);
      });
    },
  };
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing. The game still runs without persistence.
  }
}

function readNumber(key, fallback) {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistSettings() {
  writeJson(STORAGE_KEYS.settings, {
    muted: state.muted,
    performanceMode: state.performanceMode,
  });
}

function persistBestScore() {
  if (state.score <= state.bestScore) return;
  state.bestScore = Math.round(state.score);
  try {
    window.localStorage.setItem(STORAGE_KEYS.bestScore, String(state.bestScore));
  } catch {
    // Best score persistence is a bonus, not a dependency.
  }
}

function setPerformanceMode(enabled, persist = false) {
  state.performanceMode = enabled;
  applyQualitySettings();
  if (persist) persistSettings();
  updateHud();
}

function syncSoundIcon() {
  const iconName = state.muted ? 'volume-x' : 'volume-2';
  if (soundButton.dataset.icon === iconName) return;
  soundButton.dataset.icon = iconName;
  soundButton.innerHTML = `<i data-lucide="${iconName}"></i>`;
  createIcons({ icons });
}

function applyQualitySettings() {
  const pixelRatio = state.performanceMode ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
}

function recordRuntimeError(error) {
  const previous = readJson(STORAGE_KEYS.errors, []);
  const entry = {
    at: new Date().toISOString(),
    message: error?.message || String(error),
    stack: error?.stack || '',
  };
  const next = [entry, ...previous].slice(0, 20);
  writeJson(STORAGE_KEYS.errors, next);
  state.errorCount = next.length;
  updateHud();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(state.performanceMode ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
}

window.addEventListener('keydown', (event) => handleKey(event, true));
window.addEventListener('keyup', (event) => handleKey(event, false));
window.addEventListener('resize', resize);
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('error', (event) => recordRuntimeError(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => recordRuntimeError(event.reason));
document.querySelectorAll('[data-hold]').forEach(bindHoldButton);

startButton.addEventListener('click', () => startGame(false));
zenButton.addEventListener('click', () => startGame(true));
resumeButton.addEventListener('click', resumeGame);
restartButton.addEventListener('click', () => startGame(state.zen));
restartFromPause.addEventListener('click', () => startGame(state.zen));
pauseButton.addEventListener('click', () => {
  if (state.mode === 'playing') pauseGame();
  else if (state.mode === 'paused') resumeGame();
});
soundButton.addEventListener('click', () => {
  state.muted = !state.muted;
  persistSettings();
  audio.resume();
  audio.play('tap');
  updateHud();
});
qualityButton.addEventListener('click', () => {
  setPerformanceMode(!state.performanceMode, true);
  showCallout(state.performanceMode ? 'Performance mode' : 'Ultra mode');
  audio.resume();
  audio.play('tap');
});

setOverlay(splash, true);
updateHud();
animate();
