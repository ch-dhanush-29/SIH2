/**
 * Multi-Section 3D Real-Time WebGL Rendering Engine (Three.js)
 * E-Waste Saathi — Refined, Subtle Industrial Visual Layer
 *
 * Performance Standards:
 * 1. Disabled on mobile (screen width <= 768px) to conserve battery/memory.
 * 2. Respects user's `prefers-reduced-motion` settings.
 * 3. IntersectionObserver halts requestAnimationFrame completely when canvas is off-screen.
 * 4. Refined subtle materials and lower polygon counts.
 */

(function() {
  'use strict';

  // Check mobile & motion preferences
  const isMobile = window.innerWidth <= 768;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isMobile || prefersReducedMotion || typeof THREE === 'undefined') {
    // Graceful fallback: non-blocking silent return
    return;
  }

  // Global mouse parallax lerp
  const globalMouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', (e) => {
    globalMouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    globalMouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Base Helper for scene lifecycle
  function createScene3D(canvasId, initCallback, animateCallback) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || window.innerWidth;
    const height = parent.clientHeight || 450;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power"
      });
    } catch (e) {
      console.warn("WebGL not supported for", canvasId);
      return null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 0, 16);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const state = {
      scene,
      camera,
      renderer,
      canvas,
      isVisible: false,
      animFrameId: null,
      clock: new THREE.Clock()
    };

    // Ambient Lighting
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

    // Dedicated Animation Loop with complete stop when off-screen
    function loop() {
      if (!state.isVisible) {
        state.animFrameId = null;
        return;
      }
      
      const delta = state.clock.getDelta();
      const time = state.clock.getElapsedTime();

      // Smooth mouse lerp
      globalMouse.x += (globalMouse.targetX - globalMouse.x) * 0.05;
      globalMouse.y += (globalMouse.targetY - globalMouse.y) * 0.05;

      animateCallback(state, time, delta, globalMouse);
      renderer.render(scene, camera);
      state.animFrameId = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (!state.animFrameId && state.isVisible) {
        state.animFrameId = requestAnimationFrame(loop);
      }
    }

    // Viewport Intersection Observer
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          state.isVisible = entry.isIntersecting;
          if (state.isVisible) {
            startLoop();
          }
        });
      }, { threshold: 0.05 });
      observer.observe(canvas);
    } else {
      state.isVisible = true;
      startLoop();
    }

    return state;
  }

  // =========================================================================
  // 1. HERO SECTION: Subtle 3D Circuit Plate & Circular Energy Loops
  // =========================================================================
  function initHero3D() {
    createScene3D('hero-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLightGreen = new THREE.PointLight(0x059669, 4, 40);
      pLightGreen.position.set(10, 10, 10);
      s.scene.add(pLightGreen);

      // Subtle Circuit Plate
      const plateGeo = new THREE.BoxGeometry(9, 6, 0.2);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8, roughness: 0.3 });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.set(3.5, 0, -2);
      group.add(plateMesh);

      // Fine Wireframe
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x059669, wireframe: true, transparent: true, opacity: 0.25 });
      const wireMesh = new THREE.Mesh(plateGeo, wireMat);
      wireMesh.position.copy(plateMesh.position);
      group.add(wireMesh);

      // Circular Loop Rings
      const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.6 });
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.03, 12, 64), ringMat1);
      ring1.rotation.x = Math.PI / 2.8;
      group.add(ring1);
      s.ring1 = ring1;

      const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xd89b1d, transparent: true, opacity: 0.5 });
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.025, 12, 64), ringMat2);
      ring2.rotation.y = Math.PI / 3.2;
      group.add(ring2);
      s.ring2 = ring2;

      // Fine Particles
      const pCount = 100;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let p = 0; p < pCount * 3; p += 3) {
        pPos[p] = (Math.random() - 0.5) * 22;
        pPos[p + 1] = (Math.random() - 0.5) * 16;
        pPos[p + 2] = (Math.random() - 0.5) * 12;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({ color: 0x059669, size: 0.12, transparent: true, opacity: 0.5 });
      s.particles = new THREE.Points(pGeo, pMat);
      group.add(s.particles);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = -0.2 + mouse.x * 0.25;
      s.group.rotation.x = 0.1 + mouse.y * 0.18;
      s.ring1.rotation.z += 0.004;
      s.ring2.rotation.x += 0.003;
      s.particles.rotation.y += 0.0008;
    });
  }

  // =========================================================================
  // 2. SECTION 01: Subtle AI Core Geometry
  // =========================================================================
  function initSection01_AI() {
    createScene3D('s01-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const pLight = new THREE.PointLight(0x059669, 3, 30);
      pLight.position.set(6, 6, 8);
      s.scene.add(pLight);

      const icoGeo = new THREE.IcosahedronGeometry(3.0, 1);
      const icoMat = new THREE.MeshBasicMaterial({ color: 0x059669, wireframe: true, transparent: true, opacity: 0.35 });
      s.ico = new THREE.Mesh(icoGeo, icoMat);
      s.ico.position.set(4, 0, -2);
      group.add(s.ico);

      const octGeo = new THREE.OctahedronGeometry(1.6, 0);
      const octMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.6 });
      s.oct = new THREE.Mesh(octGeo, octMat);
      s.oct.position.copy(s.ico.position);
      group.add(s.oct);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.18;
      s.group.rotation.x = mouse.y * 0.14;
      s.ico.rotation.x += 0.005;
      s.ico.rotation.y += 0.007;
      s.oct.rotation.y -= 0.008;
    });
  }

  // =========================================================================
  // 3. SECTION 03: Dynamic Price Surface Undulation
  // =========================================================================
  function initSection03_Pricing() {
    createScene3D('s03-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const planeGeo = new THREE.PlaneGeometry(14, 8, 20, 12);
      const planeMat = new THREE.MeshBasicMaterial({ color: 0xd89b1d, wireframe: true, transparent: true, opacity: 0.3 });
      s.waveMesh = new THREE.Mesh(planeGeo, planeMat);
      s.waveMesh.position.set(3, -0.5, -3);
      s.waveMesh.rotation.x = -Math.PI / 3.2;
      group.add(s.waveMesh);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.15;
      s.group.rotation.x = mouse.y * 0.12;

      const pos = s.waveMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z = Math.sin(u * 0.5 + time * 1.5) * 0.4 + Math.cos(v * 0.6 + time * 1.2) * 0.3;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    });
  }

  // =========================================================================
  // 4. SECTION 04: Geospatial Logistics Orbits
  // =========================================================================
  function initSection04_Recycler() {
    createScene3D('s04-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const hubGeo = new THREE.SphereGeometry(1.4, 16, 16);
      const hubMat = new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true, transparent: true, opacity: 0.4 });
      s.hub = new THREE.Mesh(hubGeo, hubMat);
      s.hub.position.set(4.5, 0, -2);
      group.add(s.hub);

      const ringGeo = new THREE.TorusGeometry(3.2, 0.02, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.4 });
      s.ring = new THREE.Mesh(ringGeo, ringMat);
      s.ring.position.copy(s.hub.position);
      s.ring.rotation.x = Math.PI / 2.5;
      group.add(s.ring);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.15;
      s.group.rotation.x = mouse.y * 0.12;
      s.hub.rotation.y += 0.004;
      s.ring.rotation.z += 0.006;
    });
  }

  // =========================================================================
  // 5. SECTION 05: Cryptographic Block Honeycomb
  // =========================================================================
  function initSection05_Passport() {
    createScene3D('s05-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      s.blocks = [];
      const hexGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 6);
      const hexMat = new THREE.MeshBasicMaterial({ color: 0x059669, wireframe: true, transparent: true, opacity: 0.45 });

      for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
          const x = 0.9 * Math.sqrt(3) * (q + r / 2) + 4.5;
          const y = 0.9 * 1.5 * r;
          const block = new THREE.Mesh(hexGeo, hexMat);
          block.position.set(x, y, -2.5);
          block.rotation.x = Math.PI / 2;
          group.add(block);
          s.blocks.push({ mesh: block, initZ: -2.5, freq: 1.2 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
        }
      }

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.15;
      s.group.rotation.x = mouse.y * 0.12;
      s.blocks.forEach(b => {
        b.mesh.position.z = b.initZ + Math.sin(time * b.freq + b.phase) * 0.25;
      });
    });
  }

  // =========================================================================
  // 6. SECTION 06: Atomic Minerals Matrix
  // =========================================================================
  function initSection06_Minerals() {
    createScene3D('s06-3d-bg-canvas', (s) => {
      const group = new THREE.Group();
      s.scene.add(group);
      s.group = group;

      const nucleusGeo = new THREE.DodecahedronGeometry(1.2, 0);
      const nucleusMat = new THREE.MeshStandardMaterial({ color: 0xd89b1d, metalness: 0.9, roughness: 0.1 });
      s.nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
      s.nucleus.position.set(4.5, 0, -2);
      group.add(s.nucleus);

      const ringGeo = new THREE.TorusGeometry(2.6, 0.02, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.45 });
      s.ring = new THREE.Mesh(ringGeo, ringMat);
      s.ring.position.copy(s.nucleus.position);
      s.ring.rotation.x = 1.1;
      group.add(s.ring);

    }, (s, time, delta, mouse) => {
      s.group.rotation.y = mouse.x * 0.15;
      s.group.rotation.x = mouse.y * 0.12;
      s.nucleus.rotation.x += 0.006;
      s.nucleus.rotation.y += 0.009;
      s.ring.rotation.z += 0.008;
    });
  }

  // Init all scenes
  document.addEventListener('DOMContentLoaded', () => {
    initHero3D();
    initSection01_AI();
    initSection03_Pricing();
    initSection04_Recycler();
    initSection05_Passport();
    initSection06_Minerals();
  });

})();
