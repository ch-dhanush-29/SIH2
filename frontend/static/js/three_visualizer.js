/**
 * E-Waste Saathi — 3D WebGL Object Library & Interactive Scene Engine
 * Implements:
 * - <EWastePCB />
 * - <Battery3D />
 * - <Cable3D />
 * - <LCD3D />
 * - <CRT3D />
 * - <Motor3D />
 * - <Magnet3D />
 * - <Smartphone3D />
 * - <LotPassport3D />
 * - <CircularEconomyFlow />
 * - <ExplodedMaterialLayers />
 * Includes WebGL detection and automatic high-contrast 2D fallback.
 */

const ThreeVisualizer = {
  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  },

  // 0. Complete 3D Splash Screen Scene with Kinetic Logo & Holographic Rings
  initSplashScene(containerId = "splash-3d-canvas") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!this.isWebGLAvailable() || typeof THREE === "undefined") {
      this.render2DFallback(container, "E-Waste Saathi 3D");
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const emeraldLight = new THREE.PointLight(0x10b981, 4, 25);
    emeraldLight.position.set(3, 4, 5);
    scene.add(emeraldLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 3, 25);
    goldLight.position.set(-4, -3, 4);
    scene.add(goldLight);

    const splashGroup = new THREE.Group();
    scene.add(splashGroup);

    // 1. Central Rotating E-Waste Gold Chip / Crystal Core
    const coreGeo = new THREE.OctahedronGeometry(1.3, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.8,
      roughness: 0.15,
      emissive: 0x064e3b,
      emissiveIntensity: 0.4,
      wireframe: false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    splashGroup.add(coreMesh);

    // Core Wireframe Glow Cage
    const wireGeo = new THREE.OctahedronGeometry(1.4, 0);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    splashGroup.add(wireMesh);

    // 2. Kinetic Circular Economy Orbital Rings (3 Mobius-like Rings)
    const ringMat1 = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9, roughness: 0.1 });
    const ringMat2 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.05 });
    const ringMat3 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.06, 16, 64), ringMat1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 16, 64), ringMat2);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.06, 16, 64), ringMat3);

    ring1.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    ring3.rotation.z = Math.PI / 6;

    splashGroup.add(ring1);
    splashGroup.add(ring2);
    splashGroup.add(ring3);

    // 3. Floating E-Waste Particle Nebula
    const particles = this.createMineralParticleSwarm(120);
    splashGroup.add(particles);

    // Mouse tilt interaction
    let rotX = 0, rotY = 0;
    container.addEventListener("mousemove", (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      rotY = x * 0.6;
      rotX = -y * 0.4;
    });

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      splashGroup.rotation.y += (rotY - splashGroup.rotation.y) * 0.05 + 0.01;
      splashGroup.rotation.x += (rotX - splashGroup.rotation.x) * 0.05;

      coreMesh.rotation.y = t * 0.8;
      coreMesh.rotation.x = t * 0.5;
      wireMesh.rotation.y = -t * 0.6;

      ring1.rotation.x = Math.PI / 3 + Math.sin(t * 1.2) * 0.3;
      ring1.rotation.y = t * 0.9;

      ring2.rotation.y = Math.PI / 4 + Math.cos(t * 1.4) * 0.3;
      ring2.rotation.z = -t * 0.7;

      ring3.rotation.z = Math.PI / 6 + Math.sin(t * 1.6) * 0.3;
      ring3.rotation.x = t * 0.5;

      renderer.render(scene, camera);
    };
    animate();
  },

  // =========================================================================
  // CINEMATIC SCROLL JOURNEY SYSTEM (Continuous WebGL Camera Pipeline)
  // Maps scroll progress [0.00 -> 1.00] directly to seamless 3D camera transforms
  // Waste -> AI Scan -> Fair Price -> Recycler Network -> Lot Passport -> Recovery
  // =========================================================================
  initCinematicJourney(canvasId = "cinematic-3d-canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!this.isWebGLAvailable() || typeof THREE === "undefined") {
      return;
    }

    const parent = canvas.parentElement;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.8, 8.5);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Studio Ambient & Dramatic Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const saffronKey = new THREE.PointLight(0xff9933, 3.5, 45);
    saffronKey.position.set(6, 8, 8);
    scene.add(saffronKey);

    const emeraldFill = new THREE.PointLight(0x10b981, 3.0, 45);
    emeraldFill.position.set(-6, -3, 6);
    scene.add(emeraldFill);

    const chakraBack = new THREE.PointLight(0x38bdf8, 2.5, 45);
    chakraBack.position.set(0, 10, -8);
    scene.add(chakraBack);

    // Primary World Group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Object 1: High-Precision Discarded Smartphone & Telecom PCB
    const heroPCB = this.createPCBModel();
    heroPCB.position.set(0, 0, 0);
    worldGroup.add(heroPCB);

    // Laser AI Scanning Holographic Plane
    const scanGeo = new THREE.PlaneGeometry(6.2, 0.08);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const scanLaser = new THREE.Mesh(scanGeo, scanMat);
    scanLaser.rotation.x = Math.PI / 2;
    scanLaser.position.set(0, 0.25, 0);
    worldGroup.add(scanLaser);

    // Object 2: Satellite Recycler Node Network (Mesh Cluster)
    const networkGroup = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const nodeMatVerified = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x065f46, emissiveIntensity: 0.5 });
    const nodeMatHub = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0369a1, emissiveIntensity: 0.5 });

    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 4.2 + (i % 3) * 0.8;
      const node = new THREE.Mesh(nodeGeo, i % 2 === 0 ? nodeMatVerified : nodeMatHub);
      node.position.set(Math.cos(angle) * radius, (Math.sin(i * 1.5) * 1.2), Math.sin(angle) * radius);
      networkGroup.add(node);
    }
    worldGroup.add(networkGroup);

    // Object 3: Swarm Particle Recovery Matrix
    const particles = this.createMineralParticleSwarm(220);
    worldGroup.add(particles);

    // Object 4: Exploded Material Substrates (Visible on Deep Scroll)
    const explodedGroup = new THREE.Group();
    explodedGroup.position.set(0, 0, 0);
    
    // Top Au Contacts
    const goldPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.05, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.1 })
    );
    goldPlate.position.set(0, 1.6, 0.8);
    explodedGroup.add(goldPlate);

    // Copper Traces
    const copperPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.06, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.9, roughness: 0.15 })
    );
    copperPlate.position.set(0, 0.8, 0);
    explodedGroup.add(copperPlate);

    explodedGroup.visible = false;
    worldGroup.add(explodedGroup);

    // Scroll Interpolation Target State
    let scrollProgress = 0;
    let targetCameraPos = new THREE.Vector3(0, 1.8, 8.5);
    let targetCameraLook = new THREE.Vector3(0, 0, 0);
    let targetWorldRotY = 0;
    let targetWorldRotX = 0.25;

    // Smooth scroll event hook
    window.addEventListener("scroll", () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;

      // Update HUD progress indicator
      const hudProgress = document.getElementById("scroll-journey-percent");
      if (hudProgress) hudProgress.innerText = Math.round(scrollProgress * 100) + "%";

      const hudStage = document.getElementById("scroll-journey-stage");
      if (hudStage) {
        if (scrollProgress < 0.18) hudStage.innerText = "01. Discarded E-Waste Discovery";
        else if (scrollProgress < 0.36) hudStage.innerText = "02. AI Vision Classification (94.7%)";
        else if (scrollProgress < 0.54) hudStage.innerText = "03. Realtime Fair Price Intelligence";
        else if (scrollProgress < 0.72) hudStage.innerText = "04. Recycler MCDA Geospatial Match";
        else if (scrollProgress < 0.90) hudStage.innerText = "05. Cryptographic SHA-256 Passport";
        else hudStage.innerText = "06. Circular Economy Mineral Recovery";
      }
    });

    // Handle Window Resize
    window.addEventListener("resize", () => {
      const newW = parent.clientWidth || window.innerWidth;
      const newH = parent.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });

    // Animation Render Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Continuous Cinematic Camera Keyframe Curves based on Scroll
      if (scrollProgress < 0.20) {
        // Stage 1: Close inspection of discarded device
        targetCameraPos.set(Math.sin(t * 0.3) * 0.5, 1.5, 7.5 - scrollProgress * 5.0);
        targetCameraLook.set(0, 0, 0);
        targetWorldRotY = scrollProgress * 2.0;
        targetWorldRotX = 0.25;
        scanLaser.visible = false;
        explodedGroup.visible = false;
        heroPCB.visible = true;
      } else if (scrollProgress < 0.40) {
        // Stage 2: Laser AI Scanning & Classification
        const stageProgress = (scrollProgress - 0.20) / 0.20;
        targetCameraPos.set(0, 3.2, 5.2);
        targetCameraLook.set(0, 0.2, 0);
        targetWorldRotY = 0.4 + stageProgress * 0.5;
        targetWorldRotX = 0.65;
        scanLaser.visible = true;
        scanLaser.position.z = Math.sin(t * 4.0) * 1.6;
        scanLaser.material.opacity = 0.6 + Math.sin(t * 8.0) * 0.3;
        explodedGroup.visible = false;
        heroPCB.visible = true;
      } else if (scrollProgress < 0.60) {
        // Stage 3: Fair Price Matrix & Financial Landscape
        const stageProgress = (scrollProgress - 0.40) / 0.20;
        targetCameraPos.set(3.5, 2.2, 6.0);
        targetCameraLook.set(0, 0, 0);
        targetWorldRotY = 1.0 + stageProgress * 1.5;
        targetWorldRotX = 0.3;
        scanLaser.visible = false;
        explodedGroup.visible = false;
        heroPCB.visible = true;
      } else if (scrollProgress < 0.80) {
        // Stage 4: Recycler Network Node Pullback
        const stageProgress = (scrollProgress - 0.60) / 0.20;
        targetCameraPos.set(0, 5.0, 11.0);
        targetCameraLook.set(0, 0, 0);
        targetWorldRotY = 2.5 + stageProgress * 2.0;
        targetWorldRotX = 0.45;
        scanLaser.visible = false;
        networkGroup.rotation.y = t * 0.4;
        explodedGroup.visible = false;
        heroPCB.visible = true;
      } else {
        // Stage 5: Exploded View Mineral Recovery (Gold, Copper, Rare Earths)
        targetCameraPos.set(-2.5, 3.0, 7.0);
        targetCameraLook.set(0, 0.5, 0);
        targetWorldRotY = 4.5 + (scrollProgress - 0.80) * 2.0;
        targetWorldRotX = 0.4;
        scanLaser.visible = false;
        heroPCB.visible = false;
        explodedGroup.visible = true;
        explodedGroup.rotation.y = t * 0.5;
      }

      // Smooth Camera & Object Inertia (Lerp)
      camera.position.lerp(targetCameraPos, 0.06);
      camera.lookAt(targetCameraLook);
      worldGroup.rotation.y += (targetWorldRotY - worldGroup.rotation.y) * 0.06;
      worldGroup.rotation.x += (targetWorldRotX - worldGroup.rotation.x) * 0.06;

      // Float particles continuously
      const posArr = particles.geometry.attributes.position.array;
      for (let i = 0; i < 220; i++) {
        posArr[i * 3 + 1] += 0.015;
        if (posArr[i * 3 + 1] > 5.0) posArr[i * 3 + 1] = -2.0;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();
  },

  // 1. Hero 3D Multi-Object Floating Ecosystem
  initHeroScene(containerId = "hero-3d-canvas") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!this.isWebGLAvailable() || typeof THREE === "undefined") {
      this.render2DFallback(container, "E-Waste Interactive Ecosystem");
      return;
    }

    const width = container.clientWidth || 450;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 10.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const greenLight = new THREE.PointLight(0x10b981, 3, 30);
    greenLight.position.set(5, 6, 5);
    scene.add(greenLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.5, 30);
    goldLight.position.set(-5, -3, 4);
    scene.add(goldLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 2, 30);
    blueLight.position.set(0, 6, -4);
    scene.add(blueLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Main Centerpiece: Detailed Multi-Layer PCB
    const pcbGroup = this.createPCBModel();
    pcbGroup.position.set(0, 0, 0);
    mainGroup.add(pcbGroup);

    // Floating Satellite Object 1: Li-Ion Battery
    const batteryGroup = this.createBatteryModel();
    batteryGroup.position.set(-3.2, 1.8, 1.2);
    batteryGroup.scale.set(0.65, 0.65, 0.65);
    mainGroup.add(batteryGroup);

    // Floating Satellite Object 2: Smartphone Chassis
    const phoneGroup = this.createSmartphoneModel();
    phoneGroup.position.set(3.4, -1.2, 0.8);
    phoneGroup.scale.set(0.7, 0.7, 0.7);
    mainGroup.add(phoneGroup);

    // Floating Satellite Object 3: Copper Coiled Cable
    const cableGroup = this.createCableModel();
    cableGroup.position.set(-2.8, -2.0, -0.5);
    cableGroup.scale.set(0.6, 0.6, 0.6);
    mainGroup.add(cableGroup);

    // Floating Satellite Object 4: Neodymium Magnet Assembly
    const magnetGroup = this.createMagnetModel();
    magnetGroup.position.set(3.0, 2.2, -1.0);
    magnetGroup.scale.set(0.55, 0.55, 0.55);
    mainGroup.add(magnetGroup);

    // Mineral Recovery Swarm Particles
    const particles = this.createMineralParticleSwarm(140);
    mainGroup.add(particles);

    // Mouse Interaction
    let targetRotX = 0.35;
    let targetRotY = -0.3;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      targetRotY = -0.3 + x * 0.7;
      targetRotX = 0.35 - y * 0.45;
    };
    container.addEventListener("mousemove", onMouseMove);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      mainGroup.rotation.y += (targetRotY - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (targetRotX - mainGroup.rotation.x) * 0.05;

      // Independent orbits for floating parts
      batteryGroup.rotation.y = t * 0.8;
      batteryGroup.position.y = 1.8 + Math.sin(t * 1.5) * 0.25;

      phoneGroup.rotation.x = t * 0.6;
      phoneGroup.position.y = -1.2 + Math.cos(t * 1.3) * 0.25;

      cableGroup.rotation.z = t * 0.5;
      cableGroup.position.y = -2.0 + Math.sin(t * 1.8 + 1) * 0.2;

      magnetGroup.rotation.y = t * 1.1;
      magnetGroup.position.y = 2.2 + Math.cos(t * 1.6) * 0.2;

      // Particle floating extraction
      const posArr = particles.geometry.attributes.position.array;
      for (let i = 0; i < 140; i++) {
        posArr[i * 3 + 1] += 0.018;
        if (posArr[i * 3 + 1] > 4.5) {
          posArr[i * 3 + 1] = -1.5;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener("resize", () => {
      const nw = container.clientWidth || 450;
      const nh = container.clientHeight || 380;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
  },

  // 2. Interactive Material Showcase Viewer (Changes based on selected material)
  initMaterialShowcase(containerId = "material-showcase-canvas", materialCode = "PCB") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!this.isWebGLAvailable() || typeof THREE === "undefined") {
      this.render2DFallback(container, materialCode);
      return;
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 8.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x10b981, 3.5, 40);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 2.5, 40);
    fillLight.position.set(-4, -2, 4);
    scene.add(fillLight);

    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, 0);
    scene.add(rootGroup);

    let activeModel;
    if (materialCode === "PCB") activeModel = this.createPCBModel();
    else if (materialCode === "BATTERY") activeModel = this.createBatteryModel();
    else if (materialCode === "CABLE") activeModel = this.createCableModel();
    else if (materialCode === "PHONE") activeModel = this.createSmartphoneModel();
    else if (materialCode === "LCD") activeModel = this.createLCDModel();
    else if (materialCode === "CRT") activeModel = this.createCRTModel();
    else if (materialCode === "MOTOR") activeModel = this.createMotorModel();
    else if (materialCode === "MAGNET" || materialCode === "HDD") activeModel = this.createMagnetModel();
    else activeModel = this.createPCBModel();

    rootGroup.add(activeModel);

    // Add mineral particle highlights
    const particles = this.createMineralParticleSwarm(90);
    rootGroup.add(particles);

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    container.onmousedown = (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    window.onmouseup = () => { isDragging = false; };
    container.onmousemove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      rootGroup.rotation.y += dx * 0.015;
      rootGroup.rotation.x += dy * 0.015;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!isDragging) {
        rootGroup.rotation.y += 0.008;
      }
      rootGroup.position.y = Math.sin(t * 1.5) * 0.12;
      renderer.render(scene, camera);
    };
    animate();
  },

  // 3. 3D Exploded View for Material Recovery Lens
  initExplodedRecoveryView(containerId = "exploded-3d-canvas") {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === "undefined") return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(light);
    const pLight = new THREE.PointLight(0xf59e0b, 3, 20);
    pLight.position.set(3, 4, 3);
    scene.add(pLight);

    const group = new THREE.Group();
    scene.add(group);

    // Layer 1 (Bottom): Fiberglass FR4 Base Substrate
    const baseGeo = new THREE.BoxGeometry(4.5, 0.1, 3.2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 });
    const layer1 = new THREE.Mesh(baseGeo, baseMat);
    layer1.position.y = -1.2;
    group.add(layer1);

    // Layer 2: Copper Etched Trace Plane (Orange)
    const cuGeo = new THREE.BoxGeometry(4.2, 0.08, 3.0);
    const cuMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.9, roughness: 0.1 });
    const layer2 = new THREE.Mesh(cuGeo, cuMat);
    layer2.position.y = -0.4;
    group.add(layer2);

    // Layer 3: Processors & Chips (Black Silica + Gallium)
    const siGeo = new THREE.BoxGeometry(1.6, 0.25, 1.6);
    const siMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const layer3 = new THREE.Mesh(siGeo, siMat);
    layer3.position.y = 0.5;
    group.add(layer3);

    // Layer 4 (Top): Gold Finger Contact Layer (Yellow Gold)
    const auGeo = new THREE.BoxGeometry(4.0, 0.06, 0.8);
    const auMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.98, roughness: 0.05, emissive: 0x78350f, emissiveIntensity: 0.3 });
    const layer4 = new THREE.Mesh(auGeo, auMat);
    layer4.position.set(0, 1.4, 0.8);
    group.add(layer4);

    group.rotation.x = 0.4;
    group.rotation.y = -0.5;

    const animate = () => {
      requestAnimationFrame(animate);
      group.rotation.y += 0.007;
      renderer.render(scene, camera);
    };
    animate();
  },

  // 4. 3D Digital Scale Model (Recycler Handover View)
  initDigitalScale3D(containerId = "scale-3d-canvas", weightVal = 17.6) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === "undefined") return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);
    const topLight = new THREE.PointLight(0x10b981, 2, 20);
    topLight.position.set(0, 4, 2);
    scene.add(topLight);

    const scaleGroup = new THREE.Group();
    scene.add(scaleGroup);

    // Scale Heavy Base
    const baseGeo = new THREE.BoxGeometry(3.6, 0.4, 3.2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    const scaleBase = new THREE.Mesh(baseGeo, baseMat);
    scaleGroup.add(scaleBase);

    // Steel Platform Plate (Weighing Pan)
    const panGeo = new THREE.BoxGeometry(3.2, 0.15, 2.8);
    const panMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
    const scalePan = new THREE.Mesh(panGeo, panMat);
    scalePan.position.y = 0.3;
    scaleGroup.add(scalePan);

    // E-Waste Lot Placed On Pan
    const lotMesh = this.createPCBModel();
    lotMesh.scale.set(0.45, 0.45, 0.45);
    lotMesh.position.set(0, 0.45, 0);
    scaleGroup.add(lotMesh);

    // Digital LED Display Box
    const ledGeo = new THREE.BoxGeometry(1.4, 0.5, 0.3);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.8 });
    const ledBox = new THREE.Mesh(ledGeo, ledMat);
    ledBox.position.set(0, 0.25, 1.6);
    scaleGroup.add(ledBox);

    scaleGroup.rotation.x = 0.45;
    scaleGroup.rotation.y = -0.3;

    const animate = () => {
      requestAnimationFrame(animate);
      scalePan.position.y = 0.3 + Math.sin(Date.now() * 0.005) * 0.02;
      scaleGroup.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();
  },

  // -------------------------------------------------------------
  // MODEL BUILDERS (LOW-POLY OPTIMIZED WEBGL PROCEDURAL OBJECTS)
  // -------------------------------------------------------------

  createPCBModel() {
    const group = new THREE.Group();
    // Base Green Substrate
    const pcbGeo = new THREE.BoxGeometry(4.8, 0.15, 3.4);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x065f46, metalness: 0.3, roughness: 0.4 });
    const substrate = new THREE.Mesh(pcbGeo, pcbMat);
    group.add(substrate);

    // CPU Socket
    const cpuGeo = new THREE.BoxGeometry(1.2, 0.2, 1.2);
    const cpuMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.15 });
    const cpu = new THREE.Mesh(cpuGeo, cpuMat);
    cpu.position.set(-1.0, 0.12, -0.4);
    group.add(cpu);

    // Gold Pin Array
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.05, emissive: 0x78350f, emissiveIntensity: 0.2 });
    for (let x = -2.0; x <= 2.0; x += 0.3) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.45), goldMat);
      pin.position.set(x, 0.04, 1.6);
      group.add(pin);
    }

    // Cylindrical Capacitors
    const capMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12), capMat);
      cap.position.set(0.8 + (i * 0.35), 0.3, -0.8 + (i * 0.3));
      group.add(cap);
    }
    return group;
  },

  createBatteryModel() {
    const group = new THREE.Group();
    // Metallic Li-ion rectangular pouch cell
    const cellGeo = new THREE.BoxGeometry(2.4, 0.35, 3.8);
    const cellMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const cell = new THREE.Mesh(cellGeo, cellMat);
    group.add(cell);

    // Terminal Ribbons (+ / -)
    const termMatP = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9 });
    const termP = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.5), termMatP);
    termP.position.set(-0.6, 0.1, 2.0);
    group.add(termP);

    const termMatN = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.9 });
    const termN = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.5), termMatN);
    termN.position.set(0.6, 0.1, 2.0);
    group.add(termN);

    // Warning Shield Stripe
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x78350f });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.36, 0.8), stripeMat);
    group.add(stripe);

    return group;
  },

  createCableModel() {
    const group = new THREE.Group();
    // Torus coiled thick copper cable
    const coilGeo = new THREE.TorusGeometry(1.6, 0.3, 16, 40);
    const sheathMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const coil = new THREE.Mesh(coilGeo, sheathMat);
    group.add(coil);

    // Exposed Copper Strands
    const cuMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.92, roughness: 0.15 });
    for (let i = 0; i < 5; i++) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), cuMat);
      strand.position.set(1.5 + (i * 0.08), 0.2, 0.8);
      strand.rotation.z = 0.5 + (i * 0.1);
      group.add(strand);
    }
    return group;
  },

  createSmartphoneModel() {
    const group = new THREE.Group();
    // Phone Aluminum Unibody
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.22, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Glass Screen
    const screenGeo = new THREE.BoxGeometry(1.85, 0.05, 3.9);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.95, roughness: 0.05 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 0.12;
    group.add(screen);

    // Camera Module
    const camGeo = new THREE.BoxGeometry(0.7, 0.08, 0.7);
    const camMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const cam = new THREE.Mesh(camGeo, camMat);
    cam.position.set(0.5, -0.12, 1.6);
    group.add(cam);

    return group;
  },

  createLCDModel() {
    const group = new THREE.Group();
    // Flat Display Panel with Glass Layer
    const frameGeo = new THREE.BoxGeometry(4.4, 3.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    const panelGeo = new THREE.BoxGeometry(4.1, 2.9, 0.05);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.9, roughness: 0.1 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.z = 0.11;
    group.add(panel);

    return group;
  },

  createCRTModel() {
    const group = new THREE.Group();
    // Funnel-shaped glass tube
    const coneGeo = new THREE.ConeGeometry(2.2, 3.0, 16);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.85 });
    const funnel = new THREE.Mesh(coneGeo, glassMat);
    funnel.rotation.x = Math.PI;
    group.add(funnel);

    // Heavy front screen glass
    const faceGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 16);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.y = 1.5;
    group.add(face);

    return group;
  },

  createMotorModel() {
    const group = new THREE.Group();
    // Stator Cast Iron Cylinder
    const statorGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.8, 16);
    const statorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const stator = new THREE.Mesh(statorGeo, statorMat);
    group.add(stator);

    // Copper Winding Coils
    const cuGeo = new THREE.TorusGeometry(1.2, 0.25, 12, 24);
    const cuMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.95 });
    const coil1 = new THREE.Mesh(cuGeo, cuMat);
    coil1.rotation.x = Math.PI / 2;
    coil1.position.y = 1.4;
    group.add(coil1);

    const coil2 = new THREE.Mesh(cuGeo, cuMat);
    coil2.rotation.x = Math.PI / 2;
    coil2.position.y = -1.4;
    group.add(coil2);

    // Center Steel Rotor Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 4.0, 12);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    group.add(shaft);

    return group;
  },

  createMagnetModel() {
    const group = new THREE.Group();
    // HDD Actuator Rare-Earth Neodymium Magnet Bracket
    const magGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16, 1, false, 0, Math.PI);
    const magMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, metalness: 0.95, roughness: 0.1 });
    const mag = new THREE.Mesh(magGeo, magMat);
    group.add(mag);

    // Steel Backing Plate
    const plateGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.1, 16, 1, false, 0, Math.PI);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -0.2;
    group.add(plate);

    return group;
  },

  createMineralParticleSwarm(count = 100) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cGold = new THREE.Color(0xfacc15);
    const cCu = new THREE.Color(0xf97316);
    const cNeo = new THREE.Color(0x2dd4bf);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

      const mod = i % 3;
      const c = mod === 0 ? cGold : (mod === 1 ? cCu : cNeo);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    return new THREE.Points(geo, mat);
  },

  render2DFallback(container, title = "E-Waste Material") {
    container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl mb-3">
          <i class="fa-solid fa-microchip"></i>
        </div>
        <h4 class="text-sm font-bold text-white">${title}</h4>
        <p class="text-xs text-slate-400 mt-1">High-Precision 2D Fallback Mode Active</p>
      </div>
    `;
  }
};

window.ThreeVisualizer = ThreeVisualizer;
