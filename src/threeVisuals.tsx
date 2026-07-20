import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

type Role = "student" | "teacher" | "admin";

function LoginThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 8.9);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const stage = new Group();
    stage.position.set(0.42, -0.24, 0);
    stage.rotation.set(-0.16, -0.36, 0.1);
    stage.scale.setScalar(1.28);
    scene.add(stage);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const additive = AdditiveBlending;
    const coreWire = track(
      new MeshBasicMaterial({ color: 0x56c4ff, transparent: true, opacity: 0.058, wireframe: true, blending: additive, depthWrite: false }),
    );
    const coreFill = track(
      new MeshBasicMaterial({ color: 0x7bd8ff, transparent: true, opacity: 0.016, blending: additive, depthWrite: false }),
    );
    const coreMist = track(
      new MeshBasicMaterial({ color: 0xb8ecff, transparent: true, opacity: 0.012, blending: additive, depthWrite: false }),
    );
    const goldWire = track(
      new MeshBasicMaterial({ color: 0xe2bd57, transparent: true, opacity: 0.074, wireframe: true, blending: additive, depthWrite: false }),
    );
    const ringBlue = track(new MeshBasicMaterial({ color: 0x76cfff, transparent: true, opacity: 0.056, blending: additive, depthWrite: false }));
    const ringGold = track(new MeshBasicMaterial({ color: 0xe1bd58, transparent: true, opacity: 0.052, blending: additive, depthWrite: false }));
    const ribbonBlue = track(new MeshBasicMaterial({ color: 0xa6e6ff, transparent: true, opacity: 0.04, blending: additive, depthWrite: false }));
    const ribbonGold = track(new MeshBasicMaterial({ color: 0xf2d071, transparent: true, opacity: 0.035, blending: additive, depthWrite: false }));
    const nodeBlue = track(new MeshBasicMaterial({ color: 0x78d6ff, transparent: true, opacity: 0.36, blending: additive, depthWrite: false }));
    const nodeGold = track(new MeshBasicMaterial({ color: 0xf0c65c, transparent: true, opacity: 0.38, blending: additive, depthWrite: false }));
    const linkMaterial = track(new LineBasicMaterial({ color: 0x95d8ff, transparent: true, opacity: 0.11, blending: additive, depthWrite: false }));
    const scanBlue = track(
      new MeshBasicMaterial({ color: 0x8bd8ff, transparent: true, opacity: 0.046, wireframe: true, blending: additive, depthWrite: false }),
    );
    const scanGold = track(
      new MeshBasicMaterial({ color: 0xf0c65c, transparent: true, opacity: 0.038, wireframe: true, blending: additive, depthWrite: false }),
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
      const texture = track(new CanvasTexture(canvas));
      texture.colorSpace = SRGBColorSpace;
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
      const texture = track(new CanvasTexture(canvas));
      texture.colorSpace = SRGBColorSpace;
      return texture;
    };

    const blueGlow = track(new SpriteMaterial({ map: makeGlowTexture("rgba(92,190,255,0.42)", "rgba(44,132,205,0.10)"), transparent: true, opacity: 0.2, blending: additive, depthWrite: false }));
    const nodeBlueGlow = track(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(110,200,255,0.62)", "rgba(63,156,219,0.2)"),
        transparent: true,
        opacity: 0.45,
        blending: additive,
        depthWrite: false,
      }),
    );
    const nodeGoldGlow = track(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(246,204,105,0.62)", "rgba(213,173,71,0.18)"),
        transparent: true,
        opacity: 0.4,
        blending: additive,
        depthWrite: false,
      }),
    );
    const blueBeam = track(
      new SpriteMaterial({
        map: makeBeamTexture("rgba(106,203,255,0.30)", "rgba(55,133,205,0.08)"),
        transparent: true,
        opacity: 0.09,
        blending: additive,
        depthWrite: false,
      }),
    );
    const goldBeam = track(
      new SpriteMaterial({
        map: makeBeamTexture("rgba(244,198,88,0.28)", "rgba(213,173,71,0.07)"),
        transparent: true,
        opacity: 0.075,
        blending: additive,
        depthWrite: false,
      }),
    );

    const core = new Mesh(track(new SphereGeometry(0.72, 64, 36)), coreWire);
    const coreHalo = new Mesh(track(new SphereGeometry(1.14, 72, 40)), coreFill);
    const coreAtmosphere = new Mesh(track(new SphereGeometry(1.34, 72, 40)), coreMist);
    const coreShard = new Mesh(track(new IcosahedronGeometry(0.48, 3)), goldWire);
    stage.add(coreAtmosphere, coreHalo, core, coreShard);

    const mainGlow = new Sprite(blueGlow);
    mainGlow.scale.set(4.8, 4.8, 1);
    stage.add(mainGlow);

    const beamSprites = [
      { sprite: new Sprite(blueBeam), y: 0.12, z: -0.72, scale: [4.8, 0.34, 1] as const },
      { sprite: new Sprite(goldBeam), y: -0.3, z: -0.54, scale: [4.4, 0.26, 1] as const },
      { sprite: new Sprite(track(blueBeam.clone())), y: 0.68, z: -0.88, scale: [4.2, 0.18, 1] as const },
    ];
    beamSprites.forEach(({ sprite, y, z, scale }, index) => {
      sprite.position.set(0.06 + index * 0.12, y, z);
      sprite.scale.set(scale[0], scale[1], scale[2]);
      sprite.rotation.z = index === 1 ? -0.14 : 0.08;
      stage.add(sprite);
    });

    const makeOrbitCurve = (rx: number, ry: number, twist: number, phase: number) => {
      const points: Vector3[] = [];
      for (let index = 0; index <= 96; index += 1) {
        const angle = (index / 96) * Math.PI * 2;
        points.push(new Vector3(Math.cos(angle + phase) * rx, Math.sin(angle + phase) * ry, Math.sin(angle * 2 + phase) * twist));
      }
      return new CatmullRomCurve3(points, true);
    };

    const orbitSettings = [
      { rx: 2.55, ry: 0.9, twist: 0.32, phase: 0.2, material: ringBlue, radius: 0.0072 },
      { rx: 2.34, ry: 1.26, twist: 0.42, phase: 1.1, material: ringGold, radius: 0.0066 },
      { rx: 2.96, ry: 1.1, twist: 0.5, phase: 2.2, material: ringBlue, radius: 0.0058 },
      { rx: 2.02, ry: 1.56, twist: 0.36, phase: 2.9, material: ringBlue, radius: 0.005 },
    ];
    const orbitMeshes = orbitSettings.map((setting) => {
      const geometry = track(new TubeGeometry(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), 220, setting.radius, 10, true));
      const mesh = new Mesh(geometry, setting.material);
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
      const geometry = track(new TubeGeometry(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), 260, setting.radius, 8, true));
      const mesh = new Mesh(geometry, setting.material);
      mesh.rotation.set(setting.phase * 0.24, setting.phase * 0.14, setting.phase * 0.2);
      stage.add(mesh);
      return mesh;
    });

    const scanRings = [
      new Mesh(track(new TorusGeometry(1.58, 0.0034, 8, 200)), scanBlue),
      new Mesh(track(new TorusGeometry(2.18, 0.003, 8, 200)), scanGold),
      new Mesh(track(new TorusGeometry(2.82, 0.0028, 8, 200)), scanBlue),
    ];
    scanRings.forEach((ring, index) => {
      ring.rotation.set(Math.PI / 2 + index * 0.16, index * 0.22, index * 0.28);
      ring.scale.set(1, 0.56, 1);
      stage.add(ring);
    });

    const nodeGeometry = track(new SphereGeometry(0.038, 28, 18));
    const nodePositions: Vector3[] = [];
    const nodeMeshes: Mesh[] = [];
    const nodeGlowSprites: Sprite[] = [];
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const position = new Vector3(Math.cos(angle) * 2.58, Math.sin(angle) * 0.98, Math.sin(angle * 2) * 0.46);
      nodePositions.push(position);
      const isGoldNode = index % 3 === 0;
      const node = new Mesh(nodeGeometry, isGoldNode ? nodeGold : nodeBlue);
      node.position.copy(position);
      node.rotation.set(index * 0.22, index * 0.17, index * 0.13);
      stage.add(node);
      nodeMeshes.push(node);
      const glow = new Sprite(isGoldNode ? nodeGoldGlow : nodeBlueGlow);
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
    const linkGeometry = track(new BufferGeometry());
    linkGeometry.setAttribute("position", new Float32BufferAttribute(linkPositions, 3));
    stage.add(new LineSegments(linkGeometry, linkMaterial));

    const seed = (value: number) => {
      const result = Math.sin(value * 12.9898) * 43758.5453;
      return result - Math.floor(result);
    };
    const particleCount = 780;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const blue = new Color(0x6cc6ff);
    const pale = new Color(0xb7e4ff);
    const gold = new Color(0xf1c65d);
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
    const particleGeometry = track(new BufferGeometry());
    particleGeometry.setAttribute("position", new BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new BufferAttribute(particleColors, 3));
    const particleMaterial = track(
      new PointsMaterial({ size: 0.031, vertexColors: true, transparent: true, opacity: 0.46, blending: additive, depthWrite: false, sizeAttenuation: true }),
    );
    const particles = new Points(particleGeometry, particleMaterial);
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
    const screenParticleGeometry = track(new BufferGeometry());
    screenParticleGeometry.setAttribute("position", new BufferAttribute(screenParticlePositions, 3));
    screenParticleGeometry.setAttribute("color", new BufferAttribute(screenParticleColors, 3));
    const screenParticleMaterial = track(
      new PointsMaterial({ size: 0.019, vertexColors: true, transparent: true, opacity: 0.42, blending: additive, depthWrite: false, sizeAttenuation: true }),
    );
    const screenParticles = new Points(screenParticleGeometry, screenParticleMaterial);
    scene.add(screenParticles);

    const atmosphereMaterial = track(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(93,185,234,0.22)", "rgba(33,102,164,0.08)"),
        transparent: true,
        opacity: 0.42,
        blending: additive,
        depthWrite: false,
      }),
    );
    const atmosphere = new Sprite(atmosphereMaterial);
    atmosphere.position.set(2.05, -0.22, -2.4);
    atmosphere.scale.set(9.8, 6.9, 1);
    scene.add(atmosphere);

    const cometMaterial = track(new MeshBasicMaterial({ color: 0xd9b34f, transparent: true, opacity: 0.38, blending: additive, depthWrite: false }));
    const cometGeometry = track(new SphereGeometry(0.028, 12, 12));
    const comets = orbitSettings.slice(0, 3).map((setting, index) => {
      const comet = new Mesh(cometGeometry, cometMaterial);
      comet.position.copy(makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase).getPoint(index / 3));
      stage.add(comet);
      return { comet, curve: makeOrbitCurve(setting.rx, setting.ry, setting.twist, setting.phase), speed: 0.052 + index * 0.014 };
    });

    const ambient = new AmbientLight(0xffffff, 0.55);
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
      const positionAttribute = particleGeometry.attributes.position as BufferAttribute;
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
      const screenPositionAttribute = screenParticleGeometry.attributes.position as BufferAttribute;
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

    const scene = new Scene();
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9.2);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };
    const additive = AdditiveBlending;
    const primaryColor = new Color(roleConfig.primary);
    const accentColor = new Color(roleConfig.accent);
    const softColor = new Color(roleConfig.soft);
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
      const texture = track(new CanvasTexture(canvas));
      texture.colorSpace = SRGBColorSpace;
      return texture;
    };

    const roleGlow = track(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(100,190,255,0.28)", "rgba(54,126,190,0.09)"),
        transparent: true,
        opacity: props.role === "admin" ? 0.36 : 0.42,
        blending: additive,
        depthWrite: false,
      }),
    );
    const accentGlow = track(
      new SpriteMaterial({
        map: makeGlowTexture("rgba(246,204,105,0.24)", "rgba(213,173,71,0.08)"),
        transparent: true,
        opacity: props.role === "teacher" ? 0.24 : 0.32,
        blending: additive,
        depthWrite: false,
      }),
    );

    const group = new Group();
    group.position.set(0.2, 0, -1.2);
    scene.add(group);

    const glowSprites = [
      { material: roleGlow, x: -4.4, y: 2.45, z: -2.2, scaleX: 6.0, scaleY: 3.2 },
      { material: accentGlow, x: 4.6, y: -2.2, z: -2.4, scaleX: 5.8, scaleY: 3.1 },
      { material: roleGlow, x: 1.6, y: 0.25, z: -2.8, scaleX: 8.4, scaleY: 4.2 },
    ].map((item) => {
      const sprite = new Sprite(item.material);
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
    const starGeometry = track(new BufferGeometry());
    starGeometry.setAttribute("position", new BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new BufferAttribute(starColors, 3));
    const starMaterial = track(
      new PointsMaterial({
        size: 0.024,
        vertexColors: true,
        transparent: true,
        opacity: 0.36,
        blending: additive,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    const stars = new Points(starGeometry, starMaterial);
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

    const pointGeometry = track(new BufferGeometry());
    pointGeometry.setAttribute("position", new BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute("color", new BufferAttribute(pointColors, 3));
    const pointMaterial = track(
      new PointsMaterial({
        size: 0.038,
        vertexColors: true,
        transparent: true,
        opacity: 0.44,
        blending: additive,
        depthWrite: false,
      }),
    );
    const points = new Points(pointGeometry, pointMaterial);
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
    const lineGeometry = track(new BufferGeometry());
    lineGeometry.setAttribute("position", new Float32BufferAttribute(linePositions, 3));
    const lineMaterial = track(new LineBasicMaterial({ color: roleConfig.primary, transparent: true, opacity: 0.11, blending: additive }));
    const lines = new LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    const ribbonPrimary = track(new MeshBasicMaterial({ color: roleConfig.primary, transparent: true, opacity: 0.09, blending: additive, depthWrite: false }));
    const ribbonAccent = track(new MeshBasicMaterial({ color: roleConfig.accent, transparent: true, opacity: 0.075, blending: additive, depthWrite: false }));
    const makeFlowCurve = (offsetY: number, phase: number) =>
      new CatmullRomCurve3([
        new Vector3(-7.2, -2.7 + offsetY, -1.5),
        new Vector3(-4.2, -1.0 + offsetY + Math.sin(phase) * 0.2, -1.05),
        new Vector3(-0.8, -1.45 + offsetY, -0.72),
        new Vector3(2.8, -0.38 + offsetY + Math.cos(phase) * 0.22, -1.2),
        new Vector3(7.1, 1.1 + offsetY, -1.6),
      ]);
    const ribbons = [
      { curve: makeFlowCurve(0.15, 0.2), material: ribbonPrimary, radius: 0.018 },
      { curve: makeFlowCurve(1.1, 1.1), material: ribbonAccent, radius: 0.014 },
      { curve: makeFlowCurve(-1.25, 2.4), material: ribbonPrimary, radius: 0.012 },
    ].map((item) => {
      const mesh = new Mesh(track(new TubeGeometry(item.curve, 120, item.radius, 8, false)), item.material);
      group.add(mesh);
      return mesh;
    });

    const ringMaterial = track(new MeshBasicMaterial({ color: roleConfig.accent, transparent: true, opacity: 0.13, wireframe: true, blending: additive }));
    const ringGeometry = track(new TorusGeometry(1.9, 0.007, 8, 118));
    const rings = [
      { x: -4.9, y: 2.55, z: -0.6, scale: 1.18 },
      { x: 4.65, y: -2.5, z: -0.85, scale: 1.7 },
      { x: 2.15, y: 2.0, z: -1.2, scale: 1.02 },
      { x: -1.4, y: -2.95, z: -1.4, scale: 1.28 },
    ].map((item, index) => {
      const ring = new Mesh(ringGeometry, ringMaterial);
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
      const starAttribute = starGeometry.attributes.position as BufferAttribute;
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

export { AppThreeBackdrop, LoginThreeScene };
