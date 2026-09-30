/**
 * Hero 3D Background Interactive Engine (Three.js)
 * Renders interactive 3D circuit geometries, orbital rings, floating data nodes,
 * and mouse-driven parallax tilt.
 */

const Hero3DBg = {
  scene: null,
  camera: null,
  renderer: null,
  group: null,
  particles: null,
  mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  canvasId: 'hero-3d-bg-canvas',

  init(canvasId = 'hero-3d-bg-canvas') {
    this.canvasId = canvasId;
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') return;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || 600;

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 18);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Dynamic Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const pointGreen = new THREE.PointLight(0x059669, 5, 50);
    pointGreen.position.set(10, 10, 10);
    this.scene.add(pointGreen);

    const pointBlue = new THREE.PointLight(0x2563eb, 4, 50);
    pointBlue.position.set(-10, -10, 10);
    this.scene.add(pointBlue);

    const pointGold = new THREE.PointLight(0xd89b1d, 3, 40);
    pointGold.position.set(0, 12, 5);
    this.scene.add(pointGold);

    // 1. Central 3D High-Tech Circuit Lattice Plate
    const plateGeo = new THREE.BoxGeometry(10, 6.5, 0.3);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.85,
      roughness: 0.2,
      wireframe: false
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(3, 0, -2);
    this.group.add(plateMesh);

    // Plate Wireframe Overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const wireMesh = new THREE.Mesh(plateGeo, wireMat);
    wireMesh.position.copy(plateMesh.position);
    this.group.add(wireMesh);

    // 2. 3D Microchip Elements & Copper Capacitors on the board
    const chipGeo = new THREE.BoxGeometry(2.4, 2.4, 0.4);
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x101828,
      metalness: 0.9,
      roughness: 0.1
    });
    const chip = new THREE.Mesh(chipGeo, chipMat);
    chip.position.set(3, 0.5, -1.7);
    this.group.add(chip);

    // Gold Pin Array
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xd89b1d,
      metalness: 0.95,
      roughness: 0.05
    });

    for (let i = -4; i <= 4; i += 0.8) {
      for (let j = -2.5; j <= 2.5; j += 0.8) {
        if (Math.abs(i) < 1.5 && Math.abs(j) < 1.5) continue;
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(3 + i, j, -1.75);
        this.group.add(pin);
      }
    }

    // 3. Kinetic Orbital Energy Rings (Circular Economy Loop)
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x059669,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.05, 16, 100), ringMat1);
    ring1.rotation.x = Math.PI / 2.8;
    this.group.add(ring1);
    this.ring1 = ring1;

    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xd89b1d,
      metalness: 0.95,
      roughness: 0.05,
      transparent: true,
      opacity: 0.65
    });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.04, 16, 100), ringMat2);
    ring2.rotation.y = Math.PI / 3.2;
    this.group.add(ring2);
    this.ring2 = ring2;

    // 4. Floating 3D Data Particles Field
    const particleCount = 240;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount * 3; p += 3) {
      positions[p] = (Math.random() - 0.5) * 26;
      positions[p + 1] = (Math.random() - 0.5) * 18;
      positions[p + 2] = (Math.random() - 0.5) * 16;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x059669,
      size: 0.18,
      transparent: true,
      opacity: 0.65
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.group.add(this.particles);

    // Initial position & tilt
    this.group.rotation.y = -0.25;
    this.group.rotation.x = 0.15;

    // Bind events
    this.bindEvents();
    this.animate();
  },

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', () => {
      const canvas = document.getElementById(this.canvasId);
      if (!canvas || !this.camera || !this.renderer) return;
      const parent = canvas.parentElement;
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || 600;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  },

  animate() {
    requestAnimationFrame(() => this.animate());

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    if (this.group) {
      this.group.rotation.y = -0.25 + this.mouse.x * 0.35;
      this.group.rotation.x = 0.15 + this.mouse.y * 0.25;
    }

    if (this.ring1) this.ring1.rotation.z += 0.006;
    if (this.ring2) this.ring2.rotation.x += 0.005;
    if (this.particles) this.particles.rotation.y += 0.001;

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
};

window.Hero3DBg = Hero3DBg;
