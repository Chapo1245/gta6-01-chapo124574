// Azura Bay — world and tuning constants.
window.AZURA = window.AZURA || {};

const AzuraConfig = {
  // World layout (metres). Eight avenues run north-south, eight streets
  // east-west, 70 m apart, roads 14 m wide; the 49 blocks sit BETWEEN
  // the roads, 56 m square.
  roadCenters: [-245, -175, -105, -35, 35, 105, 175, 245],
  blockCenters: [-210, -140, -70, 0, 70, 140, 210],
  roadWidth: 14,
  halfCity: 280,
  blockSize: 56,
  // South edge: beachfront hotels, boardwalk, sand, ocean.
  boardwalkZ: 256,
  sandStartZ: 262,
  oceanStartZ: 300,
  // Golden-hour lighting.
  sunColor: 0xffb36b,
  sunIntensity: 1.9,
  sunPosition: [-180, 140, 220],
  skyColor: 0xffd9a0,
  fogColor: 0xf2b98a,
  fogNear: 260,
  fogFar: 720,
  // Player on foot.
  walkSpeed: 7,
  sprintSpeed: 11,
  playerRadius: 0.7,
  playerHealth: 100,
  // Driving.
  carAccel: 22,
  carBrake: 34,
  carReverseMax: 12,
  carTopSpeed: 38,
  carSteer: 0.55,
  handbrakeGrip: 0.35,
  carRadius: 2.2,
  // Wanted system.
  wantedDecaySeconds: 22,
  maxWanted: 5,
  // Economy.
  startCash: 250,
  snackPrice: 25,
  engine2Price: 800,
  engine3Price: 2000,
  armorPrice: 1200,
  // Landmarks (block centres).
  plaza: { x: 0, z: 0 },
  park: { x: -140, z: -140 },
  garage: { x: 140, z: 140 },
  safehouse: { x: -210, z: 210 },
  shops: [
    { x: 70, z: -70, name: 'Marina Market' },
    { x: -70, z: 70, name: 'Palm Deli' },
    { x: 140, z: -210, name: 'Bay Snacks' },
  ],
  // Palette.
  buildingColors: [0xf2e3c6, 0xe8b48a, 0xd98f6a, 0xcfe0e8, 0xf6d9a0, 0xb8c4a8, 0xe5c8b0, 0x9fc3d4],
  carColors: [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1a1a2e],
};

AZURA.config = AzuraConfig;
