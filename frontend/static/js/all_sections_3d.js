/**
 * Multi-Section 3D Real-Time WebGL Rendering Engine (Three.js)
 * E-Waste Saathi — Top-to-Bottom Unique Industrial 3D Visual Themes
 *
 * Performance-optimized: Uses IntersectionObserver to pause off-screen 3D scenes.
 */

(function() {
  'use strict';

  // Global mouse tracking for parallax across all canvases
  const globalMouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', (e) => {
    globalMouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    globalMouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Base Helper to instantiate a Three.js scene with automated resizing & observer
  function createScene3D(canvasId, initCallback, animateCallback) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') return null;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const state = {
      scene,
      camera,
      renderer,
      canvas,
      isVisible: true,
      clock: new THREE.Clock()
    };

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    initCallback(state);

    // Resize handling
    window.addEventListener('resize', () => {
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // Viewport Intersection Observer (pause rendering when scrolled away)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          state.isVisible = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(canvas);
    }

    // Animation Loop
    function renderLoop() {
      requestAnimationFrame(renderLoop);
      if (!state.isVisible) return;
      
      const delta = state.clock.getDelta();
      const time = state.clock.getElapsedTime();

      // Smooth mouse lerp
      globalMouse.x += (globalMouse.targetX - globalMouse.x) * 0.05;
      globalMouse.y += (globalMouse.targetY - globalMouse.y) * 0.05;

      animateCallback(state, time, delta, globalMouse);
      renderer.render(scene, camera);
    }

    renderLoop();
    return state;
  }

  // =========================================================================
  // 1. HERO SECTION: 3D CYBERNETIC CIRCUIT & ORBITAL RINGS
  // =========================================================================
  function initHero3D() {
    createScene3D('hero-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightGreen = new THREE.PointLight(0x059669, 5, 50);
      pLightGreen.position.set(10, 10, 10);
      s.scene.add(pLightGreen);

      const pLightBlue = new THREE.PointLight(0x2563eb, 4, 50);
      pLightBlue.position.set(-10, -10, 10);
      s.scene.add(pLightBlue);

      // 3D Circuit Plate
      const plateGeo = new THREE.BoxGeometry(10, 6.5, 0.3);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.2 });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.set(3, 0, -2);
      group.add(plateMesh);

      // Plate Wireframe
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x059669, wireframe: true, transparent: true, opacity: 0.35 });
      const wireMesh = new THREE.Mesh(plateGeo, wireMat);
      wireMesh.position.copy(plateMesh.position);
      group.add(wireMesh);

      // Orbital Rings
      const ringMat1 = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.75 });
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.05, 16, 100), ringMat1);
      ring1.rotation.x = Math.PI / 2.8;
      group.add(ring1);
      s.ring1 = ring1;

      const ringMat2 = new THREE.MeshStandardMaterial({ color: 0xd89b1d, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.65 });
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.04, 16, 100), ringMat2);
      ring2.rotation.y = Math.PI / 3.2;
      group.add(ring2);
      s.ring2 = ring2;

      // Particles
      const pCount = 200;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let p = 0; p < pCount * 3; p += 3) {
        pPos[p] = (Math.random() - 0.5) * 26;
        pPos[p + 1] = (Math.random() - 0.5) * 18;
        pPos[p + 2] = (Math.random() - 0.5) * 16;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({ color: 0x059669, size: 0.18, transparent: true, opacity: 0.65 });
      s.particles = new THREE.Points(pGeo, pMat);
      group.add(s.particles);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = -0.25 + mouse.x * 0.35;
      s.group.rotation.x = 0.15 + mouse.y * 0.25;
      s.ring1.rotation.z += 0.006;
      s.ring2.rotation.x += 0.005;
      s.particles.rotation.y += 0.001;
    });
  }

  // =========================================================================
  // 2. SECTION 01: 3D HOLOGRAPHIC AI NEURAL LATTICE & SCANNING POLYHEDRA
  // =========================================================================
  function initSection01_AI() {
    createScene3D('s01-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLight = new THREE.PointLight(0x059669, 5, 40);
      pLight.position.set(8, 8, 8);
      s.scene.add(pLight);

      // Concentric Dual Icosahedrons (AI Core Geometry)
      const icoGeo1 = new THREE.IcosahedronGeometry(3.6, 1);
      const icoMat1 = new THREE.MeshStandardMaterial({
        color: 0x059669,
        wireframe: true,
        transparent: true,
        opacity: 0.55
      });
      s.ico1 = new THREE.Mesh(icoGeo1, icoMat1);
      s.ico1.position.set(4, 0, -2);
      group.add(s.ico1);

      const icoGeo2 = new THREE.OctahedronGeometry(2.2, 0);
      const icoMat2 = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.75
      });
      s.ico2 = new THREE.Mesh(icoGeo2, icoMat2);
      s.ico2.position.set(4, 0, -2);
      group.add(s.ico2);

      // Neural Cloud Floating Nodes
      const nodeCount = 60;
      const nodeGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const nodeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 });
      s.nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(
          3 + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          -2 + (Math.random() - 0.5) * 6
        );
        group.add(node);
        s.nodes.push({ mesh: node, speed: 0.5 + Math.random() * 0.8, offset: Math.random() * Math.PI * 2 });
      }

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.25;
      s.group.rotation.x = mouse.y * 0.2;
      s.ico1.rotation.x += 0.008;
      s.ico1.rotation.y += 0.012;
      s.ico2.rotation.x -= 0.012;
      s.ico2.rotation.z += 0.010;

      s.nodes.forEach(n => {
        n.mesh.position.y += Math.sin(time * n.speed + n.offset) * 0.005;
      });
    });
  }

  // =========================================================================
  // 3. SECTION 03: 3D FLOWING HARMONIC FINANCIAL WAVE & PRICE RIBBON
  // =========================================================================
  function initSection03_Pricing() {
    createScene3D('s03-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightGold = new THREE.PointLight(0xd89b1d, 5, 45);
      pLightGold.position.set(6, 6, 8);
      s.scene.add(pLightGold);

      // 3D Parametric Sinusoidal Wireframe Mesh
      const planeGeo = new THREE.PlaneGeometry(16, 10, 32, 20);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0xd89b1d,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        metalness: 0.8,
        roughness: 0.2
      });
      s.waveMesh = new THREE.Mesh(planeGeo, planeMat);
      s.waveMesh.position.set(3, -0.5, -4);
      s.waveMesh.rotation.x = -Math.PI / 3.2;
      group.add(s.waveMesh);

      // Floating Spot Price Crystals (Torus Knots)
      const knotGeo = new THREE.TorusKnotGeometry(1.2, 0.25, 64, 16);
      const knotMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8
      });
      s.knot = new THREE.Mesh(knotGeo, knotMat);
      s.knot.position.set(6, 1.2, -1);
      group.add(s.knot);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.2;
      s.group.rotation.x = mouse.y * 0.15;
      s.knot.rotation.x += 0.01;
      s.knot.rotation.y += 0.015;

      // Animate 3D plane vertices dynamically
      const pos = s.waveMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z = Math.sin(u * 0.6 + time * 2.0) * 0.5 + Math.cos(v * 0.8 + time * 1.5) * 0.4;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    });
  }

  // =========================================================================
  // 4. SECTION 04: 3D GEOSPATIAL LOGISTICS NETWORK & ROUTING ORBITS
  // =========================================================================
  function initSection04_Recycler() {
    createScene3D('s04-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightBlue = new THREE.PointLight(0x2563eb, 5, 45);
      pLightBlue.position.set(8, 8, 8);
      s.scene.add(pLightBlue);

      // Central Geo-Sphere (Hub)
      const hubGeo = new THREE.SphereGeometry(1.8, 24, 24);
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        wireframe: true,
        transparent: true,
        opacity: 0.6
      });
      s.hub = new THREE.Mesh(hubGeo, hubMat);
      s.hub.position.set(5, 0, -2);
      group.add(s.hub);

      // Logistics Routing Orbit Ellipses
      s.satellites = [];
      const colors = [0x059669, 0x2563eb, 0xd89b1d];
      for (let r = 0; r < 3; r++) {
        const radius = 3.2 + r * 1.4;
        const ringGeo = new THREE.TorusGeometry(radius, 0.03, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({ color: colors[r], transparent: true, opacity: 0.45 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(s.hub.position);
        ring.rotation.x = Math.PI / (2 + r * 0.5);
        ring.rotation.y = (r * Math.PI) / 3;
        group.add(ring);

        // Satellite node on this ring
        const satGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const satMat = new THREE.MeshStandardMaterial({ color: colors[r], emissive: colors[r], emissiveIntensity: 0.6 });
        const sat = new THREE.Mesh(satGeo, satMat);
        group.add(sat);
        s.satellites.push({ mesh: sat, radius: radius, rotX: ring.rotation.x, rotY: ring.rotation.y, speed: 0.8 + r * 0.4, hubPos: s.hub.position });
      }

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.25;
      s.group.rotation.x = mouse.y * 0.2;
      s.hub.rotation.y += 0.005;
      s.hub.rotation.x += 0.003;

      s.satellites.forEach((sat, idx) => {
        const angle = time * sat.speed + idx * 2.0;
        const lx = Math.cos(angle) * sat.radius;
        const ly = Math.sin(angle) * sat.radius;
        const v = new THREE.Vector3(lx, ly, 0);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), sat.rotX);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), sat.rotY);
        sat.mesh.position.copy(sat.hubPos).add(v);
      });
    });
  }

  // =========================================================================
  // 5. SECTION 05: 3D CRYPTOGRAPHIC HEX BLOCK LATTICE (SHA-256 PASSPORT)
  // =========================================================================
  function initSection05_Passport() {
    createScene3D('s05-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightGreen = new THREE.PointLight(0x059669, 5, 45);
      pLightGreen.position.set(0, 10, 8);
      s.scene.add(pLightGreen);

      // Honeycomb Hexagonal Prism Pillars (Blockchain Blocks)
      s.blocks = [];
      const hexRadius = 1.1;
      const hexGeo = new THREE.CylinderGeometry(hexRadius, hexRadius, 0.6, 6);
      
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          if (Math.abs(q + r) > 2) continue;
          const x = hexRadius * Math.sqrt(3) * (q + r / 2) + 4.5;
          const y = hexRadius * 1.5 * r;
          
          const isCore = (q === 0 && r === 0);
          const mat = new THREE.MeshStandardMaterial({
            color: isCore ? 0x059669 : 0x1e293b,
            wireframe: true,
            transparent: true,
            opacity: isCore ? 0.85 : 0.45,
            metalness: 0.9,
            roughness: 0.1
          });
          const block = new THREE.Mesh(hexGeo, mat);
          block.position.set(x, y, -3);
          block.rotation.x = Math.PI / 2;
          group.add(block);
          s.blocks.push({ mesh: block, initZ: -3, freq: 1.5 + Math.random(), phase: Math.random() * Math.PI * 2 });
        }
      }

      // 3D Laser Chain Lines
      const lineCount = 30;
      const lineGeo = new THREE.BufferGeometry();
      const linePos = new Float32Array(lineCount * 6);
      for (let l = 0; l < lineCount * 6; l += 6) {
        linePos[l] = 2 + Math.random() * 5;
        linePos[l+1] = (Math.random() - 0.5) * 4;
        linePos[l+2] = -2;
        linePos[l+3] = linePos[l] + (Math.random() - 0.5) * 2;
        linePos[l+4] = linePos[l+1] + (Math.random() - 0.5) * 2;
        linePos[l+5] = -2;
      }
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.5 });
      s.lines = new THREE.LineSegments(lineGeo, lineMat);
      group.add(s.lines);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.25;
      s.group.rotation.x = mouse.y * 0.2;

      s.blocks.forEach(b => {
        b.mesh.position.z = b.initZ + Math.sin(time * b.freq + b.phase) * 0.4;
      });
      if (s.lines) s.lines.rotation.z += 0.002;
    });
  }

  // =========================================================================
  // 6. SECTION 06: 3D QUANTUM ATOMIC CRYSTAL (CRITICAL MINERALS MATRIX)
  // =========================================================================
  function initSection06_Minerals() {
    createScene3D('s06-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightGold = new THREE.PointLight(0xd89b1d, 6, 50);
      pLightGold.position.set(6, 6, 8);
      s.scene.add(pLightGold);

      const pLightEmerald = new THREE.PointLight(0x059669, 4, 40);
      pLightEmerald.position.set(-4, -6, 6);
      s.scene.add(pLightEmerald);

      // Gold / Copper Atomic Nucleus
      const nucleusGeo = new THREE.DodecahedronGeometry(1.4, 1);
      const nucleusMat = new THREE.MeshStandardMaterial({
        color: 0xd89b1d,
        metalness: 0.95,
        roughness: 0.05,
        wireframe: false
      });
      s.nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      s.nucleus.position.set(4.5, 0, -2);
      group.add(s.nucleus);

      // Orbiting Quantum Electron Shells
      s.orbits = [];
      const ringConfigs = [
        { radius: 2.8, color: 0xd89b1d, rx: 1.1, ry: 0.4, speed: 1.2 },
        { radius: 3.8, color: 0x059669, rx: 0.5, ry: 1.3, speed: 0.9 },
        { radius: 4.8, color: 0x2563eb, rx: 1.8, ry: 1.1, speed: 0.7 }
      ];

      ringConfigs.forEach(cfg => {
        const ringGeo = new THREE.TorusGeometry(cfg.radius, 0.035, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(s.nucleus.position);
        ring.rotation.x = cfg.rx;
        ring.rotation.y = cfg.ry;
        group.add(ring);

        // Electron Sphere
        const electronGeo = new THREE.SphereGeometry(0.18, 12, 12);
        const electronMat = new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.8 });
        const electron = new THREE.Mesh(electronGeo, electronMat);
        group.add(electron);

        s.orbits.push({
          ring,
          electron,
          radius: cfg.radius,
          rx: cfg.rx,
          ry: cfg.ry,
          speed: cfg.speed,
          center: s.nucleus.position
        });
      });

      // Floating Crystal Mineral Matrix Elements
      const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
      const crystalMat = new THREE.MeshStandardMaterial({ color: 0xd89b1d, metalness: 0.9, roughness: 0.1 });
      s.crystals = [];
      for (let c = 0; c < 15; c++) {
        const cr = new THREE.Mesh(crystalGeo, crystalMat);
        cr.position.set(
          4.5 + (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 5,
          -2 + (Math.random() - 0.5) * 5
        );
        group.add(cr);
        s.crystals.push({ mesh: cr, rotSpeed: 0.02 + Math.random() * 0.03, yFreq: 1 + Math.random(), phase: Math.random() * Math.PI * 2 });
      }

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.25;
      s.group.rotation.x = mouse.y * 0.2;
      s.nucleus.rotation.x += 0.01;
      s.nucleus.rotation.y += 0.015;

      s.orbits.forEach((orb, i) => {
        const angle = time * orb.speed;
        const lx = Math.cos(angle) * orb.radius;
        const ly = Math.sin(angle) * orb.radius;
        const v = new THREE.Vector3(lx, ly, 0);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), orb.rx);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), orb.ry);
        orb.electron.position.copy(orb.center).add(v);
      });

      s.crystals.forEach(cr => {
        cr.mesh.rotation.x += cr.rotSpeed;
        cr.mesh.rotation.y += cr.rotSpeed;
        cr.mesh.position.y += Math.sin(time * cr.yFreq + cr.phase) * 0.004;
      });
    });
  }

  // Initialize all sections on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initHero3D();
    initSection01_AI();
    initSection03_Pricing();
    initSection04_Recycler();
    initSection05_Passport();
    initSection06_Minerals();
  });

})();
