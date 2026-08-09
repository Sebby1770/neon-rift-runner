import * as THREE from 'three';
import { palette } from './materials.js';
import { randFloat, random } from './rng.js';
import { gateRadiusScale, slicerSpeedFactor } from './difficulty.js';

export function createShip(materials) {
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

export function createShield() {
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

export function createGate(materials, { runTime = 0, randomX } = {}) {
  const group = new THREE.Group();
  const ringMaterial = materials.gate.clone();
  ringMaterial.color.setHex(random() > 0.5 ? palette.cyan : palette.amber);
  const scale = gateRadiusScale(runTime);
  const radius = randFloat(1.25, 1.8) * scale;
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
  const x = typeof randomX === 'function' ? randomX(0.55) : randFloat(-4.5, 4.5);
  group.position.set(x, randFloat(1.7, 5.0), -128);
  group.userData = {
    type: 'gate',
    radius,
    hitRadius: radius * 0.88,
    scored: false,
    spin: randFloat(0.8, 1.8),
  };
  return group;
}

/**
 * Classic mine / slicer, or gap wall (horizontal barrier with a drifting opening).
 * Pass `forceVariant` to pick a type: 'mine' | 'slicer' | 'gapwall'.
 */
export function createHazard(materials, { runTime = 0, randomX, forceVariant } = {}) {
  let variant = forceVariant;
  if (!variant) {
    const roll = random();
    // Late-game: more gap walls. Early: mostly mines/slicers.
    const gapChance = Math.min(0.28, 0.08 + runTime * 0.003);
    if (roll < gapChance) variant = 'gapwall';
    else if (roll < gapChance + 0.38) variant = 'slicer';
    else variant = 'mine';
  }

  if (variant === 'gapwall') {
    return createGapWall(materials, { runTime, randomX });
  }

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
  const x = typeof randomX === 'function' ? randomX(0.3) : randFloat(-4.8, 4.8);
  group.position.set(x, randFloat(1.2, 5.7), -132);
  group.scale.setScalar(
    variant === 'slicer' ? randFloat(0.78, 1.12) : randFloat(0.75, 1.35),
  );
  const speedMul = slicerSpeedFactor(runTime);
  group.userData = {
    type: 'hazard',
    variant,
    baseX: group.position.x,
    radius: (variant === 'slicer' ? 1.25 : 0.9) * group.scale.x,
    spin: randFloat(-2.1, 2.1),
    sway: randFloat(0.3, 1.2) * speedMul,
    phase: randFloat(0, Math.PI * 2),
    swaySpeed: 1.8 * speedMul,
  };
  return group;
}

/**
 * Horizontal barrier spanning the flight corridor with a gap the player flies through.
 * Gap center drifts left/right over time (updated in main moveDynamicGroup).
 */
export function createGapWall(materials, { runTime = 0, randomX } = {}) {
  const group = new THREE.Group();
  const span = 14;
  // Gap narrows slightly with difficulty
  const gapWidth = Math.max(1.55, 2.45 - Math.min(0.7, runTime * 0.008));
  const wallThickness = 0.14;
  const wallDepth = 0.18;
  const wallHeight = 0.55;

  const wallMat = new THREE.MeshBasicMaterial({
    color: palette.rose,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
  });
  const edgeMat = new THREE.MeshBasicMaterial({
    color: palette.amber,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });

  // Two horizontal segments left/right of the gap — rebuilt as wide bars
  // Positions relative to gap center at local x=0; gap drifts via userData.
  const halfSpan = span / 2;
  const leftWidth = halfSpan - gapWidth / 2;
  const rightWidth = halfSpan - gapWidth / 2;

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.4, leftWidth), wallHeight, wallDepth),
    wallMat,
  );
  left.position.x = -(gapWidth / 2 + leftWidth / 2);
  left.name = 'gap-left';

  const right = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.4, rightWidth), wallHeight, wallDepth),
    wallMat.clone(),
  );
  right.position.x = gapWidth / 2 + rightWidth / 2;
  right.name = 'gap-right';

  // Glow rim on gap edges
  const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallHeight * 1.35, wallDepth * 1.4), edgeMat);
  leftRim.position.x = -gapWidth / 2;
  const rightRim = leftRim.clone();
  rightRim.position.x = gapWidth / 2;

  const light = new THREE.PointLight(palette.rose, 10, 14);
  light.position.z = 0.3;

  group.add(left, right, leftRim, rightRim, light);

  // Vertical center of wall sits mid-corridor; player must match Y roughly
  const y = randFloat(2.0, 4.8);
  group.position.set(0, y, -132);

  const speedMul = slicerSpeedFactor(runTime);
  const initialGap =
    typeof randomX === 'function' ? randomX(0.4) : randFloat(-3.2, 3.2);

  group.userData = {
    type: 'hazard',
    variant: 'gapwall',
    gapWidth,
    gapX: initialGap,
    baseGapX: initialGap,
    // Vertical hit band half-height
    halfHeight: wallHeight * 0.55 + 0.35,
    // Approximate "radius" for near-miss / overdrive smash
    radius: gapWidth * 0.55,
    spin: 0,
    phase: randFloat(0, Math.PI * 2),
    sway: randFloat(1.4, 2.6) * speedMul,
    swaySpeed: 1.15 * speedMul,
    scored: false,
  };
  // Shift segment positions so gap is at gapX (group stays at x=0)
  group.position.x = 0;
  offsetGapWall(group, initialGap);
  return group;
}

/** Reposition left/right segments so the opening is centered at gapX. */
export function offsetGapWall(group, gapX) {
  const ud = group.userData;
  if (!ud || ud.variant !== 'gapwall') return;
  ud.gapX = gapX;
  group.children.forEach((child) => {
    if (child.name === 'gap-left') {
      // leave geometry local; whole group offset not used — shift children
    }
  });
  // Move the whole wall assembly in X so gap center tracks gapX
  group.position.x = gapX;
}

/**
 * Pure collision test for a gap wall: true if ship is outside the opening
 * (within vertical band and near the wall plane).
 */
export function isGapWallHit(shipPos, hazard, shipRadius = 0.58) {
  const ud = hazard.userData;
  if (!ud || ud.variant !== 'gapwall') return false;
  const dy = Math.abs(shipPos.y - hazard.position.y);
  if (dy > (ud.halfHeight || 0.8)) return false;
  // Outside the gap opening?
  const halfGap = (ud.gapWidth || 2) / 2 - shipRadius * 0.35;
  const dx = Math.abs(shipPos.x - (ud.gapX ?? hazard.position.x));
  return dx > halfGap;
}

/** Near-miss for gap wall: inside the opening, close to either edge. */
export function isGapWallNearMiss(shipPos, hazard, shipRadius = 0.58) {
  const ud = hazard.userData;
  if (!ud || ud.variant !== 'gapwall') return false;
  const dy = Math.abs(shipPos.y - hazard.position.y);
  if (dy > (ud.halfHeight || 0.8) + 0.25) return false;
  const halfGap = (ud.gapWidth || 2) / 2;
  const dx = Math.abs(shipPos.x - (ud.gapX ?? hazard.position.x));
  const clearance = halfGap - dx;
  // Must be inside the opening with little room to the wall edge
  return clearance > shipRadius * 0.15 && clearance < 0.95;
}

export function createPickup(materials, kind = 'boost', { randomX } = {}) {
  const material =
    kind === 'boost'
      ? materials.pickup
      : kind === 'rift'
        ? materials.riftPickup
        : materials.shieldPickup;
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
  const x = typeof randomX === 'function' ? randomX(0.25) : randFloat(-4.8, 4.8);
  group.position.set(x, randFloat(1.25, 5.6), -124);
  group.userData = {
    type: kind,
    baseY: group.position.y,
    radius: kind === 'rift' ? 0.86 : 0.72,
    spin: randFloat(1.4, 3.4),
    phase: randFloat(0, Math.PI * 2),
  };
  return group;
}

export function createShockwave(materials, position, color, radius = 1, force = 1) {
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
  return ring;
}

export function disposeObject(object, materials) {
  const shared = materials ? Object.values(materials) : [];
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material && !shared.includes(child.material)) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function clearGroup(group, materials) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child, materials);
  }
}
