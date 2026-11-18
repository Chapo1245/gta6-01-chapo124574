// Mara Voss's story: eight jobs for the Azura Bay crew, from a first pickup
// to the final score. Each job is a chain of steps — go somewhere, pick
// something up, deliver it before the clock runs out, or lose a tail — with
// a beacon in the world, a marker on the minimap and a payout at the end.
import { CITY } from './config.js';

const JOBS = [
  {
    id: 'first-gear',
    title: 'First Gear',
    brief: 'Rico needs his coupe back from the Palm Market lot. Bring it to the Garage.',
    pay: 400,
    steps: [
      { type: 'goto', x: 28, z: -112, text: 'Pick up Rico’s coupe at Palm Market' },
      { type: 'enter', text: 'Get in the coupe' },
      { type: 'goto', x: -147, z: 147, text: 'Deliver the coupe to the Garage' },
    ],
  },
  {
    id: 'boardwalk-fare',
    title: 'Boardwalk Fare',
    brief: 'A tourist at the Boardwalk wants a ride to the Marina. Keep it smooth — no scratches.',
    pay: 250,
    steps: [
      { type: 'goto', x: 246, z: -60, text: 'Pick up the fare at the Boardwalk' },
      { type: 'goto', x: 238, z: -238, text: 'Drop the fare at the Marina' },
    ],
  },
  {
    id: 'hot-pursuit',
    title: 'Hot Pursuit',
    brief: 'The crew lifted a gold case from the Plaza. Lose the heat, then bring it to the Safehouse.',
    pay: 900,
    steps: [
      { type: 'goto', x: 133, z: -7, text: 'Grab the gold case at Fountain Plaza' },
      { type: 'escape', text: 'Lose the police — get your wanted level to zero' },
      { type: 'goto', x: 133, z: 143, text: 'Stash the case at the Safehouse' },
    ],
  },
  {
    id: 'beach-run',
    title: 'Beach Run',
    brief: 'Surfboards for the shop, and the tide is coming in. Run them down the beach before the timer ends.',
    pay: 550,
    steps: [
      { type: 'goto', x: 282, z: 60, text: 'Collect the boards at Azura Beach', timer: 75 },
      { type: 'goto', x: 246, z: 120, text: 'Deliver the boards to the Surf Shop', timer: 75 },
    ],
  },
  {
    id: 'park-pickup',
    title: 'Park Pickup',
    brief: 'A package is waiting under the big palm in Palm Park. No questions, no stops.',
    pay: 350,
    steps: [
      { type: 'goto', x: -7, z: -7, text: 'Collect the package in Palm Park' },
      { type: 'goto', x: -147, z: 147, text: 'Drop it at the Garage' },
    ],
  },
  {
    id: 'midnight-taxi',
    title: 'Midnight Taxi',
    brief: 'Three stops, one night. Ferry the crew between the Plaza, the Market and the Beach.',
    pay: 700,
    steps: [
      { type: 'goto', x: 133, z: -7, text: 'Pick up the crew at Fountain Plaza' },
      { type: 'goto', x: 28, z: -112, text: 'Stop two: Palm Market' },
      { type: 'goto', x: 282, z: 60, text: 'Last stop: Azura Beach' },
    ],
  },
  {
    id: 'getaway',
    title: 'Getaway',
    brief: 'The alarm is already ringing. Grab the cash from the Plaza and outrun the cruisers to the Safehouse.',
    pay: 1200,
    steps: [
      { type: 'goto', x: 133, z: -7, text: 'Grab the cash at Fountain Plaza' },
      { type: 'goto', x: 133, z: 143, text: 'Outrun the police to the Safehouse', wanted: 2 },
    ],
  },
  {
    id: 'final-score',
    title: 'The Final Score',
    brief: 'One last job: the Marina vault. Pick up the crew, hit the Marina, and vanish before the helicopter arrives.',
    pay: 2500,
    steps: [
      { type: 'goto', x: 246, z: -60, text: 'Pick up the crew at the Boardwalk' },
      { type: 'goto', x: 238, z: -238, text: 'Hit the Marina vault', timer: 90 },
      { type: 'escape', text: 'Lose the police — get your wanted level to zero' },
      { type: 'goto', x: 133, z: 143, text: 'Lay low at the Safehouse' },
    ],
  },
];

export function createMissions() {
  return {
    jobs: JOBS,
    current: -1,
    step: 0,
    timer: 0,
    done: 0,
    message: '',
    messageTime: 0,
  };
}

export function startJob(missions, index) {
  missions.current = index;
  missions.step = 0;
  const job = JOBS[index];
  missions.timer = job.steps[0].timer ?? 0;
  missions.message = `${job.title}: ${job.brief}`;
  missions.messageTime = 6;
  return job;
}

export function currentStep(missions) {
  if (missions.current < 0) return null;
  const job = JOBS[missions.current];
  if (missions.step >= job.steps.length) return null;
  return job.steps[missions.step];
}

export function advanceStep(missions) {
  missions.step += 1;
  const job = JOBS[missions.current];
  if (missions.step >= job.steps.length) {
    missions.done += 1;
    missions.message = `${job.title} complete — $${job.pay} earned.`;
    missions.messageTime = 5;
    missions.current = -1;
    return { complete: true, pay: job.pay };
  }
  const step = job.steps[missions.step];
  missions.timer = step.timer ?? 0;
  missions.message = step.text;
  missions.messageTime = 4;
  return { complete: false, pay: 0 };
}

export function failJob(missions, reason) {
  const job = JOBS[missions.current];
  missions.message = `${job.title} failed — ${reason}.`;
  missions.messageTime = 5;
  missions.current = -1;
  missions.step = 0;
  return job;
}

export function stepMissions(missions, dt) {
  if (missions.timer > 0) {
    missions.timer -= dt;
    if (missions.timer <= 0) {
      missions.timer = 0;
      return 'timeout';
    }
  }
  if (missions.messageTime > 0) missions.messageTime -= dt;
  return null;
}

// Where the current step's beacon sits in the world, if it has one.
export function stepTarget(missions) {
  const step = currentStep(missions);
  if (!step || step.type === 'escape' || step.type === 'enter') return null;
  return { x: step.x, z: step.z, label: step.text };
}

export function clampToCity(x, z) {
  return {
    x: Math.max(CITY.minX, Math.min(CITY.maxX, x)),
    z: Math.max(CITY.minZ, Math.min(CITY.maxZ, z)),
  };
}
