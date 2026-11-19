// The 3D scenes. Each builder gets THREE, the scene and returns update(nowMs). Same shapes as the code shown.
export const BUILDERS = {
  cube(THREE, scene) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.35, metalness: 0.2 }));
    scene.add(cube);
    return (now) => { cube.rotation.x = now / 1500; cube.rotation.y = now / 1000; };
  },
  knot(THREE, scene) {
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, 0.38, 120, 16), new THREE.MeshStandardMaterial({ color: 0x5ac8fa, roughness: 0.15, metalness: 0.9 }));
    scene.add(knot);
    return (now) => { knot.rotation.y = now / 1200; knot.rotation.x = Math.sin(now / 1800) * 0.5; };
  },
  points(THREE, scene) {
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * Math.random()), theta = Math.random() * Math.PI * 2;
      pos[i * 3] = 2 * Math.sin(phi) * Math.cos(theta); pos[i * 3 + 1] = 2 * Math.sin(phi) * Math.sin(theta); pos[i * 3 + 2] = 2 * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dots = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf2c94c, size: 0.045 }));
    scene.add(dots);
    return (now) => { dots.rotation.y = now / 3000; };
  },
  grid(THREE, scene) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.4 }), 144);
    mesh.rotation.x = -0.9; scene.add(mesh);
    const dummy = new THREE.Object3D();
    return (now) => {
      const t = now / 800; let i = 0;
      for (let x = 0; x < 12; x++) for (let z = 0; z < 12; z++) {
        dummy.position.set((x - 5.5) * 0.4, Math.sin(t + x * 0.5 + z * 0.5) * 0.35, (z - 5.5) * 0.4);
        dummy.updateMatrix(); mesh.setMatrixAt(i++, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
  },
  planet(THREE, scene) {
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.6 }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.9, 64), new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2.4;
    const orbit = new THREE.Group();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    moon.position.x = 2.6; orbit.add(moon);
    scene.add(planet, ring, orbit);
    return (now) => { planet.rotation.y = now / 2500; orbit.rotation.y = now / 1200; };
  }
};
