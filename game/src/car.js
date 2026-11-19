// Azura Bay — cars as extruded side silhouettes: a shaped body with a
// glasshouse, lights, bumpers and spinning wheels. No plain boxes.
window.AZURA = window.AZURA || {};

const AzuraCar = {
  // Side profile of a car (length along X, height along Y), drawn once and
  // extruded across the car's width.
  bodyShape() {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0.35);
    s.lineTo(-2.1, 0.75);
    s.quadraticCurveTo(-2.05, 1.0, -1.75, 1.05); // rear deck
    s.lineTo(-0.9, 1.08);
    s.quadraticCurveTo(-0.55, 1.55, -0.1, 1.58); // roofline up
    s.lineTo(0.75, 1.55);
    s.quadraticCurveTo(1.15, 1.5, 1.45, 1.05); // windshield down to hood
    s.lineTo(2.05, 0.95);
    s.quadraticCurveTo(2.15, 0.7, 2.1, 0.4);
    s.lineTo(1.9, 0.3);
    s.lineTo(-1.9, 0.3);
    s.closePath();
    return s;
  },

  makeWheel(radius) {
    const wheel = new THREE.Group();
    const tyre = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.35, 14),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
    );
    tyre.rotation.z = Math.PI / 2;
    wheel.add(tyre);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.37, 10),
      new THREE.MeshLambertMaterial({ color: 0xc8c8c8 }),
    );
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    // Spokes, so the spin is visible.
    for (let i = 0; i < 3; i += 1) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, radius * 1.7, 0.38),
        new THREE.MeshLambertMaterial({ color: 0x888888 }),
      );
      spoke.rotation.x = (i / 3) * Math.PI;
      wheel.add(spoke);
    }
    return wheel;
  },

  // opts: { color, police, x, z, heading }. Returns a car object.
  makeCar(scene, opts) {
    const cfg = AZURA.config;
    const group = new THREE.Group();
    const color = opts.color !== undefined ? opts.color : AZURA.utils.pick(cfg.carColors);

    // Extruded body: shape in XY (length/height), extruded across width.
    const geo = new THREE.ExtrudeGeometry(this.bodyShape(), {
      depth: 1.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2,
    });
    geo.translate(0, 0, -0.85);
    const body = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ color }),
    );
    body.rotation.y = -Math.PI / 2; // length onto Z (forward = -Z)
    body.castShadow = true;
    group.add(body);

    // Glasshouse: dark cabin glass sitting on the roofline.
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 1.7),
      new THREE.MeshLambertMaterial({ color: 0x18242e }),
    );
    glass.position.set(0, 1.45, 0.15);
    glass.castShadow = true;
    group.add(glass);

    // Headlights (front, -Z) and taillights (rear, +Z).
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c8, emissive: '#fff2b0' });
    const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: '#ff2222' });
    [-0.6, 0.6].forEach((x) => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.1), headMat);
      head.position.set(x, 0.75, -2.12);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.1), tailMat);
      tail.position.set(x, 0.8, 2.12);
      group.add(tail);
    });

    // Bumpers.
    const bumperMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    [-2.12, 2.12].forEach((z) => {
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.15), bumperMat);
      bumper.position.set(0, 0.38, z);
      group.add(bumper);
    });

    // Wheels: front pair steers, all four spin with speed.
    const wheels = [];
    [
      [-0.85, -1.35, true], [0.85, -1.35, true],
      [-0.85, 1.35, false], [0.85, 1.35, false],
    ].forEach(([x, z, front]) => {
      const wheel = this.makeWheel(0.42);
      wheel.position.set(x, 0.42, z);
      wheel.userData.front = front;
      group.add(wheel);
      wheels.push(wheel);
    });

    let lightBar = null;
    let lightL = null;
    let lightR = null;
    if (opts.police) {
      lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.18, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      lightBar.position.set(0, 1.78, 0.1);
      group.add(lightBar);
      lightL = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.52),
        new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: '#ff2222' }),
      );
      lightL.position.set(-0.32, 1.78, 0.1);
      group.add(lightL);
      lightR = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.52),
        new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: '#2244ff' }),
      );
      lightR.position.set(0.32, 1.78, 0.1);
      group.add(lightR);
    }

    group.position.set(opts.x || 0, 0, opts.z || 0);
    group.rotation.y = opts.heading || 0;
    scene.add(group);

    return {
      group, wheels, lightL, lightR, police: !!opts.police,
      x: opts.x || 0, z: opts.z || 0, heading: opts.heading || 0,
      speed: 0, steer: 0, color, health: 100,
      flashTimer: 0,
      sync() {
        this.group.position.x = this.x;
        this.group.position.z = this.z;
        this.group.rotation.y = this.heading;
        const spin = (this.speed * 0.016) / 0.42;
        this.wheels.forEach((w) => {
          w.rotation.x += spin;
          if (w.userData.front) w.rotation.y = this.steer * 0.45;
        });
        if (this.lightL && this.lightR) {
          this.flashTimer += 1;
          const on = Math.floor(this.flashTimer / 12) % 2 === 0;
          this.lightL.material.emissive.set(on ? '#ff2222' : '#330000');
          this.lightR.material.emissive.set(on ? '#000033' : '#2244ff');
        }
      },
    };
  },
};

AZURA.car = AzuraCar;
