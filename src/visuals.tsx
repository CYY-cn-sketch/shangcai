import { useEffect, useRef } from "react";
import * as THREE from "three";
import { studentAvatarOptions, type StudentAvatarId } from "./studentAvatars";

type Role = "student" | "teacher" | "admin";
type ExpertId = string;

const sufeLogoSrc = "/demo-assets/sufe-logo.png";

function SufeSeal() {
  return (
    <div className="seal seal-logo">
      <img src={sufeLogoSrc} alt="上海财经大学校徽" />
    </div>
  );
}

function LoginThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 8.9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const stage = new THREE.Group();
    stage.position.set(0.42, -0.24, 0);
    stage.rotation.set(-0.16, -0.36, 0.1);
    stage.scale.setScalar(1.28);
    scene.add(stage);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const additive = THREE.AdditiveBlending;
    const coreWire = track(
      new THREE.MeshBasicMaterial({ color: 0x56c4ff, transparent: true, opacity: 0.058, wireframe: true, blending: additive, depthWrite: false }),
    );
    const coreFill = track(
      new THREE.MeshBasicMaterial({ color: 0x7bd8ff, transparent: true, opacity: 0.016, blending: additive, depthWrite: false }),
    );
    const coreMist = track(
      new THREE.MeshBasicMaterial({ color: 0xb8ecff, transparent: true, opacity: 0.012, blending: additive, depthWrite: false }),
    );
    const goldWire = track(
      new THREE.MeshBasicMaterial({ color: 0xe2bd57, transparent: true, opacity: 0.074, wireframe: true, blending: additive, depthWrite: false }),
    );
    const ringBlue = track(new THREE.MeshBasicMaterial({ color: 0x76cfff, transparent: true, opacity: 0.056, blending: additive, depthWrite: false }));
    const ringGold = track(new THREE.MeshBasicMaterial({ color: 0xe1bd58, transparent: true, opacity: 0.052, blending: additive, depthWrite: false }));
    const ribbonBlue = track(new THREE.MeshBasicMaterial({ color: 0xa6e6ff, transparent: true, opacity: 0.04, blending: additive, depthWrite: false }));
    const ribbonGold = track(new THREE.MeshBasicMaterial({ color: 0xf2d071, transparent: true, opacity: 0.035, blending: additive, depthWrite: false }));
    const nodeBlue = track(new THREE.MeshBasicMaterial({ color: 0x78d6ff, transparent: true, opacity: 0.36, blending: additive, depthWrite: false }));
    const nodeGold = track(new THREE.MeshBasicMaterial({ color: 0xf0c65c, transparent: true, opacity: 0.38, blending: additive, depthWrite: false }));
    const linkMaterial = track(new THREE.LineBasicMaterial({ color: 0x95d8ff, transparent: true, opacity: 0.11, blending: additive, depthWrite: false }));
    const scanBlue = track(
      new THREE.MeshBasicMaterial({ color: 0x8bd8ff, transparent: true, opacity: 0.046, wireframe: true, blending: additive, depthWrite: false }),
    );
    const scanGold = track(
      new THREE.MeshBasicMaterial({ color: 0xf0c65c, transparent: true, opacity: 0.038, wireframe: true, blending: additive, depthWrite: false }),
    );

    const makeGlowTexture = (inner: string, mid: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const context = canvas.getContext("2d");
      if (context) {
        const gradient = context.createRadialGradient(80, 80, 0, 80, 80, 80);
        gradient.addColorStop(0, inner);
        gradient.addColorStop(0.36, mid);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      const texture = track(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const makeBeamTexture = (inner: string, outer: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const context = canvas.getContext("2d");
      if (context) {
        const horizontal = context.createLinearGradient(0, 0, canvas.width, 0);
        horizontal.addColorStop(0, "rgba(255,255,255,0)");
        horizontal.addColorStop(0.42, outer);
        horizontal.addColorStop(0.5, inner);
        horizontal.addColorStop(0.58, outer);
        horizontal.addColorStop(1, "rgba(255,255,255,0)");
        const vertical = context.createLinearGradient(0, 0, 0, canvas.height);
        vertical.addColorStop(0, "rgba(255,255,255,0)");
        vertical.addColorStop(0.5, "rgba(255,255,255,1)");
        vertical.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = horizontal;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "destination-in";
        context.fillStyle = vertical;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      const texture = track(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const blueGlow = track(new THREE.SpriteMaterial({ map: makeGlowTexture("rgba(92,190,255,0.42)", "rgba(44,132,205,0.10)"), transparent: true, opacity: 0.2, blending: additive, depthWrite: false }));
    const nodeBlueGlow = track(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(110,200,255,0.62)", "rgba(63,156,219,0.2)"),
        transparent: true,
        opacity: 0.45,
        blending: additive,
        depthWrite: false,
      }),
    );
    const nodeGoldGlow = track(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(246,204,105,0.62)", "rgba(213,173,71,0.18)"),
        transparent: true,
        opacity: 0.4,
        blending: additive,
        depthWrite: false,
      }),
    );
    const blueBeam = track(
      new THREE.SpriteMaterial({
        map: makeBeamTexture("rgba(106,203,255,0.30)", "rgba(55,133,205,0.08)"),
        transparent: true,
        opacity: 0.09,
        blending: additive,
        depthWrite: false,
      }),
    );
    const goldBeam = track(
      new THREE.SpriteMaterial({
        map: makeBeamTexture("rgba(244,198,88,0.28)", "rgba(213,173,71,0.07)"),
        transparent: true,
        opacity: 0.075,
        blending: additive,
        depthWrite: false,
      }),
    );

    const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.72, 64, 36)), coreWire);
    const coreHalo = new THREE.Mesh(track(new THREE.SphereGeometry(1.14, 72, 40)), coreFill);
    const coreAtmosphere = new THREE.Mesh(track(new THREE.SphereGeometry(1.34, 72, 40)), coreMist);
    const coreShard = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.48, 3)), goldWire);
    stage.add(coreAtmosphere, coreHalo, core, coreShard);

    const mainGlow = new THREE.Sprite(blueGlow);
    mainGlow.scale.set(4.8, 4.8, 1);
    stage.add(mainGlow);

    const beamSprites = [
      { sprite: new THREE.Sprite(blueBeam), y: 0.12, z: -0.72, scale: [4.8, 0.34, 1] as const },
      { sprite: new THREE.Sprite(goldBeam), y: -0.3, z: -0.54, scale: [4.4, 0.26, 1] as const },
      { sprite: new THREE.Sprite(track(blueBeam.clone())), y: 0.68, z: -0.88, scale: [4.2, 0.18, 1] as const },
    ];
    beamSprites.forEach(({ sprite, y, z, scale }, index) => {
      sprite.position.set(0.06 + index * 0.12, y, z);
      sprite.scale.set(scale[0], scale[1], scale[2]);
      sprite.rotation.z = index === 1 ? -0.14 : 0.08;
      stage.add(sprite);
    });

    const makeOrbitCurve = (rx: number, ry: number, twist: number, phase: number) => {
      const points: THREE.Vector3[] = [];
      for (let index = 0; index <= 96; index += 1) {
        const angle = (index / 96) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle + phase) * rx, Math.sin(angle + phase) * ry, Math.sin(angle * 2 + phase) * twist));
      }
      return new THREE.CatmullRomCurve3(points, true);
    };

    const orbitSettings = [
      { rx: 2.55, ry: 0.9, twist: 0.32, phase: 0.2, material: ringBlue, radius: 0.0072 },
      { rx: 2.34, ry: 1.26, twist: 0.42, phase: 1.1, material: ringGold, radius: 0.0066 },
      { rx: 2.96, ry: 1.1, twist: 0.5, phase: 2.2, material: ringBlue, radius: 0.0058 },
      { rx: 2.02, ry: 1.56, twist: 0.36, phase: 2.9, material: ringBlue, radius: 0.005 },
    ];
    const orbitMeshes = orbitSettings.map((setting) => {
      const geometry = track(new THREE.TubeGeometry(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), 220, setting.radius, 10, true));
      const mesh = new THREE.Mesh(geometry, setting.material);
      mesh.rotation.set(setting.phase * 0.32, setting.phase * 0.18, setting.phase * 0.22);
      stage.add(mesh);
      return mesh;
    });

    const softRibbonSettings = [
      { rx: 3.38, ry: 1.12, twist: 0.62, phase: 0.74, material: ribbonBlue, radius: 0.0032 },
      { rx: 3.08, ry: 1.54, twist: 0.48, phase: 1.92, material: ribbonGold, radius: 0.0028 },
      { rx: 3.62, ry: 1.36, twist: 0.7, phase: 2.68, material: ribbonBlue, radius: 0.0026 },
    ];
    const ribbonMeshes = softRibbonSettings.map((setting) => {
      const geometry = track(new THREE.TubeGeometry(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), 260, setting.radius, 8, true));
      const mesh = new THREE.Mesh(geometry, setting.material);
      mesh.rotation.set(setting.phase * 0.24, setting.phase * 0.14, setting.phase * 0.2);
      stage.add(mesh);
      return mesh;
    });

    const scanRings = [
      new THREE.Mesh(track(new THREE.TorusGeometry(1.58, 0.0034, 8, 200)), scanBlue),
      new THREE.Mesh(track(new THREE.TorusGeometry(2.18, 0.003, 8, 200)), scanGold),
      new THREE.Mesh(track(new THREE.TorusGeometry(2.82, 0.0028, 8, 200)), scanBlue),
    ];
    scanRings.forEach((ring, index) => {
      ring.rotation.set(Math.PI / 2 + index * 0.16, index * 0.22, index * 0.28);
      ring.scale.set(1, 0.56, 1);
      stage.add(ring);
    });

    const nodeGeometry = track(new THREE.SphereGeometry(0.038, 28, 18));
    const nodePositions: THREE.Vector3[] = [];
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeGlowSprites: THREE.Sprite[] = [];
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const position = new THREE.Vector3(Math.cos(angle) * 2.58, Math.sin(angle) * 0.98, Math.sin(angle * 2) * 0.46);
      nodePositions.push(position);
      const isGoldNode = index % 3 === 0;
      const node = new THREE.Mesh(nodeGeometry, isGoldNode ? nodeGold : nodeBlue);
      node.position.copy(position);
      node.rotation.set(index * 0.22, index * 0.17, index * 0.13);
      stage.add(node);
      nodeMeshes.push(node);
      const glow = new THREE.Sprite(isGoldNode ? nodeGoldGlow : nodeBlueGlow);
      glow.position.copy(position);
      glow.scale.set(isGoldNode ? 0.38 : 0.32, isGoldNode ? 0.38 : 0.32, 1);
      stage.add(glow);
      nodeGlowSprites.push(glow);
    }

    const linkPositions: number[] = [];
    nodePositions.forEach((position, index) => {
      const next = nodePositions[(index + 1) % nodePositions.length];
      linkPositions.push(position.x, position.y, position.z, next.x, next.y, next.z);
      if (index % 2 === 0) {
        linkPositions.push(position.x, position.y, position.z, 0, 0, 0);
      }
    });
    const linkGeometry = track(new THREE.BufferGeometry());
    linkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linkPositions, 3));
    stage.add(new THREE.LineSegments(linkGeometry, linkMaterial));

    const seed = (value: number) => {
      const result = Math.sin(value * 12.9898) * 43758.5453;
      return result - Math.floor(result);
    };
    const particleCount = 780;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const blue = new THREE.Color(0x6cc6ff);
    const pale = new THREE.Color(0xb7e4ff);
    const gold = new THREE.Color(0xf1c65d);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = seed(index + 1) * Math.PI * 2;
      const radius = 0.45 + seed(index + 14) * 2.35;
      particlePositions[index * 3] = Math.cos(angle) * radius + (seed(index + 9) - 0.5) * 0.42;
      particlePositions[index * 3 + 1] = Math.sin(angle) * radius * (0.34 + seed(index + 22) * 0.42);
      particlePositions[index * 3 + 2] = (seed(index + 31) - 0.5) * 1.6;
      const color = seed(index + 41) > 0.82 ? gold : seed(index + 51) > 0.5 ? blue : pale;
      particleColors[index * 3] = color.r;
      particleColors[index * 3 + 1] = color.g;
      particleColors[index * 3 + 2] = color.b;
    }
    const particleBase = particlePositions.slice();
    const particleGeometry = track(new THREE.BufferGeometry());
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
    const particleMaterial = track(
      new THREE.PointsMaterial({ size: 0.031, vertexColors: true, transparent: true, opacity: 0.46, blending: additive, depthWrite: false, sizeAttenuation: true }),
    );
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    stage.add(particles);

    const screenParticleCount = 1600;
    const screenParticlePositions = new Float32Array(screenParticleCount * 3);
    const screenParticleColors = new Float32Array(screenParticleCount * 3);
    for (let index = 0; index < screenParticleCount; index += 1) {
      screenParticlePositions[index * 3] = (seed(index + 101) - 0.5) * 10.8;
      screenParticlePositions[index * 3 + 1] = (seed(index + 202) - 0.5) * 6.9;
      screenParticlePositions[index * 3 + 2] = -1.7 + seed(index + 303) * 2.1;
      const color = seed(index + 404) > 0.84 ? gold : seed(index + 505) > 0.52 ? blue : pale;
      screenParticleColors[index * 3] = color.r;
      screenParticleColors[index * 3 + 1] = color.g;
      screenParticleColors[index * 3 + 2] = color.b;
    }
    const screenParticleBase = screenParticlePositions.slice();
    const screenParticleGeometry = track(new THREE.BufferGeometry());
    screenParticleGeometry.setAttribute("position", new THREE.BufferAttribute(screenParticlePositions, 3));
    screenParticleGeometry.setAttribute("color", new THREE.BufferAttribute(screenParticleColors, 3));
    const screenParticleMaterial = track(
      new THREE.PointsMaterial({ size: 0.019, vertexColors: true, transparent: true, opacity: 0.42, blending: additive, depthWrite: false, sizeAttenuation: true }),
    );
    const screenParticles = new THREE.Points(screenParticleGeometry, screenParticleMaterial);
    scene.add(screenParticles);

    const atmosphereMaterial = track(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(93,185,234,0.22)", "rgba(33,102,164,0.08)"),
        transparent: true,
        opacity: 0.42,
        blending: additive,
        depthWrite: false,
      }),
    );
    const atmosphere = new THREE.Sprite(atmosphereMaterial);
    atmosphere.position.set(2.05, -0.22, -2.4);
    atmosphere.scale.set(9.8, 6.9, 1);
    scene.add(atmosphere);

    const cometMaterial = track(new THREE.MeshBasicMaterial({ color: 0xd9b34f, transparent: true, opacity: 0.38, blending: additive, depthWrite: false }));
    const cometGeometry = track(new THREE.SphereGeometry(0.028, 12, 12));
    const comets = orbitSettings.slice(0, 3).map((setting, index) => {
      const comet = new THREE.Mesh(cometGeometry, cometMaterial);
      comet.position.copy(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase).getPoint(index / 3));
      stage.add(comet);
      return { comet, curve: makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), speed: 0.052 + index * 0.014 };
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (width < 720) {
        stage.position.set(0.12, 0.08, 0);
        stage.scale.setScalar(0.72);
      } else if (width < 1060) {
        stage.position.set(0.18, -0.18, 0);
        stage.scale.setScalar(0.86);
      } else {
        stage.position.set(0.34, -0.22, 0);
        stage.scale.setScalar(1.64);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let tick = 0;
    const animate = () => {
      tick += 0.01;
      stage.rotation.y = -0.36 + Math.sin(tick * 0.28) * 0.055;
      stage.rotation.x = -0.16 + Math.cos(tick * 0.22) * 0.028;
      core.rotation.x += 0.0026;
      core.rotation.y += 0.0036;
      coreHalo.rotation.y -= 0.0014;
      coreAtmosphere.rotation.y += 0.0009;
      coreAtmosphere.rotation.x -= 0.0006;
      coreShard.rotation.x -= 0.0032;
      orbitMeshes.forEach((mesh, index) => {
        mesh.rotation.z += 0.0012 + index * 0.00036;
        mesh.rotation.y += 0.00038 + index * 0.00016;
      });
      ribbonMeshes.forEach((mesh, index) => {
        mesh.rotation.z -= 0.00062 + index * 0.00022;
        mesh.rotation.y += 0.00028 + index * 0.0001;
      });
      scanRings.forEach((ring, index) => {
        const pulse = 1 + Math.sin(tick * (0.8 + index * 0.12) + index) * 0.08;
        ring.scale.set(pulse, 0.56 * pulse, pulse);
        ring.rotation.z -= 0.002 + index * 0.0008;
      });
      beamSprites.forEach(({ sprite, y }, index) => {
        sprite.position.y = y + Math.sin(tick * (0.36 + index * 0.05) + index) * 0.045;
        sprite.material.opacity = (index === 1 ? 0.054 : 0.074) + Math.sin(tick * 0.58 + index) * 0.009;
      });
      nodeMeshes.forEach((node, index) => {
        const pulse = 1 + Math.sin(tick * 1.6 + index) * 0.12;
        node.scale.setScalar(pulse);
        node.rotation.x += 0.003 + index * 0.0002;
        node.rotation.y += 0.004;
      });
      nodeGlowSprites.forEach((glow, index) => {
        const pulse = 1 + Math.sin(tick * 1.3 + index * 0.7) * 0.16;
        const base = index % 3 === 0 ? 0.38 : 0.32;
        glow.scale.set(base * pulse, base * pulse, 1);
        glow.material.opacity = (index % 3 === 0 ? 0.28 : 0.31) + Math.sin(tick * 1.1 + index) * 0.04;
      });
      const positionAttribute = particleGeometry.attributes.position as THREE.BufferAttribute;
      for (let index = 0; index < particleCount; index += 1) {
        const baseIndex = index * 3;
        const baseX = particleBase[baseIndex];
        const baseY = particleBase[baseIndex + 1];
        const baseZ = particleBase[baseIndex + 2];
        positionAttribute.setXYZ(
          index,
          baseX + Math.cos(tick * 0.65 + baseY * 2.2) * 0.018,
          baseY + Math.sin(tick * 0.72 + baseX * 1.8) * 0.028,
          baseZ + Math.cos(tick * 0.45 + baseX) * 0.018,
        );
      }
      positionAttribute.needsUpdate = true;
      particles.rotation.z = Math.sin(tick * 0.22) * 0.04;
      const screenPositionAttribute = screenParticleGeometry.attributes.position as THREE.BufferAttribute;
      for (let index = 0; index < screenParticleCount; index += 1) {
        const baseIndex = index * 3;
        const baseX = screenParticleBase[baseIndex];
        const baseY = screenParticleBase[baseIndex + 1];
        const baseZ = screenParticleBase[baseIndex + 2];
        screenPositionAttribute.setXYZ(
          index,
          baseX + Math.sin(tick * 0.12 + baseY) * 0.02,
          baseY + Math.cos(tick * 0.1 + baseX) * 0.018,
          baseZ,
        );
      }
      screenPositionAttribute.needsUpdate = true;
      screenParticles.rotation.z = Math.sin(tick * 0.08) * 0.012;
      mainGlow.material.opacity = 0.086 + Math.sin(tick * 0.95) * 0.014;
      comets.forEach((item, index) => {
        item.comet.position.copy(item.curve.getPoint((tick * item.speed + index * 0.24) % 1));
      });
      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      renderer.setAnimationLoop(animate);
    }

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="login-three-scene" ref={mountRef} aria-hidden="true" />;
}

function AppThreeBackdrop(props: { role: Role }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const roleConfig = {
      student: { primary: 0x4f9dff, accent: 0xd6ad43, soft: 0xb7e4ff, count: 170 },
      teacher: { primary: 0x19a89d, accent: 0x4f9dff, soft: 0xa9f4e8, count: 154 },
      admin: { primary: 0xd6ad43, accent: 0x4f9dff, soft: 0xffe3a3, count: 190 },
    }[props.role];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };
    const additive = THREE.AdditiveBlending;
    const primaryColor = new THREE.Color(roleConfig.primary);
    const accentColor = new THREE.Color(roleConfig.accent);
    const softColor = new THREE.Color(roleConfig.soft);
    const seed = (value: number) => {
      const result = Math.sin(value * 12.9898) * 43758.5453;
      return result - Math.floor(result);
    };

    const makeGlowTexture = (inner: string, outer: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 180;
      const context = canvas.getContext("2d");
      if (context) {
        const gradient = context.createRadialGradient(90, 90, 0, 90, 90, 90);
        gradient.addColorStop(0, inner);
        gradient.addColorStop(0.38, outer);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      const texture = track(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const roleGlow = track(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(100,190,255,0.28)", "rgba(54,126,190,0.09)"),
        transparent: true,
        opacity: props.role === "admin" ? 0.36 : 0.42,
        blending: additive,
        depthWrite: false,
      }),
    );
    const accentGlow = track(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(246,204,105,0.24)", "rgba(213,173,71,0.08)"),
        transparent: true,
        opacity: props.role === "teacher" ? 0.24 : 0.32,
        blending: additive,
        depthWrite: false,
      }),
    );

    const group = new THREE.Group();
    group.position.set(0.2, 0, -1.2);
    scene.add(group);

    const glowSprites = [
      { material: roleGlow, x: -4.4, y: 2.45, z: -2.2, scaleX: 6.0, scaleY: 3.2 },
      { material: accentGlow, x: 4.6, y: -2.2, z: -2.4, scaleX: 5.8, scaleY: 3.1 },
      { material: roleGlow, x: 1.6, y: 0.25, z: -2.8, scaleX: 8.4, scaleY: 4.2 },
    ].map((item) => {
      const sprite = new THREE.Sprite(item.material);
      sprite.position.set(item.x, item.y, item.z);
      sprite.scale.set(item.scaleX, item.scaleY, 1);
      scene.add(sprite);
      return sprite;
    });

    const starCount = roleConfig.count * 6;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (seed(i + 11) - 0.5) * 14.5;
      starPositions[i * 3 + 1] = (seed(i + 23) - 0.5) * 8.6;
      starPositions[i * 3 + 2] = -2.8 + seed(i + 37) * 1.8;
      const color = seed(i + 41) > 0.82 ? accentColor : seed(i + 53) > 0.46 ? primaryColor : softColor;
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }
    const starBase = starPositions.slice();
    const starGeometry = track(new THREE.BufferGeometry());
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMaterial = track(
      new THREE.PointsMaterial({
        size: 0.024,
        vertexColors: true,
        transparent: true,
        opacity: 0.36,
        blending: additive,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const pointPositions = new Float32Array(roleConfig.count * 3);
    const pointColors = new Float32Array(roleConfig.count * 3);
    for (let i = 0; i < roleConfig.count; i += 1) {
      const angle = seed(i + 3) * Math.PI * 2;
      const radius = 1.5 + seed(i + 7) * 4.8;
      pointPositions[i * 3] = Math.cos(angle) * radius + (seed(i + 13) - 0.5) * 1.8;
      pointPositions[i * 3 + 1] = Math.sin(angle) * radius * 0.48 + (seed(i + 17) - 0.5) * 1.2;
      pointPositions[i * 3 + 2] = -1.8 + Math.sin(i * 0.61) * 1.1;
      const color = i % 5 === 0 ? accentColor : i % 3 === 0 ? softColor : primaryColor;
      pointColors[i * 3] = color.r;
      pointColors[i * 3 + 1] = color.g;
      pointColors[i * 3 + 2] = color.b;
    }

    const pointGeometry = track(new THREE.BufferGeometry());
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));
    const pointMaterial = track(
      new THREE.PointsMaterial({
        size: 0.038,
        vertexColors: true,
        transparent: true,
        opacity: 0.44,
        blending: additive,
        depthWrite: false,
      }),
    );
    const points = new THREE.Points(pointGeometry, pointMaterial);
    group.add(points);

    const linePositions: number[] = [];
    for (let i = 0; i < roleConfig.count - 12; i += 4) {
      const next = i + 7 + (i % 5);
      linePositions.push(
        pointPositions[i * 3],
        pointPositions[i * 3 + 1],
        pointPositions[i * 3 + 2],
        pointPositions[next * 3],
        pointPositions[next * 3 + 1],
        pointPositions[next * 3 + 2],
      );
    }
    const lineGeometry = track(new THREE.BufferGeometry());
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMaterial = track(new THREE.LineBasicMaterial({ color: roleConfig.primary, transparent: true, opacity: 0.11, blending: additive }));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    const ribbonPrimary = track(new THREE.MeshBasicMaterial({ color: roleConfig.primary, transparent: true, opacity: 0.09, blending: additive, depthWrite: false }));
    const ribbonAccent = track(new THREE.MeshBasicMaterial({ color: roleConfig.accent, transparent: true, opacity: 0.075, blending: additive, depthWrite: false }));
    const makeFlowCurve = (offsetY: number, phase: number) =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.2, -2.7 + offsetY, -1.5),
        new THREE.Vector3(-4.2, -1.0 + offsetY + Math.sin(phase) * 0.2, -1.05),
        new THREE.Vector3(-0.8, -1.45 + offsetY, -0.72),
        new THREE.Vector3(2.8, -0.38 + offsetY + Math.cos(phase) * 0.22, -1.2),
        new THREE.Vector3(7.1, 1.1 + offsetY, -1.6),
      ]);
    const ribbons = [
      { curve: makeFlowCurve(0.15, 0.2), material: ribbonPrimary, radius: 0.018 },
      { curve: makeFlowCurve(1.1, 1.1), material: ribbonAccent, radius: 0.014 },
      { curve: makeFlowCurve(-1.25, 2.4), material: ribbonPrimary, radius: 0.012 },
    ].map((item) => {
      const mesh = new THREE.Mesh(track(new THREE.TubeGeometry(item.curve, 120, item.radius, 8, false)), item.material);
      group.add(mesh);
      return mesh;
    });

    const ringMaterial = track(new THREE.MeshBasicMaterial({ color: roleConfig.accent, transparent: true, opacity: 0.13, wireframe: true, blending: additive }));
    const ringGeometry = track(new THREE.TorusGeometry(1.9, 0.007, 8, 118));
    const rings = [
      { x: -4.9, y: 2.55, z: -0.6, scale: 1.18 },
      { x: 4.65, y: -2.5, z: -0.85, scale: 1.7 },
      { x: 2.15, y: 2.0, z: -1.2, scale: 1.02 },
      { x: -1.4, y: -2.95, z: -1.4, scale: 1.28 },
    ].map((item, index) => {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(item.x, item.y, item.z);
      ring.scale.setScalar(item.scale);
      ring.rotation.set(index * 0.5, Math.PI / 2 + index * 0.2, index * 0.6);
      group.add(ring);
      return ring;
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let tick = 0;
    const animate = () => {
      tick += 0.006;
      group.rotation.y = Math.sin(tick) * 0.1;
      group.rotation.x = Math.cos(tick * 0.8) * 0.035;
      points.rotation.z = Math.sin(tick * 0.7) * 0.018;
      lines.rotation.z = points.rotation.z;
      const starAttribute = starGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < starCount; i += 1) {
        const baseIndex = i * 3;
        const baseX = starBase[baseIndex];
        const baseY = starBase[baseIndex + 1];
        const baseZ = starBase[baseIndex + 2];
        starAttribute.setXYZ(
          i,
          baseX + Math.sin(tick * 0.55 + baseY * 0.4) * 0.018,
          baseY + Math.cos(tick * 0.48 + baseX * 0.3) * 0.018,
          baseZ,
        );
      }
      starAttribute.needsUpdate = true;
      stars.rotation.z = Math.sin(tick * 0.28) * 0.015;
      glowSprites.forEach((sprite, index) => {
        sprite.position.y += Math.sin(tick * 0.4 + index) * 0.0008;
        sprite.material.opacity = (index === 1 ? 0.28 : 0.38) + Math.sin(tick * 0.7 + index) * 0.04;
      });
      ribbons.forEach((ribbon, index) => {
        ribbon.position.y = Math.sin(tick * (0.7 + index * 0.1) + index) * 0.06;
        ribbon.rotation.z = Math.cos(tick * 0.55 + index) * 0.015;
      });
      rings.forEach((ring, index) => {
        ring.rotation.z += 0.0015 + index * 0.0007;
        ring.rotation.x += 0.0009;
      });
      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      renderer.setAnimationLoop(animate);
    }

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      disposables.forEach((item) => item.dispose());
      mount.removeChild(renderer.domElement);
    };
  }, [props.role]);

  return <div className={`app-three-backdrop app-three-backdrop-${props.role}`} ref={mountRef} aria-hidden="true" />;
}

type CartoonExpertConfig = {
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  accent: string;
  shape: "classic" | "bob" | "curly" | "side" | "cap" | "wave";
  accessory: "idea" | "target" | "chart" | "case" | "deck" | "paper" | "mic" | "play";
  glasses?: boolean;
};
const cartoonExpertConfig: Record<ExpertId, CartoonExpertConfig> = {
  brainstorm: { bg: "#bff5de", skin: "#ffd8bd", hair: "#ff7a59", shirt: "#08946f", accent: "#ffd84d", shape: "curly", accessory: "idea" },
  positioning: { bg: "#bfd7ff", skin: "#f5cba9", hair: "#293a7a", shirt: "#2563eb", accent: "#7c3aed", shape: "side", accessory: "target", glasses: true },
  market: { bg: "#ffe19a", skin: "#efc29b", hair: "#73411f", shirt: "#c47a00", accent: "#16a34a", shape: "classic", accessory: "chart" },
  business: { bg: "#cbd5e1", skin: "#f0c7a6", hair: "#111827", shirt: "#263b6d", accent: "#f59e0b", shape: "cap", accessory: "case", glasses: true },
  pitch: { bg: "#b7e2ff", skin: "#ffd2b8", hair: "#114f8f", shirt: "#0284c7", accent: "#ef4444", shape: "wave", accessory: "deck" },
  script: { bg: "#ffd1a8", skin: "#f3c4a0", hair: "#6b2f1a", shirt: "#9a4d00", accent: "#f97316", shape: "bob", accessory: "paper" },
  defense: { bg: "#d8c3ff", skin: "#f2c7a2", hair: "#3b0764", shirt: "#6d28d9", accent: "#facc15", shape: "side", accessory: "mic", glasses: true },
  media: { bg: "#a7f3f0", skin: "#f7cbaa", hair: "#0f4c5c", shirt: "#0e7490", accent: "#ec4899", shape: "cap", accessory: "play" },
};

const customCartoonExpertConfigs: CartoonExpertConfig[] = [
  { bg: "#d9f99d", skin: "#f4c7a1", hair: "#365314", shirt: "#3f6212", accent: "#0f766e", shape: "classic", accessory: "idea" },
  { bg: "#bfdbfe", skin: "#f6c6a8", hair: "#1e3a8a", shirt: "#1d4ed8", accent: "#f59e0b", shape: "wave", accessory: "target", glasses: true },
  { bg: "#fecdd3", skin: "#f2c2a0", hair: "#7f1d1d", shirt: "#be123c", accent: "#2563eb", shape: "bob", accessory: "chart" },
  { bg: "#ddd6fe", skin: "#f3c4a0", hair: "#312e81", shirt: "#6d28d9", accent: "#facc15", shape: "side", accessory: "paper" },
  { bg: "#bae6fd", skin: "#f5c7a5", hair: "#164e63", shirt: "#0e7490", accent: "#ec4899", shape: "cap", accessory: "deck", glasses: true },
  { bg: "#fed7aa", skin: "#eec09a", hair: "#7c2d12", shirt: "#c2410c", accent: "#16a34a", shape: "curly", accessory: "case" },
];

function stableIndex(input: string, modulo: number) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return modulo ? hash % modulo : 0;
}

function getCartoonExpertConfig(variant: ExpertId) {
  return cartoonExpertConfig[variant] || customCartoonExpertConfigs[stableIndex(variant, customCartoonExpertConfigs.length)];
}

function CartoonExpertAvatar(props: { variant: ExpertId; size?: number }) {
  const config = getCartoonExpertConfig(props.variant);
  const size = props.size || 34;

  function renderAccessory() {
    if (config.accessory === "idea") {
      return (
        <g transform="translate(43 10)">
          <circle cx="6" cy="7" r="5" fill={config.accent} />
          <path d="M3 14h6M4 17h4" stroke={config.shirt} strokeLinecap="round" strokeWidth="2" />
        </g>
      );
    }
    if (config.accessory === "target") {
      return (
        <g transform="translate(43 11)" fill="none" stroke={config.accent} strokeWidth="2">
          <circle cx="7" cy="7" r="7" />
          <circle cx="7" cy="7" r="3" />
          <path d="M7 1v12M1 7h12" />
        </g>
      );
    }
    if (config.accessory === "chart") {
      return (
        <g transform="translate(42 12)" fill="none" stroke={config.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <path d="M2 13h14" />
          <path d="M4 11V6M9 11V3M14 11V8" />
        </g>
      );
    }
    if (config.accessory === "case") {
      return (
        <g transform="translate(43 13)" fill="none" stroke={config.accent} strokeLinejoin="round" strokeWidth="2">
          <rect x="1" y="5" width="14" height="10" rx="2" />
          <path d="M5 5V3h6v2M1 9h14" />
        </g>
      );
    }
    if (config.accessory === "deck") {
      return (
        <g transform="translate(43 12)" fill="none" stroke={config.accent} strokeLinejoin="round" strokeWidth="2">
          <rect x="1" y="3" width="14" height="11" rx="2" />
          <path d="M4 7h8M4 10h5" />
        </g>
      );
    }
    if (config.accessory === "paper") {
      return (
        <g transform="translate(44 12)" fill="#fff" stroke={config.accent} strokeLinejoin="round" strokeWidth="2">
          <path d="M2 1h9l4 4v12H2z" />
          <path d="M11 1v5h5M5 9h7M5 13h6" />
        </g>
      );
    }
    if (config.accessory === "mic") {
      return (
        <g transform="translate(45 11)" fill="none" stroke={config.accent} strokeLinecap="round" strokeWidth="2">
          <rect x="4" y="1" width="8" height="12" rx="4" />
          <path d="M1 8c0 5 14 5 14 0M8 14v4M5 18h6" />
        </g>
      );
    }
    return (
      <g transform="translate(43 12)">
        <rect x="1" y="3" width="16" height="12" rx="3" fill="#fff" stroke={config.accent} strokeWidth="2" />
        <path d="M8 6l5 3-5 3z" fill={config.accent} />
      </g>
    );
  }

  function renderHair() {
    if (config.shape === "curly") {
      return (
        <g fill={config.hair}>
          <circle cx="23" cy="23" r="6" />
          <circle cx="30" cy="18" r="7" />
          <circle cx="38" cy="20" r="7" />
          <circle cx="43" cy="27" r="6" />
          <path d="M21 30c5-6 15-8 26-4-1-10-8-15-17-14-8 1-12 7-9 18z" opacity="0.82" />
        </g>
      );
    }
    if (config.shape === "bob") {
      return <path d="M18 28c0-11 6-18 15-18s15 7 15 18v13c-7 4-21 4-30 0z" fill={config.hair} />;
    }
    if (config.shape === "side") {
      return <path d="M20 27c4-12 13-17 25-11 4 4 5 9 3 15-7-7-16-8-28-4z" fill={config.hair} />;
    }
    if (config.shape === "cap") {
      return (
        <g>
          <path d="M20 27c2-8 8-13 18-13 7 0 11 4 12 12-7-4-18-5-30 1z" fill={config.hair} />
          <path d="M17 24c9-7 24-8 34-1-9 3-24 4-34 1z" fill={config.accent} />
        </g>
      );
    }
    if (config.shape === "wave") {
      return <path d="M18 30c2-13 9-20 20-18 8 1 12 7 10 16-8-8-18 0-30 2z" fill={config.hair} />;
    }
    return (
      <>
        <path d="M20 27c2-10 8-15 17-14 7 .8 10 6 9 14-5-5-14-5-26 0z" fill={config.hair} />
        <path d="M21 28c3-5 8-8 16-8 4 0 7 1 10 4-1-8-7-13-15-13-9 0-15 6-11 17z" fill={config.hair} opacity="0.72" />
      </>
    );
  }

  return (
    <svg aria-hidden="true" className="cartoon-expert-avatar" focusable="false" height={size} viewBox="0 0 64 64" width={size}>
      <circle cx="32" cy="32" fill={config.bg} r="30" />
      <circle cx="32" cy="32" fill="none" r="28" stroke={config.accent} strokeOpacity="0.95" strokeWidth="3" />
      <path d="M15 58c2.4-11 9-17 17-17s14.6 6 17 17" fill={config.shirt} />
      <path d="M18 56c2-5 6-10 14-10s12 5 14 10" fill={config.accent} opacity="0.26" />
      <path d="M24 43l8 7 8-7" fill="#ffffff" opacity="0.78" />
      <circle cx="32" cy="29" fill={config.skin} r="13" />
      {renderHair()}
      {config.glasses ? (
        <g fill="none" stroke="#1f2937" strokeWidth="1.8">
          <circle cx="27" cy="31" r="3.4" />
          <circle cx="37" cy="31" r="3.4" />
          <path d="M30.5 31h3" />
        </g>
      ) : (
        <g fill="#263238">
          <circle cx="27" cy="31" r="1.6" />
          <circle cx="37" cy="31" r="1.6" />
        </g>
      )}
      <path d="M27 36c2.8 3 7.2 3 10 0" fill="none" stroke="#8a4a3b" strokeLinecap="round" strokeWidth="2" />
      <circle cx="23" cy="34" fill="#ee9b8f" opacity="0.55" r="2.2" />
      <circle cx="41" cy="34" fill="#ee9b8f" opacity="0.55" r="2.2" />
      {renderAccessory()}
    </svg>
  );
}

const BrainstormAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="brainstorm" />;
const PositioningAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="positioning" />;
const MarketAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="market" />;
const BusinessAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="business" />;
const PitchAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="pitch" />;
const ScriptAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="script" />;
const DefenseAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="defense" />;
const MediaAvatar = (props: { size?: number }) => <CartoonExpertAvatar {...props} variant="media" />;

function DefenseJudgeAvatar(props: { size?: number }) {
  const size = props.size || 34;
  return (
    <svg className="defense-teacher-avatar" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="AI 评委老师">
      <circle cx="32" cy="32" r="30" fill="#eef7ff" />
      <path d="M6 38c7-9.3 15.7-14 26-14s19 4.7 26 14v18H6V38Z" fill="#dcefff" opacity="0.76" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#c79a2d" strokeOpacity="0.42" strokeWidth="2" />
      <path d="M17 60c1.9-11.2 8.1-17.2 15-17.2s13.1 6 15 17.2H17Z" fill="#0b4a83" />
      <path d="M20.8 60c2.3-8.4 6.4-12.7 11.2-12.7S40.9 51.6 43.2 60H20.8Z" fill="#07345f" opacity="0.72" />
      <path d="M25 45.5 32 54l7-8.5c-2.1-1.8-4.4-2.7-7-2.7s-4.9.9-7 2.7Z" fill="#ffffff" />
      <path d="M29.5 46.8h5l-1.4 3.2 1.7 5.4L32 58l-2.8-2.6 1.7-5.4-1.4-3.2Z" fill="#d6a02d" />
      <path d="M16.8 29.3c.2-12.8 6.7-20.8 15.3-20.8 8.5 0 15 8 15.2 20.8-3.8-2.1-8-3.2-12.6-3.2H29.4c-4.6 0-8.8 1.1-12.6 3.2Z" fill="#27384d" />
      <path d="M20 25.7c.2-8 5.1-13.7 12-13.7s11.8 5.7 12 13.7v7.7c0 8-5 14.4-12 14.4S20 41.4 20 33.4v-7.7Z" fill="#ffd9b8" />
      <path d="M19.9 27.1c2.4-4.2 6.1-6.4 10.9-6.4h2.4c4.7 0 8.4 2.1 10.8 6.2-.6-9.1-5.1-14.9-12-14.9-6.8 0-11.2 5.8-12.1 15.1Z" fill="#27384d" />
      <circle cx="25.7" cy="32" r="4.2" fill="#fff7ec" stroke="#17466f" strokeWidth="1.5" />
      <circle cx="38.3" cy="32" r="4.2" fill="#fff7ec" stroke="#17466f" strokeWidth="1.5" />
      <path d="M29.9 32h4.2" stroke="#17466f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28.4 39.1c2.1 1.7 5.1 1.7 7.2 0" fill="none" stroke="#9f5b35" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M45.4 42.3h9.4v11.6h-9.4z" fill="#f8fbff" stroke="#d6a02d" strokeWidth="1.8" rx="2" />
      <path d="M48.1 46h4.2M48.1 49.6h3.4" stroke="#0b4a83" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function StudentCartoonAvatar(props: { avatarId: StudentAvatarId; size?: number; className?: string }) {
  const size = props.size || 34;
  const config = studentAvatarOptions.find((option) => option.id === props.avatarId) || studentAvatarOptions[0];
  const isGirl = props.avatarId === "student-girl";
  const isCreativeGirl = props.avatarId === "creative-girl";
  const isBusiness = props.avatarId === "business-student";
  const isFounder = props.avatarId === "founder-student";
  const isDefense = props.avatarId === "defense-student";

  return (
    <svg
      className={`student-cartoon-avatar ${props.className || ""}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={config.label}
    >
      <defs>
        <linearGradient id={`studentAvatarBg-${props.avatarId}`} x1="10" x2="54" y1="8" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor={config.bg} />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#studentAvatarBg-${props.avatarId})`} />
      <circle cx="32" cy="32" r="29" fill="none" stroke={config.accent} strokeOpacity="0.72" strokeWidth="2.6" />
      <path d="M14 58c2.3-12.8 9.2-19.6 18-19.6S47.7 45.2 50 58H14Z" fill={config.shirt} />
      <path d="M23.5 42.4 32 52.5l8.5-10.1c-2.5-2-5.4-3.1-8.5-3.1s-6 1.1-8.5 3.1Z" fill="#fff" opacity="0.92" />
      <path d="M20 24.2c.2-9.5 5.1-15.7 12-15.7s11.8 6.2 12 15.7v7.2c0 8-5 14.5-12 14.5S20 39.4 20 31.4v-7.2Z" fill="#ffd9b8" />
      {isCreativeGirl ? (
        <>
          <path d="M17.5 30.5c-.3-13.3 5.8-22 14.5-22s14.8 8.7 14.5 22c-3.4-4.6-8.2-7-14.5-7s-11.1 2.4-14.5 7Z" fill={config.hair} />
          <path d="M17.2 31.8c.2 9.3-1.5 15.9-5.1 19.8 5.8 1.3 10.1-.7 12.8-6" fill={config.hair} opacity="0.82" />
          <path d="M46.8 31.8c-.2 9.3 1.5 15.9 5.1 19.8-5.8 1.3-10.1-.7-12.8-6" fill={config.hair} opacity="0.82" />
          <path d="M46 19.5c2.7.5 4.5 2.2 5.4 5.1-2.9-.7-4.8-2.4-5.4-5.1Z" fill={config.accent} opacity="0.9" />
          <path d="M44.6 19.8c-2.6 1-4 3.1-4.3 6.2 2.8-1.2 4.2-3.3 4.3-6.2Z" fill="#ffd769" opacity="0.92" />
        </>
      ) : isGirl ? (
        <>
          <path d="M17.5 29.6c-.1-12.2 6-20.7 14.5-20.7s14.6 8.5 14.5 20.7c-2.9-3.3-7-5-12.3-5h-4.4c-5.3 0-9.4 1.7-12.3 5Z" fill={config.hair} />
          <path d="M19 33c-.8 7.2-2.8 13.2-6 18 4.9 1.7 8.7.7 11.4-3.1" fill={config.hair} opacity="0.92" />
          <path d="M45 33c.8 7.2 2.8 13.2 6 18-4.9 1.7-8.7.7-11.4-3.1" fill={config.hair} opacity="0.92" />
        </>
      ) : (
        <path d="M18.6 27.3c.8-11.5 6.1-18.5 13.5-18.5 7.3 0 12.5 7 13.3 18.5-3.8-2.8-8.3-4.2-13.4-4.2-5.2 0-9.6 1.4-13.4 4.2Z" fill={config.hair} />
      )}
      <circle cx="27.2" cy="31.6" r="1.9" fill="#27384d" />
      <circle cx="36.8" cy="31.6" r="1.9" fill="#27384d" />
      <path d="M28.2 38c2.4 1.9 5.2 1.9 7.6 0" fill="none" stroke="#a15b45" strokeLinecap="round" strokeWidth="1.8" />
      {isBusiness && <path d="M24 46.8h16v6H24v-6Z" fill="#ffffff" opacity="0.24" />}
      {isFounder && <path d="M43 17.5h7.5v7.5H43z" fill={config.accent} opacity="0.92" transform="rotate(11 46.75 21.25)" />}
      {isDefense && <path d="M45.5 15.5 51 20l-5.5 4.5L40 20l5.5-4.5Z" fill={config.accent} opacity="0.92" />}
    </svg>
  );
}

export {
  AppThreeBackdrop,
  BrainstormAvatar,
  BusinessAvatar,
  CartoonExpertAvatar,
  DefenseAvatar,
  DefenseJudgeAvatar,
  LoginThreeScene,
  MarketAvatar,
  MediaAvatar,
  PitchAvatar,
  PositioningAvatar,
  ScriptAvatar,
  StudentCartoonAvatar,
  SufeSeal,
};

