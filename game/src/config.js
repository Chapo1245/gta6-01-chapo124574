// Azura Bay — every tuning number, colour and city constant in one place.
// The city is a grid of avenues (north-south) and streets (east-west) on the
// west side of a beach; the ocean lies to the east. All distances are metres.
export const CITY = {
  // Avenues run north-south; streets run east-west. 8 of each, 70 m apart.
  avenues: [-252, -182, -112, -42, 28, 98, 168, 238],
  streets: [-252, -182, -112, -42, 28, 98, 168, 238],
  roadWidth: 14,
  blockSize: 56,
  // Beach strip and ocean, east of the last avenue.
  beachX0: 252,
  beachX1: 312,
  oceanX0: 312,
  // World bounds the camera and the player stay inside.
  minX: -280,
  maxX: 420,
  minZ: -280,
  maxZ: 280,
};

export const STEP = 1 / 60;

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  radius: 0.6,
  height: 1.8,
  health: 100,
  punchRange: 2.2,
  punchDamage: 25,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 4.4,
  width: 1.9,
  accel: 16,
  brake: 30,
  reverseAccel: 10,
  maxSpeed: 38,
  maxReverse: 10,
  steer: 0.55,
  steerSpeed: 2.4,
  grip: 6.5,
  handbrakeGrip: 2.2,
};

export const TRAFFIC = {
  count: 26,
  cruiseSpeed: 9,
  maxSpeed: 13,
  followGap: 9,
};

export const PEDESTRIANS = {
  count: 42,
  strollSpeed: 1.4,
  fleeSpeed: 4.2,
  fleeRadius: 14,
};

export const WANTED = {
  maxStars: 5,
  decayDelay: 9,
  decayPerSecond: 0.12,
  stealHeat: 1,
  hitPedHeat: 1,
  ramCopHeat: 1,
  copSpawnRadius: 55,
  maxCruisers: 6,
  heliAtStars: 3,
  // Busted: a cruiser must stay this close on foot for this long before the
  // arrest sticks, so the player always has a real chance to break away.
  bustedTimeSeconds: 4,
  bustedRangeMetres: 3.5,
};

export const MONEY = {
  start: 250,
};

export const PALETTE = {
  sky: 0xffd9a0,
  sun: 0xffe6b8,
  fog: 0xf7c98d,
  ocean: 0x2e7f9e,
  sand: 0xe8cf9a,
  boardwalk: 0x9a7a52,
  road: 0x3a3f47,
  roadLine: 0xe8d44d,
  sidewalk: 0x8f8a80,
  grass: 0x5d8a4a,
  buildingGlass: 0x2a3f55,
  plaza: 0xb8a888,
  fountain: 0x7fc4d8,
};

export const AVENUE_NAMES = [
  'Coral Row',
  'Palm Avenue',
  'Marina Drive',
  'Sunset Blvd',
  'Harbor Lane',
  'Juniper Way',
  'Trade Street',
  'Beacon Road',
];

export const RADIO_STATIONS = [
  { name: 'SUNSET FM', hue: 'synthwave' },
  { name: 'BAY BEATS', hue: 'funk' },
  { name: 'PALM RADIO', hue: 'chill' },
];

export const SAVE_KEY = 'azura-bay.save.v1';
