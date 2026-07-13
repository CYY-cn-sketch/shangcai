import { type CSSProperties, type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  GraduationCap,
  Layers3,
  LineChart,
  LogOut,
  MessageSquareText,
  Mic,
  MonitorPlay,
  PenLine,
  RotateCcw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import * as THREE from "three";
import "./App.css";

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

type Role = "student" | "teacher" | "admin";
type ModelMode = "Auto" | "快速生成" | "深度分析" | "多模态增强";
type ExpertId = string;
type ArtifactType = "BRAINSTORM" | "POSITIONING" | "MARKET" | "BP" | "PPT" | "SCRIPT" | "DEFENSE" | "MEDIA";
type SubmissionStatus = "pending" | "approved" | "revision" | "withdrawn";
type StudentViewMode = "workspace" | "feedback" | "defense";
type StudentAvatarId = "student-boy" | "student-girl" | "business-student" | "founder-student" | "defense-student" | "creative-girl";
type StudentProfileState = Record<string, { avatarId: StudentAvatarId }>;
type TeacherReviewSearch = {
  keyword: string;
  artifactType: ArtifactType | "ALL";
  status: SubmissionStatus | "ALL";
  startDate: string;
  endDate: string;
};
type StudentFeedbackSearch = {
  keyword: string;
  artifactType: ArtifactType | "ALL";
  status: SubmissionStatus | "ALL";
};
type KnowledgeUploadSearch = {
  keyword: string;
  category: KnowledgeCategory | "ALL";
  status: "ALL" | "enabled" | "disabled";
};
type TeacherReviewTab = "files" | "diagnosis" | "rubric" | "feedback";
type RubricScore = {
  name: string;
  description: string;
  weight: number;
  aiScore: number;
  teacherScore: number;
};
type DiagnosisResult = {
  problems: string[];
  risks: string[];
  questions: string[];
  tasks: string[];
};
type DefenseTurn = { id: string; sender: "student" | "ai"; content: string; createdAt: string };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionResultLike = { 0?: { transcript?: string } };
type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};
type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};
type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const emptyTeacherReviewSearch: TeacherReviewSearch = {
  keyword: "",
  artifactType: "ALL",
  status: "ALL",
  startDate: "",
  endDate: "",
};

const emptyKnowledgeUploadSearch: KnowledgeUploadSearch = {
  keyword: "",
  category: "ALL",
  status: "ALL",
};

type AuthSession = {
  role: Role;
  name: string;
  account: string;
  title: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
};

type DemoAccount = AuthSession & {
  password: string;
};

type AccountRecord = DemoAccount & {
  id: string;
  groupOrScope: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
  permissions: string[];
  disabledPermissions?: string[];
  quota: number;
  status: "已开通" | "已停用";
};

type StudentGroup = {
  id: string;
  label: string;
  projectName: string;
};

type PermissionAccess = {
  account?: AccountRecord;
  accountDisabled: boolean;
  disabledPermissions: string[];
  can: (permission: string) => boolean;
  block: (permission: string) => void;
};

type Skill = {
  id: string;
  name: string;
  stage: string;
  description: string;
};

type ExpertIconComponent = (props: { size?: number }) => ReactElement;

type Expert = {
  id: ExpertId;
  name: string;
  role: string;
  scenario: string;
  icon: ExpertIconComponent;
  accent: string;
  skills: Skill[];
  sourceSkillName?: string;
  sourceSkillContent?: string;
  sourceSkillUploadedBy?: string;
  sourceSkillUploadedAt?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type CustomExpertRecord = {
  id: ExpertId;
  name: string;
  role: string;
  scenario: string;
  accent: string;
  skills: Skill[];
  sourceSkillName?: string;
  sourceSkillContent?: string;
  sourceSkillUploadedBy?: string;
  sourceSkillUploadedAt?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type DeletedExpertIdState = ExpertId[];

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

const studentAvatarOptions: Array<{ id: StudentAvatarId; label: string; accent: string; hair: string; shirt: string; bg: string }> = [
  { id: "student-boy", label: "男学生", accent: "#2f80d0", hair: "#27384d", shirt: "#0b4a83", bg: "#e9f5ff" },
  { id: "student-girl", label: "女学生", accent: "#ef8bb8", hair: "#5a3a2c", shirt: "#d95f95", bg: "#fff0f7" },
  { id: "business-student", label: "商务学生", accent: "#c79a2d", hair: "#2b3345", shirt: "#123f6d", bg: "#fff7df" },
  { id: "founder-student", label: "创业学生", accent: "#17a07f", hair: "#3b2c21", shirt: "#0f7b73", bg: "#eafff8" },
  { id: "defense-student", label: "答辩学生", accent: "#7c6cf0", hair: "#2f2f4f", shirt: "#5146b8", bg: "#f0eeff" },
  { id: "creative-girl", label: "创意女生", accent: "#4fb4eb", hair: "#3f2c68", shirt: "#1e88a8", bg: "#eefaff" },
];

const defaultStudentAvatarId: StudentAvatarId = "student-boy";

function normalizeStudentAvatarId(avatarId?: string): StudentAvatarId {
  return studentAvatarOptions.some((option) => option.id === avatarId) ? (avatarId as StudentAvatarId) : defaultStudentAvatarId;
}

function getStudentProfileAvatar(account?: string, profiles?: StudentProfileState) {
  return normalizeStudentAvatarId(account ? profiles?.[account]?.avatarId : undefined);
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

type Idea = {
  id: string;
  title: string;
  description: string;
  stage: string;
  updatedAt: string;
};

type ResultBlock = {
  title: string;
  items: string[];
};

type ChatMessage = {
  id: string;
  ideaId: string;
  sender: "user" | "ai";
  mode?: "文本" | "录音" | "语音";
  expertId?: ExpertId;
  expertName?: string;
  skillName?: string;
  artifactType?: ArtifactType;
  content: string;
  blocks?: ResultBlock[];
  createdAt: string;
};

type GeneratedAssetType = "PPT" | "VIDEO";
type ContextAction = "ask" | "script" | "video" | "download" | "preview";
type PendingAssetGeneration = {
  title: string;
  detail: string;
  seconds: number;
};
type PptKnowledgeReference = { title: string; url?: string; content?: string };
type GeneratedAsset = {
  id: string;
  ideaId: string;
  type: GeneratedAssetType;
  title: string;
  sourceMessageId?: string;
  createdAt: string;
  prompt?: string;
  script?: string;
  storyboard?: string;
  posterPrompt?: string;
  visualPrompt?: string;
  videoUrl?: string;
  videoGeneratedAt?: string;
  pptKnowledgeContent?: string;
  pptKnowledgeReferences?: PptKnowledgeReference[];
  pptGeneratedAt?: string;
  pptUsesLexiang?: boolean;
  pptUrl?: string;
  pptFileName?: string;
};
type WordPreview = { title: string; blocks: ResultBlock[] };

type Submission = {
  id: string;
  ideaId: string;
  student: string;
  group: string;
  groupName?: string;
  artifactType: ArtifactType;
  artifactTitle: string;
  artifactSummary: string;
  blocks: ResultBlock[];
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  teacherComment?: string;
  sourceMessageId?: string;
  isExcellent?: boolean;
};

type DefensePractice = {
  id: string;
  ideaId: string;
  basis: "BP + PPT + 路演稿";
  scripts: Record<"1分钟" | "3分钟" | "5分钟", string>;
  questions: string[];
  answerSuggestions: string[];
  expressionTips: string[];
  transcript: DefenseTurn[];
  evaluation: ResultBlock[];
  visibility: "self" | "teacher";
  createdAt: string;
};

type KnowledgeUpload = {
  id: string;
  name: string;
  sizeLabel: string;
  fileType: string;
  fileDataUrl?: string;
  uploadedAt: string;
  uploadedBy?: string;
  preview: string;
  category?: KnowledgeCategory;
  enabled?: boolean;
};

type KnowledgeCategory = string;
type StudentKnowledgeSelection = {
  categories: KnowledgeCategory[];
  uploadIds: string[];
};
type PendingKnowledgeAssetAction = { id: string; action: "toggle" | "delete" };
type KnowledgeBaseCatalogItem = { category: KnowledgeCategory; description: string; usedBy: string };
const knowledgeCategoryOptions: KnowledgeCategory[] = [
  "教学大纲",
  "BP 模板",
  "PPT 模板",
  "评分标准",
  "创业案例",
  "答辩题库",
  "多媒体模板",
];

const defaultKnowledgeBaseCatalog: KnowledgeBaseCatalogItem[] = [
  { category: "教学大纲", description: "课程阶段、教学目标、8 周节奏和阶段成果要求。", usedBy: "头脑风暴、项目定位、BP、PPT、答辩" },
  { category: "BP 模板", description: "商业计划书章节结构、内容颗粒度、商业模式和财务假设。", usedBy: "项目定位、商业计划书、PPT、答辩" },
  { category: "PPT 模板", description: "路演页序、页面观点、图表建议和演讲提示。", usedBy: "路演 PPT、答辩模拟、多媒体物料" },
  { category: "评分标准", description: "Rubric、审核维度、通过/退回口径和优秀成果判断标准。", usedBy: "BP、PPT、答辩、教师审核" },
  { category: "创业案例", description: "优秀项目案例、行业标签、商业模式样例和课堂可复用素材。", usedBy: "头脑风暴、项目定位、BP、市场判断" },
  { category: "答辩题库", description: "评委高频追问、压力测试问题、回答结构和表达评价标准。", usedBy: "答辩模拟" },
  { category: "多媒体模板", description: "短视频脚本、分镜表、海报文案、视觉 Prompt 和宣传素材样例。", usedBy: "多媒体物料专家" },
];
let knowledgeBaseCatalog: KnowledgeBaseCatalogItem[] = defaultKnowledgeBaseCatalog;

type KnowledgeBaseStates = Record<KnowledgeCategory, boolean>;
type PromptKnowledgeRoutes = Record<ExpertId, KnowledgeCategory[]>;
const initialKnowledgeBaseStates = knowledgeCategoryOptions.reduce(
  (states, category) => ({ ...states, [category]: true }),
  {} as KnowledgeBaseStates,
);

const expertKnowledgeMap: Record<ExpertId, KnowledgeCategory[]> = {
  brainstorm: ["教学大纲", "创业案例"],
  positioning: ["教学大纲", "BP 模板", "创业案例"],
  market: ["创业案例", "评分标准"],
  business: ["BP 模板", "评分标准", "创业案例"],
  pitch: ["PPT 模板", "BP 模板", "评分标准"],
  script: ["PPT 模板", "答辩题库", "评分标准"],
  defense: ["答辩题库", "PPT 模板", "BP 模板", "评分标准"],
  media: ["多媒体模板", "PPT 模板", "创业案例"],
};

function getExpertKnowledgeCategories(expertId: ExpertId) {
  return expertKnowledgeMap[expertId] || ["教学大纲", "创业案例"];
}

function getConfiguredExpertKnowledgeCategories(expertId: ExpertId, routes?: PromptKnowledgeRoutes) {
  return Array.from(new Set(routes?.[expertId] || getExpertKnowledgeCategories(expertId)));
}

function createKnowledgeRouteState(): PromptKnowledgeRoutes {
  return Object.fromEntries(
    Object.entries(expertKnowledgeMap).map(([expertId, categories]) => [expertId, [...categories]]),
  ) as PromptKnowledgeRoutes;
}

function getKnowledgeCatalogItems(categories: KnowledgeCategory[]) {
  return categories.map((category) => knowledgeBaseCatalog.find((base) => base.category === category) || knowledgeBaseCatalog[0]);
}

function toggleKnowledgeRouteCategory(current: KnowledgeCategory[], category: KnowledgeCategory) {
  if (current.includes(category)) {
    return current.length > 1 ? current.filter((item) => item !== category) : current;
  }
  return [...current, category];
}

function getActiveKnowledgeCatalog(catalog: KnowledgeBaseCatalogItem[]) {
  return catalog.length ? catalog : defaultKnowledgeBaseCatalog;
}

function syncKnowledgeCatalogAddition(
  catalog: KnowledgeBaseCatalogItem[],
  states: KnowledgeBaseStates,
  routes: PromptKnowledgeRoutes,
  item: KnowledgeBaseCatalogItem,
) {
  const nextCatalog = [...catalog, item];
  const nextStates = { ...states, [item.category]: true };
  const nextRoutes = experts.reduce((result, expert) => {
    const categories = routes[expert.id] || getExpertKnowledgeCategories(expert.id);
    result[expert.id] = Array.from(new Set([...categories, item.category]));
    return result;
  }, {} as PromptKnowledgeRoutes);
  return { nextCatalog, nextStates, nextRoutes };
}

function syncKnowledgeCatalogDeletion(
  catalog: KnowledgeBaseCatalogItem[],
  states: KnowledgeBaseStates,
  routes: PromptKnowledgeRoutes,
  category: KnowledgeCategory,
) {
  const activeCatalog = getActiveKnowledgeCatalog(catalog);
  const nextCatalog = activeCatalog.filter((item) => item.category !== category);
  const fallbackCategory = nextCatalog[0]?.category;
  const nextStates = Object.fromEntries(
    Object.entries(states).filter(([key]) => key !== category),
  ) as KnowledgeBaseStates;
  const nextRoutes = experts.reduce((result, expert) => {
    const categories = routes[expert.id] || getExpertKnowledgeCategories(expert.id);
    const kept = categories.filter((item) => item !== category);
    result[expert.id] = kept.length ? kept : fallbackCategory ? [fallbackCategory] : [];
    return result;
  }, {} as PromptKnowledgeRoutes);
  return { nextCatalog, nextStates, nextRoutes };
}

const modelModes: ModelMode[] = ["Auto", "快速生成", "深度分析", "多模态增强"];

const artifactLabels: Record<ArtifactType, string> = {
  BRAINSTORM: "头脑风暴",
  POSITIONING: "项目定位",
  MARKET: "市场竞品",
  BP: "商业计划书 BP",
  PPT: "路演 PPT",
  SCRIPT: "路演稿",
  DEFENSE: "答辩模拟",
  MEDIA: "多媒体物料",
};

const statusLabels: Record<SubmissionStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  revision: "退回修改",
  withdrawn: "已撤回",
};

const projectKanbanStages: Array<{ label: string; types: ArtifactType[] }> = [
  { label: "头脑风暴", types: ["BRAINSTORM"] },
  { label: "项目定位", types: ["POSITIONING"] },
  { label: "市场竞品", types: ["MARKET"] },
  { label: "商业模式", types: ["BP"] },
  { label: "BP 撰写", types: ["BP"] },
  { label: "路演 PPT", types: ["PPT"] },
  { label: "陪练答辩", types: ["DEFENSE"] },
  { label: "成果提交", types: ["MEDIA", "SCRIPT"] },
];

const artifactStageIndex: Record<ArtifactType, number> = {
  BRAINSTORM: 0,
  POSITIONING: 1,
  MARKET: 2,
  BP: 4,
  PPT: 5,
  SCRIPT: 7,
  DEFENSE: 6,
  MEDIA: 7,
};

const rubricDimensions = [
  ["创新性", "问题独特性与方案新颖度", 20],
  ["市场洞察", "用户痛点、访谈证据与竞品判断", 20],
  ["商业逻辑", "商业模式完整性与收入闭环", 20],
  ["财务合理性", "收入、成本、转化率和盈亏平衡假设", 15],
  ["表达呈现", "BP/PPT/路演结构与说服力", 15],
  ["团队协作", "分工、迭代记录和课堂参与度", 10],
] as const;

const demoAccounts: DemoAccount[] = [
  { role: "student", name: "陈思源", account: "student@sufe.demo", password: "123456", title: "商学院创业实践课学生" },
  { role: "student", name: "李若涵", account: "student2@sufe.demo", password: "123456", title: "商学院创业实践课学生" },
  { role: "teacher", name: "周老师", account: "teacher@sufe.demo", password: "123456", title: "创业实践课程教师" },
  { role: "admin", name: "平台管理员", account: "admin@sufe.demo", password: "123456", title: "教学平台运营管理员" },
];

const studentExpertPermissionNames = [
  "创意头脑风暴专家",
  "项目定位专家",
  "商业模式/BP 专家",
  "路演 PPT 专家",
  "路演稿生成专家",
  "多媒体物料专家",
];

const studentFeaturePermissionNames = ["AI 创意工作台", "调用课程知识库", "答辩模拟", "提交老师审核", "下载个人成果"];

const extraDemoStudentGroups: StudentGroup[] = [
  { id: "G-11", label: "第 11 组", projectName: "校园创业资源导航" },
];

const initialStudentGroups: StudentGroup[] = [
  { id: "G-01", label: "第 1 组", projectName: "校园二手循环平台" },
  { id: "G-02", label: "第 2 组", projectName: "智能简历诊所" },
  { id: "G-03", label: "第 3 组", projectName: "AI 就业教练" },
  { id: "G-04", label: "第 4 组", projectName: "商科案例共创库" },
  { id: "G-05", label: "第 5 组", projectName: "银发陪诊助手" },
  { id: "G-06", label: "第 6 组", projectName: "低碳积分校园平台" },
  { id: "G-07", label: "第 7 组", projectName: "实习岗位雷达" },
  { id: "G-08", label: "第 8 组", projectName: "校园餐饮排队预测" },
  { id: "G-09", label: "第 9 组", projectName: "创业案例智能检索" },
  { id: "G-10", label: "第 10 组", projectName: "商学院活动助手" },
  ...extraDemoStudentGroups,
];

const extraDemoStudentAccounts: AccountRecord[] = [
  {
    id: "A-STU-003",
    role: "student",
    name: "王梓萱",
    account: "student3@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 240,
    status: "已开通",
  },
  {
    id: "A-STU-004",
    role: "student",
    name: "赵一诺",
    account: "student4@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 240,
    status: "已开通",
  },
  {
    id: "A-STU-005",
    role: "student",
    name: "林嘉诚",
    account: "student5@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
  {
    id: "A-STU-006",
    role: "student",
    name: "黄雨桐",
    account: "student6@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
];

const initialAccountRecords: AccountRecord[] = [
  {
    id: "A-STU-001",
    role: "student",
    name: "陈思源",
    account: "student@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 3 组 / AI 就业教练",
    groupId: "G-03",
    groupLabel: "第 3 组",
    groupName: "AI 就业教练",
    permissions: studentExpertPermissionNames,
    quota: 260,
    status: "已开通",
  },
  {
    id: "A-STU-002",
    role: "student",
    name: "李若涵",
    account: "student2@sufe.demo",
    password: "123456",
    title: "商学院创业实践课学生",
    groupOrScope: "第 4 组 / 商科案例共创库",
    groupId: "G-04",
    groupLabel: "第 4 组",
    groupName: "商科案例共创库",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
  ...extraDemoStudentAccounts,
  {
    id: "A-TEA-001",
    role: "teacher",
    name: "周老师",
    account: "teacher@sufe.demo",
    password: "123456",
    title: "创业实践课程教师",
    groupOrScope: "创业实践课 / 10 个项目组",
    permissions: ["提交审核中心", "节点解答与指导", "优秀成果标记", "上传教学资料"],
    quota: 520,
    status: "已开通",
  },
  {
    id: "A-ADM-001",
    role: "admin",
    name: "平台管理员",
    account: "admin@sufe.demo",
    password: "123456",
    title: "教学平台运营管理员",
    groupOrScope: "全平台运营",
    permissions: ["账号权限管理", "知识库维护", "专家提示词管理", "试点数据看板"],
    quota: 1500,
    status: "已开通",
  },
];

const demoGroupExpansionKey = "sufe-demo-data-20260703-extra-groups";
const demoAccountExpansionKey = "sufe-demo-data-20260703-extra-accounts";

function withExtraDemoStudentGroups(groups: StudentGroup[]) {
  if (localStorage.getItem(demoGroupExpansionKey) === "done") return groups;
  const groupIds = new Set(groups.map((group) => group.id));
  const additions = extraDemoStudentGroups.filter((group) => !groupIds.has(group.id));
  return additions.length ? [...groups, ...additions] : groups;
}

function appendMissingExtraDemoStudentAccounts(records: AccountRecord[]) {
  const accountIds = new Set(records.map((account) => account.id));
  const accounts = new Set(records.map((account) => account.account));
  const additions = extraDemoStudentAccounts.filter((account) => !accountIds.has(account.id) && !accounts.has(account.account));
  return additions.length ? [...records, ...additions] : records;
}

function withExtraDemoStudentAccounts(records: AccountRecord[]) {
  if (localStorage.getItem(demoAccountExpansionKey) === "done") return records;
  return appendMissingExtraDemoStudentAccounts(records);
}

function formatGroupScope(group?: Pick<StudentGroup, "label" | "projectName"> | null) {
  if (!group) return "未分配项目小组";
  return `${group.label} / ${group.projectName}`;
}

function parseGroupScope(scope?: string) {
  if (!scope) return {};
  const [label, projectName] = scope.split("/").map((item) => item.trim());
  if (!label?.includes("组")) return {};
  return { groupLabel: label, groupName: projectName || "" };
}

function resolveAccountGroup(account: Pick<AccountRecord, "groupId" | "groupLabel" | "groupName" | "groupOrScope">, groups: StudentGroup[]) {
  const parsed = parseGroupScope(account.groupOrScope);
  const group =
    groups.find((item) => item.id === account.groupId) ||
    groups.find((item) => item.label === account.groupLabel) ||
    groups.find((item) => item.label === parsed.groupLabel);
  return {
    groupId: group?.id || account.groupId,
    groupLabel: group?.label || account.groupLabel || parsed.groupLabel,
    groupName: group?.projectName || account.groupName || parsed.groupName,
  };
}

function normalizeAccountRecords(records: AccountRecord[], groups: StudentGroup[] = initialStudentGroups) {
  return records.map((account) => {
    const hasExpertPermissions = account.permissions.some((permission) => studentExpertPermissionNames.includes(permission));
    const defaultPermissions = account.role === "student" ? studentExpertPermissionNames : [];
    const basePermissions = account.role === "student" && !hasExpertPermissions ? defaultPermissions : account.permissions;
    const permissions = [...basePermissions, ...defaultPermissions.filter((permission) => !basePermissions.includes(permission))];
    const disabledPermissions = account.disabledPermissions || [];
    if (account.role !== "student") {
      return permissions.length === account.permissions.length ? account : { ...account, permissions };
    }
    const group = resolveAccountGroup(account, groups);
    const groupOrScope = group.groupLabel
      ? formatGroupScope({ label: group.groupLabel, projectName: group.groupName || "未命名项目" })
      : account.groupOrScope || "未分配项目小组";
    return {
      ...account,
      ...group,
      groupOrScope,
      permissions,
      disabledPermissions,
    };
  });
}

function buildAuthSession(account: DemoAccount | AccountRecord, groups: StudentGroup[]): AuthSession {
  const group = "groupOrScope" in account ? resolveAccountGroup(account, groups) : {};
  return {
    role: account.role,
    name: account.name,
    account: account.account,
    title: account.title,
    ...group,
  };
}

function getStudentIdentity(auth: AuthSession | null, account?: AccountRecord) {
  const parsed = parseGroupScope(account?.groupOrScope);
  const groupLabel = account?.groupLabel || auth?.groupLabel || parsed.groupLabel || "";
  const groupName = account?.groupName || auth?.groupName || parsed.groupName || "";
  return {
    student: account?.name || auth?.name || "演示学生",
    group: groupLabel,
    groupName,
    hasGroup: Boolean(groupLabel),
  };
}

function getStudentGroupDisplay(group?: string, groupName?: string) {
  if (!group) return "未分组";
  return groupName ? `${group} · ${groupName}` : group;
}

function getAccountSubtitle(auth: AuthSession, account?: AccountRecord) {
  if (auth.role !== "student") return auth.title;
  const identity = getStudentIdentity(auth, account);
  return `${getStudentGroupDisplay(identity.group, identity.groupName)} · ${auth.title}`;
}

const baseExperts: Expert[] = [
  {
    id: "brainstorm",
    name: "创意头脑风暴专家",
    role: "把零散想法整理为可验证创业方向",
    scenario: "创意发散、痛点识别、任务清单",
    icon: BrainstormAvatar,
    accent: "#0f7b73",
    skills: [
      { id: "idea-map", name: "创意整理", stage: "头脑风暴", description: "归纳讨论内容，提炼核心创业方向" },
      { id: "pain-points", name: "痛点识别", stage: "需求发现", description: "识别目标用户的高频痛点" },
      { id: "hypothesis", name: "任务清单生成", stage: "验证任务", description: "输出待验证假设和执行任务" },
    ],
  },
  {
    id: "positioning",
    name: "项目定位专家",
    role: "把创业方向转化为清晰价值主张",
    scenario: "价值主张、用户画像、差异化表达",
    icon: PositioningAvatar,
    accent: "#1d5fd1",
    skills: [
      { id: "value", name: "价值主张明确", stage: "产品定位", description: "明确产品为谁解决什么问题" },
      { id: "persona", name: "多维用户画像", stage: "目标用户", description: "生成用户画像和使用场景" },
      { id: "differentiation", name: "差异化表达", stage: "竞争定位", description: "优化一句话定位与卖点" },
    ],
  },
  {
    id: "market",
    name: "市场与竞品专家",
    role: "搭建市场判断和竞品分析框架",
    scenario: "市场机会、竞品维度、进入策略",
    icon: MarketAvatar,
    accent: "#8b5c00",
    skills: [
      { id: "market-size", name: "市场机会", stage: "市场分析", description: "梳理市场空间、趋势和切入窗口" },
      { id: "competitors", name: "竞品维度", stage: "竞品分析", description: "生成竞品对比维度和分析表述" },
      { id: "entry", name: "进入策略", stage: "增长策略", description: "给出早期获客和验证路线" },
    ],
  },
  {
    id: "business",
    name: "商业模式/BP 专家",
    role: "把项目整理成商业计划书框架",
    scenario: "商业模式画布、BP 大纲、财务假设",
    icon: BusinessAvatar,
    accent: "#22406a",
    skills: [
      { id: "canvas", name: "商业模式画布", stage: "商业模式", description: "生成九宫格商业模式画布要点" },
      { id: "bp", name: "BP 大纲", stage: "商业计划书", description: "生成 BP 章节结构和执行摘要" },
      { id: "finance", name: "财务假设", stage: "财务模型", description: "输出收入、成本和关键假设" },
    ],
  },
  {
    id: "pitch",
    name: "路演 PPT 专家",
    role: "将 BP 转换为可讲述的路演结构",
    scenario: "10 页大纲、页面观点、讲稿建议",
    icon: PitchAvatar,
    accent: "#005aa8",
    skills: [
      { id: "deck", name: "10 页 PPT 大纲", stage: "路演 PPT", description: "生成 10 页标题、核心观点和图表建议" },
      { id: "slide-points", name: "页面观点", stage: "观点提炼", description: "提炼每页一句话结论" },
      { id: "speaker-notes", name: "讲稿建议", stage: "路演表达", description: "生成演讲提示和转场话术" },
    ],
  },
  {
    id: "script",
    name: "路演稿生成专家",
    role: "基于 BP 与 PPT 生成多时段路演讲稿",
    scenario: "1 分钟、3 分钟、5 分钟演讲稿与转场话术",
    icon: ScriptAvatar,
    accent: "#7a4b00",
    skills: [
      { id: "roadshow-script", name: "路演稿生成", stage: "路演稿", description: "生成 1/3/5 分钟路演稿、开场钩子和收束话术" },
      { id: "talking-points", name: "讲述要点", stage: "路演表达", description: "提炼逐页讲述重点和评委追问承接" },
    ],
  },
  {
    id: "defense",
    name: "AI 评委/答辩陪练专家",
    role: "模拟评委追问并训练答辩表达",
    scenario: "演说稿、压力测试、回答建议",
    icon: DefenseAvatar,
    accent: "#6a4a12",
    skills: [
      { id: "questions", name: "模拟追问", stage: "答辩准备", description: "生成评委可能追问的问题" },
      { id: "answers", name: "回答建议", stage: "答辩优化", description: "给出结构化回答建议" },
      { id: "stress", name: "压力测试", stage: "现场应变", description: "识别商业模型漏洞并追问" },
    ],
  },
  {
    id: "media",
    name: "多媒体物料专家",
    role: "快速产出宣传视频脚本、分镜与海报 Prompt",
    scenario: "视频脚本、分镜表、海报文案、视觉 Prompt",
    icon: MediaAvatar,
    accent: "#0b6b88",
    skills: [
      { id: "video-script", name: "宣传视频脚本", stage: "多媒体展示", description: "生成 30 秒项目宣传视频脚本" },
      { id: "storyboard", name: "视频分镜表", stage: "视觉脚本", description: "拆解 6 镜头分镜、旁白、字幕与时长" },
      { id: "poster", name: "海报文案 Prompt", stage: "海报物料", description: "输出海报标题、文案和生图 Prompt" },
      { id: "visual", name: "视觉素材 Prompt", stage: "原型视觉", description: "生成产品视觉图和宣传图提示词" },
    ],
  },
];

let experts: Expert[] = baseExperts;
const baseStudentExpertIds: ExpertId[] = ["brainstorm", "positioning", "business", "pitch", "script", "media"];
let studentExpertIds: ExpertId[] = baseStudentExpertIds;

function normalizeCustomExperts(records: CustomExpertRecord[]) {
  return records
    .filter((item) => item.name.trim())
    .map((item) => ({
      ...item,
      id: item.id || `custom-${Date.now()}`,
      accent: item.accent || "#0f7b73",
      skills: item.skills?.length
        ? item.skills
        : [{ id: "custom-output", name: "阶段成果生成", stage: "自定义专家", description: "根据教师配置的提示词生成阶段成果" }],
    }));
}

function stripSkillFileExtension(fileName: string) {
  return fileName.replace(/\.(md|txt|json)$/i, "").trim() || "专家 Skill";
}

function getSkillFirstHeading(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#{1,3}\s+\S+/.test(line))
    ?.replace(/^#{1,3}\s+/, "")
    .trim();
}

function getSkillLabeledValue(content: string, labels: string[]) {
  const lines = content.split(/\r?\n/).map((line) => line.trim().replace(/^[-*]\s*/, "").replace(/^#{1,6}\s*/, ""));
  for (const label of labels) {
    const match = lines.find((line) => line.startsWith(`${label}：`) || line.startsWith(`${label}:`));
    if (match) return match.replace(`${label}：`, "").replace(`${label}:`, "").trim();
  }
  return "";
}

function parseExpertSkillJson(content: string) {
  try {
    const parsed = JSON.parse(content) as Partial<CustomExpertRecord> & {
      expertName?: string;
      description?: string;
      prompt?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isExpertSkillFile(file: File) {
  return /\.(md|txt|json)$/i.test(file.name);
}

function getExpertSkillRelativePath(file: File) {
  return file.webkitRelativePath || file.name;
}

function getExpertSkillFolderName(files: File[]) {
  const firstPath = files.find((file) => file.webkitRelativePath)?.webkitRelativePath;
  return firstPath?.split("/")[0] || stripSkillFileExtension(files[0]?.name || "专家 Skill");
}

async function buildCustomExpertFromSkillFiles(files: FileList | File[], uploadedBy: string) {
  const skillFiles = Array.from(files)
    .filter(isExpertSkillFile)
    .sort((a, b) => {
      const aPath = getExpertSkillRelativePath(a);
      const bPath = getExpertSkillRelativePath(b);
      if (/\/?SKILL\.md$/i.test(aPath) && !/\/?SKILL\.md$/i.test(bPath)) return -1;
      if (!/\/?SKILL\.md$/i.test(aPath) && /\/?SKILL\.md$/i.test(bPath)) return 1;
      return aPath.localeCompare(bPath, "zh-CN");
    });
  if (!skillFiles.length) return null;

  const mainFile = skillFiles[0];
  const mainContent = (await mainFile.text()).trim();
  if (!mainContent) return null;

  const supportFiles = skillFiles.filter((file) => file !== mainFile).slice(0, 10);
  const supportSections = await Promise.all(
    supportFiles.map(async (file) => {
      const content = (await file.text()).trim();
      return content ? `\n\n---\n补充文件：${getExpertSkillRelativePath(file)}\n${content.slice(0, 6000)}` : "";
    }),
  );
  const folderName = getExpertSkillFolderName(skillFiles);
  const combinedContent =
    skillFiles.length === 1
      ? mainContent
      : `Skill 文件夹：${folderName}\n主文件：${getExpertSkillRelativePath(mainFile)}\n\n${mainContent}${supportSections.join("")}`;
  const nextExpert = buildCustomExpertFromSkillFile(getExpertSkillRelativePath(mainFile), mainContent, uploadedBy);
  return {
    ...nextExpert,
    sourceSkillName: skillFiles.length === 1 ? mainFile.name : `${folderName} / ${mainFile.name}`,
    sourceSkillContent: combinedContent,
  };
}

function buildCustomExpertFromSkillFile(fileName: string, content: string, uploadedBy: string): CustomExpertRecord {
  const json = parseExpertSkillJson(content);
  const fallbackName = getSkillLabeledValue(content, ["专家名称", "名称", "Name", "name"]) || getSkillFirstHeading(content) || stripSkillFileExtension(fileName);
  const name = (json?.name || json?.expertName || fallbackName).trim();
  const role =
    (json?.role || json?.description || getSkillLabeledValue(content, ["专家定位", "定位", "角色", "Role", "role"])).trim() ||
    "由教师/管理员上传的已调试专家 Skill，按课程场景生成可提交的阶段成果。";
  const scenario =
    (json?.scenario || getSkillLabeledValue(content, ["适用场景", "场景", "Scenario", "scenario"])).trim() ||
    "已调试专家 Skill、课堂专题指导、阶段成果生成";
  const skillName = getSkillLabeledValue(content, ["技能名称", "Skill", "skill"]) || "已调试 Skill 调用";
  const sourceSkillContent = (json?.sourceSkillContent || json?.systemPrompt || json?.prompt || content).trim();
  const skills =
    Array.isArray(json?.skills) && json.skills.length
      ? json.skills
      : [
          {
            id: `custom-skill-${Date.now()}`,
            name: skillName,
            stage: "已调试专家 Skill",
            description: `来自上传文件：${fileName}`,
          },
        ];

  return {
    id: `custom-${Date.now()}`,
    name,
    role,
    scenario,
    accent: json?.accent || "#0f7b73",
    skills,
    sourceSkillName: fileName,
    sourceSkillContent,
    sourceSkillUploadedBy: uploadedBy,
    sourceSkillUploadedAt: nowDateTime(),
    userPrompt: json?.userPrompt,
  };
}

function configureFolderUploadInput(input: HTMLInputElement | null) {
  if (!input) return;
  input.setAttribute("webkitdirectory", "");
  input.setAttribute("directory", "");
  input.setAttribute("multiple", "");
  const folderInput = input as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean };
  folderInput.webkitdirectory = true;
  folderInput.directory = true;
}

function getUniqueExpertName(name: string, existingExperts: Expert[]) {
  const base = name.trim() || "专家 Skill";
  if (!existingExperts.some((expert) => expert.name === base)) return base;
  let index = 2;
  while (existingExperts.some((expert) => expert.name === `${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function buildCustomExpert(record: CustomExpertRecord): Expert {
  return {
    ...record,
    icon: (props) => <CartoonExpertAvatar {...props} variant={record.id} />,
  };
}

function mergeExperts(customExperts: CustomExpertRecord[], deletedExpertIds: ExpertId[] = []) {
  const normalized = normalizeCustomExperts(customExperts);
  const customIds = new Set(normalized.map((item) => item.id));
  const deletedIds = new Set(deletedExpertIds);
  const base = baseExperts.filter((expert) => !customIds.has(expert.id) && !deletedIds.has(expert.id));
  return [...base, ...normalized.filter((item) => !deletedIds.has(item.id)).map(buildCustomExpert)];
}

function isStudentExpertId(expertId: ExpertId) {
  return studentExpertIds.includes(expertId);
}

function getStudentExpertPermissionNames() {
  return experts.filter((expert) => isStudentExpertId(expert.id)).map((expert) => expert.name);
}

const studentFeaturePermissionSet = new Set(studentFeaturePermissionNames);
const demoPptUrl = "/demo-assets/AI_Coach_Roadshow.pptx";
const demoVideoUrl = "/demo-assets/AI_Coach_30s.mp4";
const workBuddyGeneratedVideoUrl = "/generated-videos/sufe-workbuddy-video.mp4";
const workBuddyApiBase = (import.meta.env.VITE_WORKBUDDY_API_BASE || "/workbuddy-api").replace(/\/$/, "");
const pptPreviewImages = Array.from({ length: 10 }, (_, index) => `/demo-assets/ppt-preview/slide-${String(index + 1).padStart(2, "0")}.png`);
const artifactExpertMap: Record<ArtifactType, ExpertId> = {
  BRAINSTORM: "brainstorm",
  POSITIONING: "positioning",
  MARKET: "market",
  BP: "business",
  PPT: "pitch",
  SCRIPT: "script",
  DEFENSE: "defense",
  MEDIA: "media",
};

function isStudentExpertEnabled(expert: Expert, account?: AccountRecord) {
  if (!account || account.role !== "student") return true;
  if (account.status === "已停用") return false;
  if (expert.id.startsWith("custom-") && !(account.disabledPermissions || []).includes(expert.name)) return true;
  if (!account.permissions.includes(expert.name)) return false;
  return !(account.disabledPermissions || []).includes(expert.name);
}

function resolveMessageExpert(message: Pick<ChatMessage, "expertId" | "expertName" | "artifactType">, fallback: Expert) {
  if (message.expertId) return experts.find((expert) => expert.id === message.expertId) || fallback;
  if (message.expertName) return experts.find((expert) => expert.name === message.expertName) || fallback;
  if (message.artifactType) return experts.find((expert) => expert.id === artifactExpertMap[message.artifactType]) || fallback;
  return fallback;
}

const initialIdeas: Idea[] = [
  {
    id: "I-1001",
    title: "AI 就业教练",
    description: "面向高校学生的 AI 职业发展助手，帮助学生完成职业定位、简历优化、模拟面试、岗位匹配和求职计划制定。",
    stage: "路演 PPT",
    updatedAt: "11:05",
  },
  {
    id: "I-1002",
    title: "校园低碳积分平台",
    description: "用积分、任务和企业赞助激励学生参与低碳行为，沉淀校园 ESG 数据。",
    stage: "市场竞品",
    updatedAt: "10:18",
  },
];

const pptSlides = [
  ["项目愿景", "用 AI 降低学生求职准备门槛", "展示用户痛点与教学价值"],
  ["用户痛点", "缺少即时、个性化、低成本反馈", "三类用户画像对比"],
  ["解决方案", "简历、岗位、面试三位一体训练", "产品流程图"],
  ["市场机会", "高校就业服务正在数字化升级", "趋势与政策窗口"],
  ["竞品分析", "差异点在课程化训练与教师闭环", "竞品矩阵"],
  ["商业模式", "B2B2C 校园订阅 + 增值训练包", "收入模型图"],
  ["产品路径", "从简历反馈切入，扩展到模拟面试", "阶段路线图"],
  ["运营策略", "绑定就业指导中心和创业实践课程", "获客漏斗"],
  ["财务假设", "以试点验证续费和转化", "收入/成本假设表"],
  ["行动计划", "8 周完成 MVP 试点与数据复盘", "里程碑计划"],
];

function parseGeneratedPptSlides(content?: string) {
  if (!content) return pptSlides;
  const slides = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /第?\s*\d+\s*页|^\d+[.、)]/.test(line))
    .slice(0, 10)
    .map((line) => {
      const cleaned = line.replace(/^[-*\s]*/, "").replace(/^第?\s*\d+\s*页[：:｜|、.)]?\s*/, "").replace(/^\d+[.、)]\s*/, "");
      const parts = cleaned
        .split(/[｜|]/)
        .map((part) => part.trim())
        .filter(Boolean);
      return [parts[0] || cleaned.slice(0, 18) || "PPT 页面", parts[1] || parts[2] || "基于乐享知识库生成的页面观点", parts[2] || parts[3] || "图表与素材建议"];
    });
  return slides.length ? slides : pptSlides;
}

function inferKnowledgeCategory(name: string): KnowledgeCategory {
  const lower = name.toLowerCase();
  if (lower.includes("bp") || lower.includes("商业计划")) return "BP 模板";
  if (lower.includes("ppt") || lower.includes("路演")) return "PPT 模板";
  if (lower.includes("rubric") || lower.includes("评分")) return "评分标准";
  if (lower.includes("答辩") || lower.includes("问题")) return "答辩题库";
  if (lower.includes("视频") || lower.includes("分镜") || lower.includes("海报") || lower.includes("prompt")) return "多媒体模板";
  if (lower.includes("案例")) return "创业案例";
  return "教学大纲";
}

function matchesKnowledgeUploadSearch(asset: KnowledgeUpload, search: KnowledgeUploadSearch) {
  const category = asset.category || inferKnowledgeCategory(asset.name);
  const enabled = asset.enabled !== false;
  const keyword = search.keyword.trim().toLowerCase();
  const content = [asset.name, category, asset.fileType, asset.sizeLabel, asset.preview].join(" ").toLowerCase();
  return (
    (!keyword || content.includes(keyword)) &&
    (search.category === "ALL" || category === search.category) &&
    (search.status === "ALL" || (search.status === "enabled" ? enabled : !enabled))
  );
}

function normalizeStudentKnowledgeSelection(value: unknown): StudentKnowledgeSelection {
  if (!value || typeof value !== "object") return { categories: [], uploadIds: [] };
  const input = value as Partial<StudentKnowledgeSelection> & { selectedCategories?: KnowledgeCategory[] };
  const categories = Array.isArray(input.categories)
    ? input.categories.filter((item): item is KnowledgeCategory => typeof item === "string")
    : Array.isArray(input.selectedCategories)
      ? input.selectedCategories.filter((item): item is KnowledgeCategory => typeof item === "string")
      : [];
  const uploadIds = Array.isArray(input.uploadIds) ? input.uploadIds.filter((item): item is string => typeof item === "string") : [];
  return {
    categories: Array.from(new Set(categories)),
    uploadIds: Array.from(new Set(uploadIds)),
  };
}

function resolveSelectedKnowledgeSources(
  selection: StudentKnowledgeSelection,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  allowedCategories?: KnowledgeCategory[],
) {
  const allowedSet = allowedCategories?.length ? new Set(allowedCategories) : null;
  const categorySet = new Set(
    selection.categories.filter((category) => states[category] !== false && (!allowedSet || allowedSet.has(category))),
  );
  const selectedUploads = uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return (
      selection.uploadIds.includes(asset.id) &&
      asset.enabled !== false &&
      states[category] !== false &&
      (!allowedSet || allowedSet.has(category)) &&
      !categorySet.has(category)
    );
  });
  const categories = Array.from(categorySet);
  const categoryUploads = uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return asset.enabled !== false && categorySet.has(category) && (!allowedSet || allowedSet.has(category));
  });
  const uploadMap = new Map<string, KnowledgeUpload>();
  [...selectedUploads, ...categoryUploads].forEach((asset) => uploadMap.set(asset.id, asset));
  return { categories, uploads: Array.from(uploadMap.values()) };
}

function getKnowledgeUsageBlock(
  expertId: ExpertId,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  canCallKnowledge: boolean,
  selection: StudentKnowledgeSelection,
  allowedCategories?: KnowledgeCategory[],
): ResultBlock {
  const expertCategories = allowedCategories?.length ? allowedCategories : getExpertKnowledgeCategories(expertId);
  const resolved = resolveSelectedKnowledgeSources(selection, uploads, states, expertCategories);
  const categories = resolved.categories.filter((category) => expertCategories.includes(category));
  const selectedButUnavailable = selection.categories.filter(
    (category) => states[category] === false || !expertCategories.includes(category),
  );
  if (!canCallKnowledge) {
    return {
      title: "参考资料说明",
      items: [
        "这轮我先按课程内置范例帮你拆，不引用教师端知识库资料。",
        "当前账号没有“调用课程知识库”权限，管理员重新开启后，学生端会自动恢复参考资料。",
      ],
    };
  }
  if (categories.length === 0 && resolved.uploads.length === 0) {
    return {
      title: "参考资料说明",
      items: [
        selectedButUnavailable.length
          ? `你之前选的 ${selectedButUnavailable.join("、")} 当前没有开放给这个专家，我先按该专家允许的课程口径继续帮你推进。`
          : "你这轮没有选择该专家可用的知识库，我先按课程内置范例继续帮你推进。",
        `当前专家可调用：${expertCategories.map((category) => `${category}知识库`).join("、") || "暂无配置"}。`,
      ],
    };
  }
  const sourceItems = resolved.uploads.length
    ? resolved.uploads.slice(0, 6).map((asset) => `${asset.category || inferKnowledgeCategory(asset.name)}知识库：${asset.name}（${asset.sizeLabel}）`)
    : categories.map((category) => `${category}知识库：暂无教师上传资料，使用 Demo 内置课程模板口径。`);
  return {
    title: "我会参考这些资料",
    items: [
      categories.length
        ? `这轮先参考 ${categories.map((category) => `${category}知识库`).join("、")}，把回答收在课程作业能用的范围内。`
        : "这轮先参考你选中的具体材料，把回答收在课程作业能用的范围内。",
      ...sourceItems,
      selectedButUnavailable.length
        ? `另外，${selectedButUnavailable.join("、")} 当前不在该专家开放范围内，学生端不会引用。`
        : "我会把资料当作参考，不会写成系统调用日志。",
    ],
  };
}

function getKnowledgeSpecificBlocks(
  expertId: ExpertId,
  selection: StudentKnowledgeSelection,
  shouldOutput: boolean,
  uploads: KnowledgeUpload[] = [],
  states: KnowledgeBaseStates = {},
  allowedCategories?: KnowledgeCategory[],
): ResultBlock[] {
  const expertCategories = allowedCategories?.length ? allowedCategories : getExpertKnowledgeCategories(expertId);
  const resolved = resolveSelectedKnowledgeSources(selection, uploads, states, expertCategories);
  const selected =
    resolved.categories[0] ||
    (resolved.uploads[0] ? resolved.uploads[0].category || inferKnowledgeCategory(resolved.uploads[0].name) : undefined) ||
    expertCategories[0] ||
    getExpertKnowledgeCategories(expertId)[0];
  const selectedUploadNames = resolved.uploads.slice(0, 3).map((asset) => asset.name);
  const publicReferenceBlock: ResultBlock = {
    title: "外部公开资料参考",
    items: [
      "高校职业发展场景中，AI 工具常被用于简历反馈、模拟面试、岗位探索和职业路径建议；Demo 文案会把这些能力落到学生端任务，而不是只写“AI 生成”。",
      "创业教育场景中，BP 和路演材料通常要覆盖问题、目标用户、解决方案、市场、商业模式、财务假设、团队、风险和验证计划；因此最终 Word 会补齐这些章节。",
      "路演评审常追问商业可行性、客户为什么付费、数据安全、落地成本和试点指标；答辩和 PPT 内容会围绕这些问题提前准备。",
    ],
  };
  const map: Record<string, ResultBlock> = {
    教学大纲: {
      title: "按课程阶段补强",
      items: [
        "第 1-2 周：创意发散、目标用户访谈、问题场景归纳，交付《头脑风暴整理表》和《访谈问题清单》。",
        "第 3-4 周：项目定位、竞品对比、价值主张收敛，交付《产品定位说明》和《市场假设清单》。",
        "第 5-6 周：商业模式、BP、PPT 初稿，交付《商业模式画布》《BP 核心模块》和《10 页路演结构》。",
        "第 7-8 周：答辩模拟、教师审核、修改复盘，交付《答辩记录》《教师反馈闭环》和《优秀案例沉淀标签》。",
      ],
    },
    "BP 模板": {
      title: "BP 模板补强",
      items: [
        "执行摘要：一句话说明项目、第一用户、核心痛点、解决方案和首期试点目标。",
        "商业模式：先写清付费方，再写采购理由、交付包、定价假设、续费理由和成本边界。",
        "运营计划：用 8 周试点拆任务，指标包括活跃学生数、阶段成果数、教师审核数、退回修改数和优秀案例数。",
        "风险应对：至少覆盖内容质量、学生依赖、教师使用成本、数据安全、真实接口成本五类风险。",
      ],
    },
    "PPT 模板": {
      title: "PPT 模板补强",
      items: [
        "每页标题改成结论句，例如“学生缺的不是工具，而是连续反馈闭环”，不要只写“用户痛点”。",
        "10 页建议顺序：封面、课堂痛点、第一用户、解决方案、三端闭环、知识库与审核、商业模式、8 周试点、风险应对、下一步计划。",
        "每页都要配一类证据：访谈原话、课程流程、三端截图、试点指标、评分 Rubric 或风险矩阵。",
        "页脚保留评委追问提示，方便路演稿和答辩模拟承接。",
      ],
    },
    评分标准: {
      title: "评分标准补强",
      items: [
        "创新性：是否不是简单套壳通用 AI，而是结合课程模板、教师审核和成果沉淀形成闭环。",
        "可行性：是否说清第一用户、付费方、交付物、试点周期和资源投入。",
        "商业价值：是否能解释学院或课程组为什么愿意采购，以及采购后能看见哪些指标。",
        "表达质量：BP、PPT、路演稿和答辩回答是否能互相承接，避免每份材料口径不一致。",
      ],
    },
    创业案例: {
      title: "创业案例补强",
      items: [
        "参考同类教育科技项目的切入方式：先从一个高频教学节点切入，再扩展到课程全流程。",
        "本项目适合先切“创业实践课成果生成与审核”，不要一开始扩成所有职业服务场景。",
        "案例表达建议：用一个学生小组从讨论录音到 BP、PPT、答辩的完整路径证明价值。",
        "客户演示时重点讲试点样板，而不是讲远期大平台愿景。",
      ],
    },
    答辩题库: {
      title: "答辩题库补强",
      items: [
        "商业模式追问：谁付费？预算从哪里来？不采购会有什么损失？",
        "产品边界追问：和通用 AI、招聘平台、学校作业系统分别有什么不同？",
        "教学价值追问：老师为什么愿意用？学生为什么会持续用？学院能沉淀什么？",
        "风险追问：学生隐私、内容幻觉、教师审核压力、真实生成成本分别怎么处理？",
      ],
    },
    多媒体模板: {
      title: "多媒体模板补强",
      items: [
        "30 秒视频建议只讲一条主线：课堂讨论很乱，AI 帮学生成稿，老师审核修改，成果进入案例库。",
        "6 镜头结构：课堂讨论、学生输入、AI 输出、教师审核、答辩模拟、成果沉淀。",
        "海报文案避免夸张科技感，突出“从课堂创意到路演成果，让每一次实践都有反馈”。",
        "视觉 Prompt 保持高校商学院质感：深蓝、白、浅灰、金色点缀，真实课堂和产品界面结合。",
      ],
    },
  };
  const fallbackBlock: ResultBlock = {
    title: `${selected}知识库补强`,
    items: [
      `当前选择了${selected}知识库，系统会优先引用该目录下已启用资料。`,
      selectedUploadNames.length ? `本轮重点参考材料：${selectedUploadNames.join("、")}。` : "本轮未指定具体材料，优先使用目录下已启用资料。",
      "如果该目录暂无资料，Demo 会使用课程通用口径生成建议。",
      "建议先上传模板、案例或评分材料，让学生端回答更贴近课堂要求。",
    ],
  };
  const categoryBlock = map[selected] || fallbackBlock;
  const materialBlock =
    selectedUploadNames.length && map[selected]
      ? {
          title: "本轮指定材料",
          items: selectedUploadNames.map((name) => `优先参考：${name}`),
        }
      : null;
  return shouldOutput
    ? [publicReferenceBlock, categoryBlock, ...(materialBlock ? [materialBlock] : [])]
    : [categoryBlock, ...(materialBlock ? [materialBlock] : [])];
}

function buildPromptTemplateParts(
  expert: Expert,
  mode: ModelMode,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  selectedCategories: KnowledgeCategory[] = getExpertKnowledgeCategories(expert.id),
) {
  const activeCategories = selectedCategories.length ? selectedCategories : getExpertKnowledgeCategories(expert.id);
  const promptKnowledgeBases = getKnowledgeCatalogItems(activeCategories);
  const enabledKnowledgeCount = uploads.filter(
    (asset) =>
      asset.enabled !== false &&
      states[asset.category || inferKnowledgeCategory(asset.name)] &&
      activeCategories.includes(asset.category || inferKnowledgeCategory(asset.name)),
  ).length;
  const modeInstructions: Record<ModelMode, string> = {
    Auto: "自动判断输出深度，优先保证课堂演示节奏和结果完整性。",
    快速生成: "压缩分析过程，优先给出可直接复制的结构化结论。",
    深度分析: "增加商业判断、证据链、风险提示和教师审核口径。",
    多模态增强: "在文本结果之外补充 PPT、视频、海报或视觉素材的生成建议。",
  };
  const uploadedSkillBlock = expert.sourceSkillContent
    ? `

已上传并调试通过的专家 Skill：
- 来源文件：${expert.sourceSkillName || "未命名 Skill"}
- 上传来源：${expert.sourceSkillUploadedBy || "教师端/管理端"}
- 上传时间：${expert.sourceSkillUploadedAt || "当前演示"}

${expert.sourceSkillContent}`
    : "";
  const systemPrompt = expert.systemPrompt?.trim();
  const userPrompt = expert.userPrompt?.trim();
  return {
    system: systemPrompt || `角色：${expert.name}
定位：${expert.role}
适用场景：${expert.scenario}

技能匹配方式：系统根据学生提问自动匹配该专家下的技能，不再在学生输入框展示技能下拉。
覆盖技能：${expert.skills.map((skill) => `${skill.stage}/${skill.name}`).join("、")}

知识库引用规则：
${promptKnowledgeBases.map((base) => `- ${base.category}知识库：${base.description}`).join("\n")}
引用方式：优先使用已启用资料；如果某个知识库暂无教师上传资料，则使用 Demo 预置教学口径生成，但需要在结果中保持“知识来源标签”。

模式策略：${mode}
${modeInstructions[mode]}

输出要求：
1. 结合上海财经大学商学院创业实践课程场景，保持正式、教学导向、可审核。
2. 输出必须包含“生成摘要、关键建议、风险提醒、下一步动作”四类内容。
3. 如涉及阶段成果，需明确该成果可提交教师审核，并说明教师可重点看哪些判断依据。
4. 不出现底层供应商、真实模型名称或 token 信息。${uploadedSkillBlock}`,
    user: userPrompt || `学生输入变量：
- 当前创意：项目名称、目标用户、问题场景、已验证/待验证假设
- 历史上下文：同一创意下最近 5 轮对话、已生成的阶段成果、教师反馈意见
- 本轮输入：学生在聊天框提出的问题、上传文件摘要、语音转写摘要
- 当前专家字段：${expert.name} / ${expert.scenario}
- 可引用知识库：${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}
- 已启用资料数量：${enabledKnowledgeCount} 个；如为 0，则使用 Demo 内置教学口径并保留知识来源标签

生成任务：
请基于以上上下文，调用“${expert.name}”，由系统自动匹配技能，并按照“${mode}”模式输出结果。

组装规则：
1. 先判断学生当前处于哪个阶段节点，优先读取同一创意下与该节点相关的历史成果。
2. 从${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}中检索已启用资料，并把命中的资料转成“知识来源标签”。
3. ${mode === "快速生成" ? "只保留最关键的 3-4 条建议，避免长篇解释。" : mode === "深度分析" ? "补充证据链、风险边界、教师审核口径和下一轮修改任务。" : mode === "多模态增强" ? "除文本建议外，额外输出 PPT/视频/海报等多媒体承接建议。" : "根据输入完整度自动选择简版或深度版输出。"}
4. 输出必须能被学生直接复制到阶段成果中，并标明是否建议提交老师审核。
5. 如学生输入与当前技能不匹配，需要先温和纠偏，再给出可继续推进的结果。`,
    knowledgeBases: promptKnowledgeBases,
    enabledKnowledgeCount,
  };
}

const initialMessages: ChatMessage[] = [
  {
    id: "M-1001",
    ideaId: "I-1001",
    sender: "user",
    mode: "文本",
    content: "请把 AI 就业教练整理成 10 页路演 PPT。",
    createdAt: "11:05",
  },
  {
    id: "M-1002",
    ideaId: "I-1001",
    sender: "ai",
    expertId: "pitch",
    expertName: "路演 PPT 专家",
    skillName: "10 页 PPT 大纲",
    artifactType: "PPT",
    content: "已基于 BP 草稿生成路演结构，建议突出学校端付费价值和教学数据闭环。",
    blocks: buildBlocks("pitch", "10 页 PPT 大纲", "Auto"),
    createdAt: "11:06",
  },
];

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function nowDateTime() {
  return new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatSubmittedAt(value: string) {
  if (/\d{4}/.test(value)) return value;
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${today} ${value}`;
}

function getSubmittedDateKey(value: string) {
  const match = formatSubmittedAt(value).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function matchesTeacherReviewSearch(submission: Submission, search: TeacherReviewSearch) {
  const keyword = search.keyword.trim().toLowerCase();
  const submittedDate = getSubmittedDateKey(submission.submittedAt);
  const content = [
    submission.student,
    submission.group,
    submission.groupName || "",
    artifactLabels[submission.artifactType],
    submission.artifactTitle,
    submission.artifactSummary,
  ]
    .join(" ")
    .toLowerCase();
  return (
    (!keyword || content.includes(keyword)) &&
    (search.artifactType === "ALL" || submission.artifactType === search.artifactType) &&
    (search.status === "ALL" || submission.status === search.status) &&
    (!search.startDate || (!!submittedDate && submittedDate >= search.startDate)) &&
    (!search.endDate || (!!submittedDate && submittedDate <= search.endDate))
  );
}

function stableNumber(seed: string, min: number, max: number) {
  const total = Array.from(seed).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  return min + (total % (max - min + 1));
}

function getSubmissionStageIndex(submission: Submission) {
  return artifactStageIndex[submission.artifactType] ?? 0;
}

function buildRubricScores(submission: Submission): RubricScore[] {
  const base = submission.isExcellent
    ? 0.88
    : submission.status === "approved"
      ? 0.82
      : submission.status === "revision"
        ? 0.68
        : 0.76;
  return rubricDimensions.map(([name, description, weight], index) => {
    const jitter = (stableNumber(`${submission.id}-${name}`, -6, 6) / 100);
    const ratio = Math.min(0.95, Math.max(0.52, base + jitter - index * 0.006));
    const aiScore = Math.round(ratio * weight * 10) / 10;
    return { name, description, weight, aiScore, teacherScore: aiScore };
  });
}

function buildDiagnosisResult(submission: Submission): DiagnosisResult {
  const projectName = submission.groupName || submission.group || "当前项目";
  const typeLabel = artifactLabels[submission.artifactType];
  const isBusinessLike = ["BP", "PPT", "SCRIPT", "DEFENSE"].includes(submission.artifactType);
  const statusHint =
    submission.status === "revision"
      ? "本次成果已被退回，说明核心假设还需要补证据。"
      : submission.status === "approved"
        ? "本次成果已通过，后续重点是提升说服力和可复用性。"
        : "本次成果仍在待审核状态，适合先做 AI 预诊断后再人工点评。";
  return {
    problems: [
      `${typeLabel} 已形成基本结构，但“谁付费、为什么现在付费、如何验证”三件事还需要更明确。`,
      isBusinessLike
        ? "收入模型和成本结构有初步描述，但客单价、转化率、获客成本仍偏估算。"
        : "用户痛点和场景描述较清楚，但验证样本、访谈原话和替代方案比较还不够。",
      `${projectName} 的价值表述容易停留在功能层，建议改成可被教师审核的证据链。`,
    ],
    risks: [
      statusHint,
      "如果 PPT、BP 和答辩口径不一致，路演时容易被追问市场规模和商业可持续性。",
      "现有材料对合规、隐私或运营成本的边界说明不足，正式试点前需补一页风险控制。",
    ],
    questions: [
      "如果第一批 100 个真实用户明天就来，最先卡住的是获客、交付还是售后？",
      "客单价下调 30% 后，项目是否仍成立？哪个成本项最需要重新测算？",
      "为什么是这个学生团队适合做，而不是已有平台顺手扩展这个功能？",
    ],
    tasks: [
      "补充至少 8-10 条目标用户访谈或问卷证据，标明样本来源和关键结论。",
      "把收入、成本、转化率、留存四个指标做成一页假设表，并给出验证方式。",
      "统一 BP、PPT、路演稿中的项目定位句，避免三个材料各讲一套。",
    ],
  };
}

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function appendVoiceText(baseText: string, voiceText: string) {
  const base = baseText.trim();
  const transcript = voiceText.trim();
  if (!base) return transcript;
  if (!transcript) return base;
  return `${base}\n${transcript}`;
}

function useSpeechInput(options: { value: string; onChange: (value: string) => void; fallbackText: string }) {
  const [isListening, setIsListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Recognition = getSpeechRecognitionConstructor();
    baseTextRef.current = options.value;

    if (!Recognition) {
      options.onChange(appendVoiceText(options.value, options.fallbackText));
      setHasVoiceInput(true);
      setNotice("当前浏览器不支持实时语音识别，已填入一段演示语音内容。建议使用 Chrome 或 Edge 演示。");
      return;
    }

    const recognition = new Recognition();
    let latestTranscript = "";
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setNotice("正在听写，请直接说出你的想法。");
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
      }
      latestTranscript = transcript.trim();
      if (latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, latestTranscript));
        setHasVoiceInput(true);
        setNotice("正在识别：" + latestTranscript);
      }
    };
    recognition.onerror = (event) => {
      const reason = event.error === "not-allowed" ? "请允许浏览器使用麦克风后再试。" : event.message || "请检查麦克风或浏览器权限。";
      if (!latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, options.fallbackText));
        setHasVoiceInput(true);
      }
      setNotice("语音识别失败：" + reason + " 已填入一段演示语音内容，方便继续演示。");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (!latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, options.fallbackText));
        setHasVoiceInput(true);
        setNotice("语音已整理成文字，可继续编辑或直接发送。");
        return;
      }
      setNotice("语音已转成文字，可继续编辑或发送。");
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      options.onChange(appendVoiceText(options.value, options.fallbackText));
      setHasVoiceInput(true);
      setNotice("语音识别启动受限，已填入一段演示语音内容。");
    }
  }

  function toggle() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setNotice("语音听写已停止，正在整理识别文本。");
      return;
    }
    start();
  }

  function resetVoiceInput() {
    setHasVoiceInput(false);
    setNotice("");
  }

  return { hasVoiceInput, isListening, notice, resetVoiceInput, toggle };
}

function readStored<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getArtifactType(expertId: ExpertId): ArtifactType {
  if (expertId === "brainstorm") return "BRAINSTORM";
  if (expertId === "positioning") return "POSITIONING";
  if (expertId === "market") return "MARKET";
  if (expertId === "business") return "BP";
  if (expertId === "pitch") return "PPT";
  if (expertId === "script") return "SCRIPT";
  if (expertId === "defense") return "DEFENSE";
  return "MEDIA";
}

function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === "string" && value in artifactLabels;
}

function getScenarioPrompt(expertId: ExpertId, idea: Idea): string {
  const project = `我们小组正在做《${idea.title}》：${idea.description}`;
  const expert = experts.find((item) => item.id === expertId);
  const prompts: Partial<Record<ExpertId, string>> = {
    brainstorm: `${project}
我们在上财商学院《创业实践》课上刚完成小组讨论，现在有点乱。你先别直接写完整方案，先帮我把几个可能方向捋出来，顺便标出目标用户和可能痛点。`,
    positioning: `${project}
老师可能会问我们这个项目到底解决谁的问题、为什么不用通用 AI。你先帮我把第一用户、价值主张和差异化拆清楚，最后再整理成可以放进定位文档的内容。`,
    market: `${project}
我们还没想清楚竞品应该怎么比。你从商学院创业项目评审的角度，先帮我判断通用 AI、招聘平台工具、高校就业系统这些替代方案分别强在哪里，我们应该怎么切入。`,
    business: `${project}
这个商业模式我还没想清楚。你不要一次性帮我写完整 BP，先帮我把谁付费、为什么付费、交付物是什么、怎么验证有效这几块拆清楚，最后再收成 BP 模块。`,
    pitch: `${project}
我们准备做路演 PPT，但现在材料比较散。你帮我把它拆成 10 页，每页先给一句核心观点，再补图表建议和老师可能追问的问题。`,
    script: `${project}
我们已经有 BP 和 PPT 了，但不知道路演时怎么讲。你帮我准备 1 分钟、3 分钟、5 分钟三个版本，语气像真实答辩，不要太像模板。`,
    defense: `${project}
我想先练一轮创业实践课答辩。题目重点放在商业模式、学校为什么买、老师审核有什么价值、数据安全这几块。`,
    media: `${project}
我们还需要做一点展示物料，比如短视频脚本、海报文案和视觉提示词。你帮我先按课程路演场景整理一版，不要做成泛泛的产品广告。`,
  };
  return prompts[expertId] || `${project}
请调用${expert?.name || "自定义专家"}，先根据上财商学院《创业实践》课的要求，把当前问题拆成目标、关键判断、可验证任务和可提交成果四块。`;
}

function getExpertShortName(expertId: ExpertId) {
  const map: Partial<Record<ExpertId, string>> = {
    brainstorm: "头脑风暴",
    positioning: "项目定位",
    market: "市场竞品",
    business: "商业计划书",
    pitch: "路演 PPT",
    script: "路演稿",
    defense: "答辩模拟",
    media: "多媒体物料",
  };
  return map[expertId] || experts.find((expert) => expert.id === expertId)?.name || "自定义专家";
}

function quickModeItems(expertId: ExpertId, skillName: string) {
  const expertName = getExpertShortName(expertId);
  return [
    `课堂可用结论：本次先输出《${skillName}》的最小可提交版本，重点让小组快速进入下一轮修改。`,
    `立即执行动作：保留 1 个核心判断、2 个验证问题和 3 条下一步任务，避免现场讨论被长文本拖慢。`,
    `提交建议：若要给老师审核，可先提交快速版，再根据老师意见补充数据、案例和图表。`,
    `适用场景：${expertName}阶段的课堂即时演示、小组讨论纪要整理和 5 分钟内的阶段成果确认。`,
  ];
}

function deepModeItems(expertId: ExpertId, skillName: string) {
  const map: Partial<Record<ExpertId, string[]>> = {
    brainstorm: [
      "验证指标：至少完成 8 名目标学生访谈，并记录痛点出现频次、原话证据和可转化功能点。",
      "教师审核关注：创意是否来自真实课堂问题，任务清单是否能在一周内被学生小组执行。",
      "风险提醒：如果只停留在工具功能罗列，容易偏离创业实践课对用户、价值和验证的要求。",
    ],
    positioning: [
      "验证指标：一句话定位需要被 3 类用户听懂，包括学生、任课教师和学院管理者。",
      "教师审核关注：价值主张是否聚焦商学院创业实践教学，而不是泛化成普通 AI 求职工具。",
      "风险提醒：定位过宽会导致 BP、PPT 和答辩时无法形成清晰的付费方与使用场景。",
    ],
    market: [
      "验证指标：至少对比 3 类替代方案，包括通用 AI、招聘平台工具和高校就业管理系统。",
      "教师审核关注：竞品分析是否围绕课程试点、教师审核、成果沉淀三个差异化维度展开。",
      "风险提醒：若只比较功能清单，难以证明本项目在教学场景中的必要性。",
    ],
    business: [
      "验证指标：明确试点采购方、预算来源、使用频率和续费理由，避免只写概念性商业模式。",
      "教师审核关注：收入假设是否与 50 名学生、10 个小组、8 周试点数据对应。",
      "风险提醒：如果缺少付费方和交付边界，BP 会被质疑商业闭环不成立。",
    ],
    pitch: [
      "验证指标：每一页 PPT 都要能对应一个评审问题，并能用案例、数据或流程截图支撑。",
      "教师审核关注：路演是否先讲教学痛点，再讲平台闭环，最后讲试点成效和推广路径。",
      "风险提醒：页面过多展示功能会削弱商业价值表达，需要突出师生协同和成果沉淀。",
    ],
    script: [
      "验证指标：1/3/5 分钟版本都应覆盖痛点、方案、教学价值、商业模式和试点指标。",
      "教师审核关注：讲稿是否能承接 PPT 页面，是否避免逐字念稿，是否能自然回答评委追问。",
      "风险提醒：如果讲稿只复述功能，会削弱路演感染力，需要突出课堂场景和成果闭环。",
    ],
    defense: [
      "验证指标：答辩稿需覆盖用户、场景、商业模式、教学价值和风险应对五类高频追问。",
      "教师审核关注：回答是否有证据链，而不是只复述平台功能。",
      "风险提醒：如果无法说明为什么学校愿意采购，答辩容易被追问到商业可行性。",
    ],
    media: [
      "验证指标：视频脚本和海报文案需要让客户在 30 秒内看懂学生端、教师端和管理端闭环。",
      "教师审核关注：物料是否服务课程汇报，而不是做成泛泛的产品广告。",
      "风险提醒：视觉表达过度炫酷会削弱高校场景可信度，应保持上财商学院的正式质感。",
    ],
  };
  return [
    `深度分析对象：《${skillName}》将作为正式阶段成果来打磨。`,
    ...(map[expertId] || [
      "验证指标：至少补齐目标用户、使用场景、证据来源和下一步任务，避免只停留在概念描述。",
      "教师审核关注：输出内容是否能支撑课堂阶段推进，是否能形成可提交、可修改、可复盘的成果。",
      "风险提醒：如果缺少知识库引用和验证任务，后续 BP、PPT 或答辩环节会缺少依据。",
    ]),
  ];
}

function multimodalModeItems(expertId: ExpertId, skillName: string) {
  const map: Partial<Record<ExpertId, string[]>> = {
    brainstorm: [
      "PPT 呈现：用一页四象限展示目标用户、痛点、假设和下周任务。",
      "图表建议：把访谈对象、痛点频次和任务负责人做成小组任务看板。",
      "视频衔接：可作为宣传片开场，呈现学生从零散讨论进入 AI 整理的过程。",
    ],
    positioning: [
      "PPT 呈现：用一句话定位、三类用户画像、差异化坐标图形成产品定位说明页。",
      "图表建议：使用“学生价值-教师价值-学院价值”三栏对照。",
      "下载文档：产品定位说明大纲应直接承接后续 BP 第一章和路演开场。",
    ],
    market: [
      "PPT 呈现：用竞品雷达图或对比矩阵展示通用 AI、招聘平台、高校系统的差异。",
      "图表建议：横轴为教学闭环程度，纵轴为个性化训练能力。",
      "视频衔接：可用 5 秒镜头表现替代方案分散、平台统一闭环的对比。",
    ],
    business: [
      "PPT 呈现：把商业模式画布压缩成付费方、核心价值、交付包、续费理由四块。",
      "图表建议：用 8 周试点漏斗展示学生使用、教师审核、成果沉淀的转化链路。",
      "下载文档：BP Word 应保留财务假设、风险应对和试点指标，便于老师批注。",
    ],
    pitch: [
      "PPT 呈现：每页固定为标题、核心观点、图表建议、演讲提示四段，便于直接路演。",
      "图表建议：优先使用流程图、闭环图、试点数据卡片和成果库截图式表达。",
      "视频衔接：路演 PPT 可作为 30 秒宣传视频的镜头脚本基础。",
    ],
    script: [
      "PPT 衔接：每段讲稿需要标注对应 PPT 页码，方便学生路演时按页讲述。",
      "音频衔接：可作为答辩模拟的口播底稿，后续由 AI 评委围绕其中的论点追问。",
      "视频衔接：3 分钟讲稿可以拆成 30 秒宣传视频旁白和分镜脚本。",
    ],
    defense: [
      "PPT 呈现：把评委追问分成商业可行性、教学价值、数据安全、落地成本四组。",
      "图表建议：用问题卡片加回答要点的方式做答辩备忘页。",
      "音频衔接：答辩练习可以保存语音记录，作为老师指导和学生复盘依据。",
    ],
    media: [
      "PPT 呈现：直接输出视频脚本、6 镜头分镜、海报文案和视觉 Prompt 四块。",
      "图表建议：用时间轴展示 0-30 秒视频节奏，用卡片展示主标题、副标题和 CTA。",
      "下载物料：视频和 PPT 使用固定演示附件，Prompt 文案用于解释后续真实生成能力。",
    ],
  };
  return [
    `多模态增强对象：《${skillName}》将同时面向文档、PPT、视频或海报展示。`,
    ...(map[expertId] || [
      "PPT 呈现：把核心结论整理成标题、观点、依据和下一步动作四段。",
      "图表建议：优先使用流程图、对比表或任务看板，便于课堂汇报和教师审核。",
      "下载文档：输出内容需要保留知识来源标签，方便后续形成 Word、PPT 或复盘材料。",
    ]),
  ];
}

function applyModeVariant(blocks: ResultBlock[], mode: ModelMode, expertId: ExpertId, skillName: string): ResultBlock[] {
  const baseBlocks = blocks.filter((block) => !block.title.startsWith("生成模式"));
  if (mode === "Auto") return baseBlocks;
  if (mode === "快速生成") {
    const compactBlocks = baseBlocks.map((block) => ({
      title: `${block.title}（快速版）`,
      items: block.items.slice(0, 2),
    }));
    return [
      { title: `快速版行动清单：${skillName}`, items: quickModeItems(expertId, skillName) },
      ...compactBlocks,
    ];
  }
  if (mode === "深度分析") {
    return [
      ...baseBlocks,
      { title: `深度分析补充：${skillName}`, items: deepModeItems(expertId, skillName) },
    ];
  }
  return [
    ...baseBlocks,
    { title: `多模态展示建议：${skillName}`, items: multimodalModeItems(expertId, skillName) },
  ];
}

type GuidedTurn = {
  prompt: string;
  reply: string;
  finalTitle?: string;
  finalIntro?: string;
};

function getGuidedTurns(expertId: ExpertId, idea: Idea): GuidedTurn[] {
  const project = `我们小组正在做《${idea.title}》`;
  const map: Record<ExpertId, GuidedTurn[]> = {
    brainstorm: [
      {
        prompt: `${project}。我们刚讨论完，有点乱。你先别直接写方案，先帮我把可能方向捋出来。`,
        reply: "我先帮你捋一下。你们现在其实有三条线：一条是帮学生找清楚职业方向，一条是把简历和岗位要求对上，还有一条是做面试/答辩陪练。先别急着都做，最好先选一个最容易验证的用户。",
      },
      {
        prompt: "第一批用户先想定成大三大四正在找实习的商学院学生。他们最明显的卡点可能是职业定位、简历表达和面试准备。",
        reply: "这个范围比“所有学生”靠谱多了。下一步要把场景说细：他们到底在哪一刻最痛？是选方向时没头绪，改简历时说不清经历，还是面试和路演时被问住？你们最好先挑一个最明显的场景。",
      },
      {
        prompt: "这几个场景里，我们现在能拿到的证据是学生访谈原话、几份简历修改前后对比，还有老师对路演表达的反馈。",
        reply: "这里老师大概率不会只听概念，他会问你们怎么知道这是真痛点。你们可以先准备几条学生原话，再拿一两份修改前后的材料做对比。如果这些证据有了，我就能帮你收成一版阶段成果。",
      },
      {
        prompt: "我确认先按这些信息生成阶段成果，请输出头脑风暴整理表、痛点场景和待验证任务清单。",
        reply: "可以，信息够了。我现在把它整理成一版能提交的阶段成果，重点放在创意方向、目标用户、痛点场景和下周怎么验证。",
        finalTitle: "整理成阶段成果",
        finalIntro: "这份内容已经能形成阶段成果，但还缺两类证据：用户原话和老师评分口径。",
      },
    ],
    market: [
      {
        prompt: `${project}。我们还没想清楚竞品怎么比，你先帮我把替代方案捋一下。`,
        reply: "先别急着列一堆竞品。你们可以把替代方案分成三类：通用 AI、招聘平台工具、校内就业或教学系统。这样评委比较容易听懂你们不是在和所有工具竞争。",
      },
      {
        prompt: "我们先把通用 AI、招聘平台、高校就业系统作为替代方案。比较维度想放在课程适配、教师审核、成果沉淀和数据闭环。",
        reply: "比较维度可以围绕课程适配、教师审核、成果沉淀和数据闭环来做。别只比功能清单，那样会很像普通产品介绍。",
      },
      {
        prompt: "我想按课程适配、教师审核、成果沉淀和数据闭环比较，再把差异化收紧成能放进 PPT 的一句话。",
        reply: "差异化可以落在一句话：通用 AI 解决生成，招聘平台解决岗位，校内系统解决管理，但你们想解决的是创业实践课从讨论到成果的闭环。",
      },
      {
        prompt: "我确认按这些维度生成市场竞品成果，请输出市场机会、竞品矩阵和进入策略。",
        reply: "可以，我把市场机会、替代方案对比和早期进入策略整理成一版能放进 BP/PPT 的内容。",
        finalTitle: "形成市场竞品成果",
        finalIntro: "这版会先服务课程演示，不会把市场空间写得过大。",
      },
    ],
    positioning: [
      {
        prompt: `${project}。老师可能会问我们到底解决谁的问题，你先帮我把第一用户收窄。`,
        reply: "先别写“服务所有商学院学生”，这个太宽。可以先锁定一类人：正在上创业实践课、又要准备求职表达的学生。接下来真正会被问的是：他们为什么不用通用 AI 就好了？",
      },
      {
        prompt: "第一用户先定为参加创业实践课、同时准备求职的商学院学生。我们需要把它和通用 AI 的差异说清楚。",
        reply: "这个差异要说得硬一点。通用 AI 当然能聊，但它不跟课程模板、评分标准、老师审核和成果沉淀连在一起。你们不是在说“我也能生成”，而是在说“生成以后还能进入课程闭环”。",
      },
      {
        prompt: "通用 AI 缺少课程模板、教师审核和成果沉淀。我想把学校、老师、学生三方价值拆开写。",
        reply: "三方价值可以这么讲：学生少走弯路，老师少改重复初稿，学校能沉淀课程数据和优秀案例。这样后面的 BP 和 PPT 就不会散。你确认后，我就按这个口径整理定位文档。",
      },
      {
        prompt: "我确认按这个方向生成定位文档，请输出产品定位说明、差异化表达和待验证市场假设。",
        reply: "可以，我会按同一套口径整理定位说明，后续 BP、PPT 和答辩都沿用这套表达。",
        finalTitle: "形成定位文档",
        finalIntro: "现在可以收成标准文档了。后续 BP 和 PPT 都要沿用同一套定位，不要每个材料换一套说法。",
      },
    ],
    business: [
      {
        prompt: `${project}。这个商业模式我还没想清楚。先帮我把付费方、采购理由、交付物和试点指标拆开，不要直接写完整 BP。`,
        reply: "商业模式先别铺太大，先问最朴素的一句：谁付钱？如果付费方说不清，后面的收入模式都会飘。课程组、学院、就业指导中心都可能，但最好先抓一个主付费方。",
      },
      {
        prompt: "付费方我先想定成学院或创业实践课程组。他们愿意付费的理由应该落在成果质量、教师效率和案例沉淀上。",
        reply: "学校不会因为“有 AI”就买。你得说它买完能看见什么变化：学生成果更像样，老师少改重复初稿，课程能沉淀案例，还有一组能汇报的试点数据。下一步就要讲清楚交付物。",
      },
      {
        prompt: "具体交付物我想写成学生工作台、教师审核中心、课程知识库、运营看板，再加初始化模板和老师培训。",
        reply: "交付物别只写“一个平台”，客户会觉得空。更像一个采购包的是：学生工作台、教师审核中心、课程知识库、运营看板，再加初始化模板和老师培训。这样 BP 才能落地。",
      },
      {
        prompt: "我确认生成 BP 核心模块，请补收入模式、成本假设、交付包和 8 周试点指标。",
        reply: "可以，我会把付费方、采购理由、交付物和试点指标整理进 BP 模块，避免只写概念。",
        finalTitle: "收成 BP 模块",
        finalIntro: "现在可以把商业模式收口成 BP 模块了。最重要的是把 8 周试点指标写清楚。",
      },
    ],
    pitch: [
      {
        prompt: `${project}。我们准备做路演 PPT，但材料比较散。你先帮我定主线，不要直接堆 10 页。`,
        reply: "PPT 先别急着排 10 页。我会先帮你把主线抓住：课堂里为什么痛、你们怎么把学生端和老师端连起来、最后学校为什么值得试。不要一上来讲功能，评委很容易听散。",
      },
      {
        prompt: "这次路演主要想打动创业实践课老师和学院试点负责人。页序最好先讲课堂痛点，再讲三端闭环，最后讲商业模式和试点。",
        reply: "页序可以这样走：先让老师看到课堂痛点，再讲第一用户和解决方案，然后展示学生端、教师端、管理端怎么闭环，最后再讲商业模式和 8 周试点。每页标题尽量写成一句结论，不要像目录。",
      },
      {
        prompt: "结构先按痛点、三端闭环、商业模式和试点数据来走。每页还需要补图表证据，避免只讲概念。",
        reply: "现在差的是证据感。比如痛点页放学生原话，闭环页放三端流程图，试点页放 8 周指标，风险页放风险矩阵。这样 PPT 不会像空讲概念。你确认后，我就收成 10 页大纲。",
      },
      {
        prompt: "我确认生成 10 页 PPT 大纲，请每页都给核心观点、图表建议和评委追问。",
        reply: "可以，我按这个逻辑生成。每页我都会给一句核心观点，再配图表建议和评委可能追问的问题。",
        finalTitle: "收成 PPT 大纲",
        finalIntro: "现在可以收成 10 页路演 PPT 了。结构要服务讲述，不要把 Word 内容直接贴到页面上。",
      },
    ],
    script: [
      {
        prompt: `${project}。我们已经有 BP 和 PPT 了，但不知道路演时怎么讲。你先帮我判断讲给谁听。`,
        reply: "讲稿不能只是把 PPT 念一遍。你先想清楚听众：如果是课堂展示，就讲教学价值；如果是试点演示，就讲学校为什么愿意买。这个定了，后面 1 分钟、3 分钟、5 分钟才好拆。",
      },
      {
        prompt: "这次是课堂展示加试点演示。1 分钟版本先讲痛点和方案，3 分钟讲完整闭环，5 分钟再补商业模式和试点指标。",
        reply: "1 分钟版本只讲痛点和方案，3 分钟版本讲完整闭环，5 分钟版本再展开商业模式和试点指标。时间越短，越不能堆功能，要先让别人听懂为什么值得试。",
      },
      {
        prompt: "短版讲痛点和方案，长版补商业模式和试点指标。转场话术要自然一点，不要像在念目录。",
        reply: "转场最好带一点预判。比如讲完商业模式，你可以顺一句：如果老师关心谁来付费，我们先按课程组或学院采购来验证。这样听起来不像硬切下一页。",
      },
      {
        prompt: "我确认生成路演稿，请输出 1 分钟、3 分钟、5 分钟版本和转场话术。",
        reply: "可以，我会写得像学生现场能讲出来的话，不做成那种一看就是模板的稿子。",
        finalTitle: "收成路演稿",
        finalIntro: "现在可以生成 1/3/5 分钟版本了。语气会尽量像学生真实路演，而不是模板文案。",
      },
    ],
    defense: [
      {
        prompt: `${project}。我想先练一个最可能被评委问到的问题，重点放在学校为什么愿意买。`,
        reply: "我会先问：学校为什么要为这个平台付费，而不是让学生自己用通用 AI？这个问题要答清楚，否则商业模式很容易被打回来。",
      },
      {
        prompt: "我先练学校为什么愿意买这个问题，回答里想放就业质量、教师效率和成果沉淀三点。",
        reply: "那我会继续追：采购后谁使用、谁维护、谁看数据？如果这些角色说不清，客户会觉得落地成本不明。",
      },
      {
        prompt: "下一轮我想练数据安全和学生依赖 AI 的问题，这两块现场很可能被问到。",
        reply: "数据安全要说权限、脱敏和留痕；学生依赖 AI 要说教师审核和修改记录。不要回避这两个问题，主动讲反而更可信。",
      },
      {
        prompt: "我确认生成答辩复盘，请整理高频追问、回答方向和改进建议。",
        reply: "可以，我把刚才这几类追问整理成答辩复盘，方便你们后面继续练。",
        finalTitle: "形成答辩复盘",
        finalIntro: "这版复盘会重点围绕商业模式、采购理由、教师价值和数据安全。",
      },
    ],
    media: [
      {
        prompt: `${project}。我们还需要展示物料，你先帮我判断视频和海报应该服务哪个场景。`,
        reply: "多媒体物料别做成广告片。它最好服务路演开场：30 秒让别人看懂“课堂讨论很乱、AI 帮学生成稿、老师审核修改、最后沉淀成案例”。这条线就够了。",
      },
      {
        prompt: "这套物料主要用于课程路演开场。30 秒视频可以从课堂讨论、AI 工作台、成果生成、教师审核、答辩模拟、成果沉淀这条线走。",
        reply: "视频可以拆 6 个镜头：课堂讨论、学生输入、成果生成、教师审核、答辩模拟、成果沉淀。每个镜头只讲一个点，字幕短一点，不要把 BP 里的长句搬进去。",
      },
      {
        prompt: "视频按课堂讨论、AI 工作台、成果生成、教师审核、答辩模拟、成果沉淀走。海报和视觉 Prompt 也要贴近高校课堂场景。",
        reply: "海报别太赛博，不然会不像高校项目。画面里最好有课堂、小组讨论、AI 工作台、教师审核和成果沉淀，这样客户不用听解释也能看懂闭环。",
      },
      {
        prompt: "我确认生成多媒体物料包，请输出 30 秒视频脚本、分镜、海报文案和视觉 Prompt。",
        reply: "可以，我把视频脚本、分镜、海报文案和视觉 Prompt 一起整理出来。视频预览会单独等一会儿，像真的在渲染。",
        finalTitle: "收成物料包",
        finalIntro: "现在可以收成一套物料包。",
      },
    ],
  };
  return map[expertId] || map.brainstorm;
}

function guidedConversationBlocks(expertId: ExpertId, idea: Idea, round: number): ResultBlock[] {
  const turn = getGuidedTurns(expertId, idea)[round - 1] || getGuidedTurns(expertId, idea)[0];
  return [
    {
      title: turn.finalTitle || "确认后生成",
      items: [turn.finalIntro || turn.reply],
    },
  ];
}

function guidedConversationText(expertId: ExpertId, idea: Idea, round: number) {
  const turn = getGuidedTurns(expertId, idea)[round - 1] || getGuidedTurns(expertId, idea)[0];
  return turn.reply;
}

const expertDialogueRoundCount = 4;

function getExpertDialogueRound(messages: ChatMessage[], ideaId: string, expertId: ExpertId) {
  const completedRounds = messages.filter(
    (message) => message.ideaId === ideaId && message.sender === "ai" && message.expertId === expertId,
  ).length;
  return (completedRounds % expertDialogueRoundCount) + 1;
}

function shouldOutputStageResult(expertId: ExpertId, round: number) {
  return isStudentExpertId(expertId) ? round === expertDialogueRoundCount : true;
}

function getNextRoundPrompt(expertId: ExpertId, idea: Idea, nextRound: number) {
  const turn = getGuidedTurns(expertId, idea)[nextRound - 1] || getGuidedTurns(expertId, idea)[0];
  return turn.prompt;
}

function getChatStarterPrompts(expertId: ExpertId, idea: Idea, nextRound: number) {
  const expertName = getExpertShortName(expertId);
  return [
    {
      label: `先和${expertName}聊一轮`,
      prompt: getNextRoundPrompt(expertId, idea, nextRound),
    },
    {
      label: "梳理目标用户和痛点",
      prompt: `我们小组正在做《${idea.title}》，请先帮我把目标用户、真实痛点、使用场景和需要验证的假设拆清楚。`,
    },
    {
      label: "按课堂要求补信息",
      prompt: `请按上财商学院《创业实践》课的要求，帮我判断《${idea.title}》现在最缺哪些信息，先列出下一步要补的材料。`,
    },
    {
      label: "准备提交老师审核",
      prompt: `如果后面要把《${idea.title}》提交给老师审核，请告诉我这一阶段应该形成什么成果，以及老师可能会重点看什么。`,
    },
  ];
}

function getChatGenerationDelay(expertId: ExpertId, shouldOutput: boolean) {
  if (shouldOutput && expertId === "pitch") return 10500;
  if (shouldOutput && expertId === "media") return 9000;
  if (shouldOutput && (expertId === "business" || expertId === "positioning" || expertId === "script")) return 3600;
  return 1800;
}

function getGenerationLoadingCopy(expertId: ExpertId, shouldOutput: boolean) {
  if (shouldOutput && expertId === "pitch") {
    return {
      title: "正在整理 BP、课程模板和 PPT 页序",
      detail: "这一步会慢一点，先把 10 页结构和评委追问对齐。",
    };
  }
  if (shouldOutput && expertId === "media") {
    return {
      title: "正在拆视频脚本、分镜和视觉提示词",
      detail: "Demo 会刻意等待几秒，让生成过程更接近真实多媒体任务。",
    };
  }
  if (expertId === "business") {
    return {
      title: "正在推敲付费方、交付物和试点指标",
      detail: "先把商业闭环问清楚，再输出可以放进 BP 的内容。",
    };
  }
  return {
    title: "正在结合对话和课程资料思考",
    detail: "我会先追问关键信息，信息够了再收成阶段成果。",
  };
}

function skillBlocks(expertId: ExpertId, skillName: string): ResultBlock[] | null {
  if (expertId === "brainstorm") {
    if (skillName === "创意整理") {
      return [
        {
          title: "头脑风暴核心创意整理表",
          items: [
            "项目主张：AI 就业教练不是单点简历工具，而是面向商学院学生的职业发展与创业实践训练平台。",
            "创意来源：课堂讨论中发现学生求职、BP、PPT 和答辩准备常常分散在不同工具中，缺少统一闭环。",
            "可发展方向：职业定位、简历优化、岗位匹配、模拟面试、创业项目 BP、路演 PPT、教师审核反馈。",
          ],
        },
        {
          title: "课堂讨论归纳",
          items: [
            "学生侧关键词：不知道怎么定位、简历表达不专业、面试缺少追问训练、BP 和 PPT 不会结构化。",
            "教师侧关键词：批量点评压力大、过程记录难追踪、优秀成果难沉淀、共性问题难统计。",
            "学院侧关键词：就业质量、创新创业课程建设、数字化教学成果、案例库沉淀。",
          ],
        },
      ];
    }
    if (skillName === "痛点识别") {
      return [
        {
          title: "目标用户痛点识别",
          items: [
            "痛点 1：学生对目标岗位和自身能力之间的差距缺少清晰判断，容易停留在泛泛修改简历。",
            "痛点 2：学生能讲项目经历，但难以用商业语言表达市场、用户、价值和结果。",
            "痛点 3：教师很难在短时间内逐一查看学生讨论、修改和答辩准备过程。",
          ],
        },
        {
          title: "痛点优先级判断",
          items: [
            "高优先级：职业定位与表达结构，因为它直接影响简历、面试和路演质量。",
            "中优先级：岗位匹配与行业训练包，因为它需要更多真实岗位和案例库支持。",
            "低优先级：自动投递和招聘流程管理，本项目阶段不建议展开，避免偏离创业实践教学主线。",
          ],
        },
      ];
    }
    if (skillName === "任务清单生成") {
      return [
        {
          title: "待验证任务清单",
          items: [
            "任务 1：访谈 8 名商学院学生，确认他们最需要的训练环节是定位、简历、面试还是路演表达。",
            "任务 2：收集 5 份岗位 JD，测试系统能否拆解岗位能力并映射到学生经历。",
            "任务 3：请 2 位教师评估 AI 生成的 BP/PPT/答辩建议是否符合课程评分 Rubric。",
            "任务 4：选取 3 个小组试跑“创意-定位-BP-PPT-答辩”链路，记录完成时间和卡点。",
          ],
        },
        {
          title: "任务分工建议",
          items: [
            "产品同学：整理学生端聊天流程和阶段成果字段。",
            "调研同学：完成学生访谈、教师访谈和岗位 JD 收集。",
            "展示同学：准备 PPT、宣传视频和答辩稿，用于课程路演展示。",
          ],
        },
      ];
    }
  }

  if (expertId === "positioning") {
    if (skillName === "价值主张明确") {
      return [
        {
          title: "产品定位说明大纲 - 基本信息",
          items: [
            "项目名称：AI 就业教练。",
            "一句话定位：面向上财商学院学生的职业发展与创业实践训练平台，把职业定位、简历优化、岗位匹配、模拟面试、BP 路演和教师反馈整合为连续训练闭环。",
            "目标场景：创业实践课、就业指导课、职业发展工作坊、商科案例训练营。",
            "阶段成果：本说明大纲用于统一后续 BP、PPT、答辩稿和宣传物料的表达口径。",
          ],
        },
        {
          title: "核心价值主张",
          items: [
            "对学生：把原本零散的职业想法、课堂项目和实习经历转化为可提交、可修改、可路演的成果，降低从“想法”到“正式表达”的门槛。",
            "对教师：把重复性初稿点评交给 AI 预处理，教师集中处理方向纠偏、关键节点指导和优秀案例筛选。",
            "对学院：沉淀学生实践过程、教师点评数据、优秀项目案例和可汇报的数字化教学建设成果。",
            "对课程：将创意整理、定位说明、BP、PPT、答辩和复盘串成一条可演示的教学闭环。",
          ],
        },
        {
          title: "功能边界与验收指标",
          items: [
            "本阶段不承诺真实招聘投递，不做简历代投和岗位闭环交易，重点服务课程训练与成果产出。",
            "学生端核心功能：AI 对话生成阶段成果、上传录音/资料、下载 Word/PPT、提交老师审核、查看反馈并继续修改。",
            "教师端核心功能：查看提交成果、预览文件、通过或退回修改、标记优秀成果、上传教学资料。",
            "验收指标：8 周内至少形成 30 份阶段成果、10 份老师反馈、5 份优秀成果样例，学生能完成从创意到答辩的完整链路。",
          ],
        },
      ];
    }
    if (skillName === "多维用户画像") {
      return [
        {
          title: "目标用户画像",
          items: [
            "学生画像 A：大二/大三商学院学生，正在寻找实习方向，但不知道如何把课程项目、社团经历和竞赛成果转化为岗位匹配表达。",
            "学生画像 B：大四/研究生，准备秋招或春招，需要围绕金融、咨询、互联网产品、市场营销、商业分析等岗位进行简历和面试训练。",
            "课程小组画像：参加创业实践课，需要在 8 周内完成创意归纳、定位说明、商业计划书、路演 PPT、答辩模拟和宣传物料。",
            "教师画像：负责创业实践、就业指导或案例教学，需要看到学生生成过程、修改记录和最终成果，并快速识别共性问题。",
          ],
        },
        {
          title: "用户痛点与使用场景",
          items: [
            "痛点一：学生知道自己做过什么，但不知道如何用商业语言表达用户、市场、成果和证据。",
            "痛点二：教师点评往往集中在最终作业，难以及时看到学生中间过程和修改轨迹。",
            "痛点三：学院已有优秀案例和课程资料，但学生很难按统一模板复用。",
            "课前场景：学生上传讨论记录或录音，AI 整理创意、痛点和任务清单。",
            "课中场景：小组调用定位、BP、PPT 专家，形成阶段成果并提交教师审核。",
            "课后场景：学生根据教师反馈修改，优秀成果进入课程案例库。",
          ],
        },
      ];
    }
    if (skillName === "差异化表达") {
      return [
        {
          title: "差异化表达",
          items: [
            "区别于通用 AI：本平台不是简单聊天，而是围绕商学院课程模板、评分 Rubric 和教师审核构建。",
            "区别于招聘平台：本平台重点不是投递岗位，而是训练学生的商业表达、成果产出和答辩能力。",
            "区别于传统教学平台：本平台不只是收作业，而是记录 AI 建议、学生修改、教师反馈和优秀成果沉淀。",
          ],
        },
      ];
    }
  }

  if (expertId === "business") {
    if (skillName === "商业模式画布") {
      return [
        {
          title: "商业模式画布",
          items: [
            "客户细分：商学院、就业指导中心、创新创业课程组、职业发展课程负责人。",
            "价值主张：提升学生成果质量、降低教师重复点评成本、沉淀课程数字资产。",
            "渠道：先通过创业实践课试点，再扩展到就业指导、案例教学和职业发展课程。",
            "收入来源：学院年度订阅、行业训练包、案例库扩展包、答辩题库服务。",
          ],
        },
      ];
    }
    if (skillName === "BP 大纲") {
      return [
        {
          title: "商业计划书 BP 初稿 - 执行摘要",
          items: [
            "项目概述：AI 就业教练是一套面向商学院学生的职业发展与创业实践训练平台，帮助学生完成职业定位、简历优化、岗位匹配、模拟面试、BP 写作、路演 PPT 和答辩复盘。",
            "核心问题：学生端缺少持续反馈，教师端缺少过程监控，学院端缺少可沉淀、可复用、可评估的实践教学数据。",
            "解决方案：通过学生端 AI 创意工作台、教师端审核中心、管理员端知识库与提示词维护，形成“生成-审核-修改-沉淀”的教学闭环。",
            "目标客户：商学院创业实践课程组、就业指导中心、职业发展课程负责人、学院数字化教学建设部门。",
            "试点目标：在 50 名学生、10 个项目组、8 周周期内，验证学生成果质量提升、教师点评效率提升和优秀案例沉淀能力。",
          ],
        },
        {
          title: "问题背景与用户痛点",
          items: [
            "学生痛点：求职和创业表达高度依赖经验，学生往往能描述经历，但难以转化为岗位能力、市场洞察、商业模式和可量化成果。",
            "教师痛点：创业实践课成果类型多，包括讨论记录、BP、PPT、答辩和宣传物料，教师难以逐一跟踪生成过程和修改轨迹。",
            "学院痛点：课程建设需要可展示、可复盘、可沉淀的数据和案例，但传统作业系统只保留最终文件，缺少过程数据。",
            "现有替代方案不足：通用 AI 缺少课程模板和教师审核；招聘平台不服务教学闭环；校内管理系统缺少智能生成和个性化训练。",
          ],
        },
        {
          title: "解决方案与产品模块",
          items: [
            "学生端：采用类似 WorkBuddy 的 AI 对话界面，学生可选择专家、技能、模式，并上传录音或文件生成阶段成果。",
            "教师端：集中查看学生提交成果，预览 Word/PPT/视频，给出通过或退回修改意见，并标记优秀实践成果。",
            "管理员端：维护账号权限、知识库资料、专家提示词、模型调用看板和试点建设成效评估。",
            "知识库：按教学大纲、BP 模板、PPT 模板、评分标准、创业案例、答辩题库、多媒体模板分类管理。",
            "成果库：沉淀定位说明、BP、PPT、答辩记录和多媒体物料，形成下一届课程可参考的案例资产。",
          ],
        },
        {
          title: "商业模式与运营计划",
          items: [
            "商业模式：B2B2C，学院/课程组/就业中心采购平台服务，学生作为实际使用者。",
            "收入来源：年度平台订阅、课程建设包、行业岗位训练包、案例库扩展包、答辩题库服务。",
            "首期试点：围绕上财商学院创业实践课，完成 8 周课程 Demo 与销售演示，重点验证教学闭环而非真实 AI 接口。",
            "运营节奏：第 1-2 周完成创意和定位；第 3-5 周完成 BP 与 PPT；第 6-7 周完成答辩模拟和多媒体物料；第 8 周完成成果沉淀与复盘。",
            "关键指标：活跃学生数、生成成果数、提交审核数、退回修改数、优秀成果数、教师平均点评耗时、学生满意度。",
          ],
        },
        {
          title: "风险评估与应对",
          items: [
            "内容质量风险：AI 可能输出空泛建议。应对方式是绑定课程模板、评分标准和优秀案例，并由教师在关键节点审核。",
            "学生依赖风险：学生可能直接复制 AI 结果。应对方式是保留修改记录、教师反馈和答辩压力测试，强调二次加工。",
            "数据安全风险：学生简历、录音和项目资料涉及隐私。正式版需要权限控制、脱敏、日志审计和数据留存策略。",
            "采购转化风险：学院可能质疑投入产出。应对方式是用 8 周试点数据证明教师效率、学生成果质量和案例库沉淀价值。",
            "落地成本风险：真实 PPT/视频生成耗时较长。Demo 阶段使用预生成文件，正式版再接入异步生成和导出服务。",
          ],
        },
      ];
    }
    if (skillName === "财务假设") {
      return [
        {
          title: "财务与运营假设",
          items: [
            "收入假设：试点期以课程建设包采购，正式期按学院年度订阅或学生规模计费。",
            "成本假设：主要包括模型调用、知识库维护、模板建设、客户培训和技术支持。",
            "使用假设：50 名学生每周使用 2 次，8 周累计 800 次左右模拟调用。",
            "转化假设：若成果质量提升和教师点评效率改善明显，可扩展到就业指导中心和更多课程。",
          ],
        },
      ];
    }
  }

  if (expertId === "pitch") {
    if (skillName === "10 页 PPT 大纲") {
      return [
        {
          title: "10 页路演 PPT 结构",
          items: [
            "第 1 页｜封面：AI 就业教练。副标题：面向商学院学生的职业发展与创业实践训练平台。画面建议：上财商学院课堂与平台界面组合。",
            "第 2 页｜问题背景：学生求职和创业表达缺少持续反馈，教师难以批量跟踪过程，学院成果难沉淀。图表建议：学生、教师、学院三方痛点矩阵。",
            "第 3 页｜目标用户：商学院学生、创业实践课教师、学院教学管理者。图表建议：三类用户画像卡片。",
            "第 4 页｜解决方案：学生端 AI 创意工作台、教师审核中心、管理员知识库与成果看板。图表建议：三端闭环流程图。",
            "第 5 页｜核心功能：创意整理、产品定位、BP 生成、PPT 生成、答辩模拟、多媒体物料、老师反馈。图表建议：功能模块路径图。",
            "第 6 页｜知识库与专家团：按教学大纲、BP 模板、PPT 模板、评分标准、创业案例、答辩题库、多媒体模板调用。图表建议：专家-技能-知识库映射图。",
            "第 7 页｜商业模式：学院订阅、课程建设包、行业训练包、案例库服务。图表建议：B2B2C 商业模式画布。",
            "第 8 页｜试点计划：50 名学生、10 个项目组、8 周周期，验证生成成果、教师审核和优秀案例沉淀。图表建议：8 周甘特图。",
            "第 9 页｜风险与应对：内容质量、学生依赖、隐私安全、教师使用习惯、生成耗时。图表建议：风险矩阵。",
            "第 10 页｜行动计划：完成 Demo 演示、签约试点、接入真实接口、扩展课程场景。图表建议：版本路线图。",
          ],
        },
        {
          title: "每页讲述重点",
          items: [
            "前 3 页先讲痛点和人群，不急着讲功能，避免客户觉得只是普通 AI 工具。",
            "第 4-6 页集中展示教学闭环：学生生成、教师审核、知识库支撑、成果沉淀。",
            "第 7-8 页讲商业可行性和试点路径，用学院采购价值和 8 周验证指标支撑。",
            "第 9 页主动回应风险，体现正式版会做权限、脱敏、日志和异步生成。",
            "第 10 页收束到一期 Demo 与后续正式试点，强调当前版本是销售演示而非真实上线系统。",
          ],
        },
        {
          title: "答辩追问对应关系",
          items: [
            "评委问“和通用 AI 有什么区别”：对应第 4-6 页，回答课程模板、教师审核、知识库和成果沉淀。",
            "评委问“谁付费”：对应第 7 页，回答学院/课程组/就业中心采购，价值是质量提升和效率提升。",
            "评委问“如何证明有效”：对应第 8 页，回答 50 名学生、10 组项目、8 周数据指标。",
            "评委问“数据安全怎么办”：对应第 9 页，回答权限控制、脱敏、日志审计和数据留存策略。",
            "评委问“下一步怎么落地”：对应第 10 页，回答先 Demo 签约，再接入真实 AI、知识库 API 和导出服务。",
          ],
        },
      ];
    }
    if (skillName === "页面观点") {
      return [
        {
          title: "每页一句话观点",
          items: [
            "封面：AI 就业教练让商学院创业实践教学形成可演示闭环。",
            "痛点：学生生成内容容易，持续修改和教师审核很难。",
            "方案：学生端、教师端、管理员端共同支撑从创意到成果沉淀。",
            "价值：平台提升学生成果质量，也提升教师指导效率。",
            "试点：用 50 名学生、10 个项目组、8 周周期验证建设成效。",
          ],
        },
      ];
    }
    if (skillName === "讲稿建议") {
      return [
        {
          title: "路演讲稿建议",
          items: [
            "开场 20 秒：先讲创业实践课里的真实痛点，不要先讲系统功能。",
            "中段 90 秒：按学生端生成、教师端审核、管理员端沉淀三个路径展开。",
            "收束 30 秒：用试点指标说明项目不是概念展示，而是可以进入课程试点。",
            "答辩准备：提前准备通用 AI 差异、学校付费理由、数据安全和试点指标四类问题。",
          ],
        },
      ];
    }
  }

  if (expertId === "media") {
    if (skillName === "宣传视频脚本") {
      return [
        {
          title: "30 秒宣传视频脚本",
          items: [
            "0-5 秒：商学院课堂，小组讨论创业项目。旁白：一个课堂创意，如何变成可路演的方案？",
            "5-10 秒：学生输入想法，AI 生成痛点和任务清单。旁白：AI 助教帮助学生快速整理方向。",
            "10-18 秒：产品定位、BP、PPT 依次出现。旁白：从想法到方案，阶段成果快速成型。",
            "18-25 秒：教师审核并退回修改。旁白：教师在关键节点把关，让生成真正进入教学闭环。",
            "25-30 秒：路演现场和成果库看板。旁白：过程可见、反馈可追踪、成果可沉淀。",
          ],
        },
      ];
    }
    if (skillName === "视频分镜表") {
      return [
        {
          title: "视频分镜表",
          items: [
            "镜头 1：课堂全景，学生围桌讨论；字幕“从课堂创意开始”；时长 5 秒。",
            "镜头 2：学生端聊天框输入项目；字幕“AI 辅助头脑风暴”；时长 5 秒。",
            "镜头 3：BP 与 PPT 卡片弹出；字幕“从想法到方案”；时长 5 秒。",
            "镜头 4：教师端审核意见出现；字幕“关键节点指导”；时长 5 秒。",
            "镜头 5：AI 评委追问，学生语音回答；字幕“答辩模拟”；时长 5 秒。",
            "镜头 6：成果库和数据看板；字幕“成果沉淀”；时长 5 秒。",
          ],
        },
      ];
    }
    if (skillName === "海报文案 Prompt") {
      return [
        {
          title: "海报文案与生成 Prompt",
          items: [
            "主标题：AI 赋能创业实践课。",
            "副标题：从课堂创意到路演成果，让每一次实践都有反馈、有修改、有沉淀。",
            "卖点短句：头脑风暴整理｜产品定位说明｜BP 与 PPT 生成｜答辩模拟｜教师审核反馈。",
            "海报 Prompt：上海财经大学商学院课堂，学生小组讨论创业项目，屏幕展示 AI 工作台和教师审核中心，深蓝白色高级高校风。",
          ],
        },
      ];
    }
    if (skillName === "视觉素材 Prompt") {
      return [
        {
          title: "产品视觉素材 Prompt",
          items: [
            "产品界面图：深蓝白色 Web 平台，左侧创意空间，中间 AI 对话，右侧阶段成果卡片和老师反馈状态。",
            "课堂场景图：上海财经大学商学院教室，小组围绕创业项目讨论，屏幕显示 BP、PPT、答辩模拟。",
            "成果看板图：管理员后台运营看板，展示学生人数、项目组、调用量、优秀成果和知识库状态。",
          ],
        },
      ];
    }
  }

  return null;
}

function buildSufeBlocks(expertId: ExpertId, skillName = "", mode: ModelMode = "Auto"): ResultBlock[] {
  void mode;
  const project = "AI 就业教练";
  const commonSources = "引用资料：创业实践课程教学大纲、BP 模板、创业项目评分 Rubric、优秀创业案例集。";
  const specificBlocks = skillBlocks(expertId, skillName);
  if (specificBlocks) return specificBlocks;

  if (expertId === "brainstorm") {
    return [
      {
        title: "课堂头脑风暴整理",
        items: [
          `核心创意：${project} 是面向上财商学院学生的 AI 职业发展与创业实践训练助手，把职业定位、简历优化、岗位匹配、模拟面试和教师点评串成连续训练流程。`,
          "课堂讨论焦点：学生需要的不只是一次性简历润色，而是能反复训练、被老师看见过程、最终沉淀为课程成果的工具。",
          "适配专业：工商管理、市场营销、金融学、商务分析等方向学生都可围绕目标岗位或创业项目进行训练。",
          "课程连接：该创意可以承接《创业实践》课程中的头脑风暴、项目定位、BP 写作、路演展示和答辩复盘五个关键任务。",
          "初步结论：该项目不应定位成单点简历工具，而应定位成“商学院学生职业表达与创业成果产出的训练平台”。",
        ],
      },
      {
        title: "用户痛点与商业假设",
        items: [
          "痛点 1：学生求职表达碎片化，难以把课程中的商业分析能力转化成简历和面试中的可证明成果。",
          "痛点 2：老师难以批量查看每个小组的讨论过程、修改轨迹和答辩准备情况。",
          "痛点 3：学院已有优秀就业与创业案例，但复用效率低，学生很难按案例标准自查。",
          "假设：如果 AI 将学生训练过程结构化，并把关键成果提交给老师审核，教师点评效率和学生成果质量都会提升。",
          "目标用户假设：大二到研二学生最需要“岗位方向判断、经历表达、面试追问、项目路演”四类训练。",
          "付费方假设：学院或课程组愿意为提升就业指导效率、沉淀优秀案例、形成课程建设数据而采购。",
          "使用频次假设：若系统能把每次输出转化为可提交成果，学生在 8 周课程中至少会使用 6-8 次。",
        ],
      },
      {
        title: "待验证任务清单",
        items: [
          "任务 1：访谈 8 名上财商学院学生，覆盖大二、大三、大四和研究生；记录他们在简历、岗位选择、面试、创业项目表达中的真实困难。",
          "任务 2：收集 5 份真实岗位 JD，覆盖金融、咨询、互联网产品、市场营销、商业分析；测试 AI 能否拆解岗位要求并映射到学生经历。",
          "任务 3：选取 3 份学生简历初稿，分别让 AI 输出修改建议，再请同学判断建议是否可执行、是否比通用 AI 更贴近商学院场景。",
          "任务 4：请 2 位创业实践课教师评估 AI 生成的产品定位、BP、PPT、答辩建议是否符合课程评分标准。",
          "任务 5：设计一张“修改前后对比表”，记录学生原始表达、AI 建议、学生修改稿、教师点评和最终得分。",
          "任务 6：在 10 个小组中试跑一次“创意-定位-BP-PPT-答辩”链路，统计每组完成时间和卡点。",
          "交付物：访谈纪要、岗位 JD 标签表、学生简历修改样例、教师评估表、试点问题清单。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "positioning") {
    return [
      {
        title: "产品定位说明大纲",
        items: [
          "项目名称：AI 就业教练。",
          "一句话定位：面向上财商学院学生的职业发展与创业实践训练平台，让求职准备、BP 写作、路演展示和教师反馈形成连续闭环。",
          "核心商业价值：把学生零散的课堂讨论、求职材料和项目表达转化为可提交、可评审、可沉淀的阶段成果。",
          "目标用户画像 A：正在参加创业实践课程的商学院学生，需要把创意快速整理成 BP、PPT 和答辩材料。",
          "目标用户画像 B：准备求职的本科生/研究生，需要围绕金融、咨询、互联网、消费品等方向训练简历与面试表达。",
          "目标用户画像 C：创业实践课教师，需要批量查看学生过程记录、AI 建议和阶段成果，并在关键节点给出指导。",
          "典型使用场景：课前整理创意、课中讨论记录、课后 BP 初稿生成、路演 PPT 转化、答辩模拟与教师反馈。",
          "核心功能边界：学生端负责生成和修改，教师端负责审核和指导，管理员端负责知识库、专家技能和成果沉淀管理。",
          "阶段成果定义：该阶段应形成《产品定位说明大纲》，作为后续 BP、PPT 和答辩模拟的统一依据。",
        ],
      },
      {
        title: "价值主张与差异化表达",
        items: [
          "价值主张：帮助学生从“想法很多但表达分散”进入“定位清楚、证据明确、材料成型”的状态。",
          "相比通用 AI：本项目绑定商学院课程模板、评分 Rubric、教师审核和成果沉淀，不只是聊天生成。",
          "相比招聘平台：重点不是投递岗位，而是训练学生把商业能力、课程项目和个人经历表达清楚。",
          "相比传统教学平台：不是只收作业，而是记录 AI 生成、学生修改、教师反馈的完整过程。",
          "差异化关键词：课程化、过程化、可审核、可沉淀、适配商学院创业实践。",
          "对学生的价值：减少从想法到成果的空转，把课堂讨论快速变成定位、BP、PPT、答辩稿等可交付材料。",
          "对教师的价值：把大量重复性的初稿点评前置给 AI，教师主要处理关键节点、方向纠偏和优秀案例筛选。",
          "对学院的价值：将分散在课堂、作业、路演中的实践成果沉淀为可复用的数字资产。",
        ],
      },
      {
        title: "后续 BP 写作与验证计划",
        items: [
          "BP 写作重点 1：把学院端付费价值讲清楚，包括教师点评效率、学生成果质量和案例库沉淀。",
          "BP 写作重点 2：补充市场规模与竞品对比，证明本项目不是通用 AI 工具的简单套用。",
          "BP 写作重点 3：设计 8 周试点指标，包括学生使用次数、成果提交数量、修改前后评分变化和教师节省时间。",
          "待验证假设：学生愿意持续使用；教师愿意把它作为关键节点指导工具；学院愿意为课程数字化建设采购。",
          "建议老师重点审核：定位是否清楚、用户是否具体、差异化是否能支撑商业模式。",
          "建议补充证据：学生访谈摘录、教师点评截图、修改前后成果对比、8 周试点使用数据。",
          "BP 章节映射：本定位大纲可直接映射到 BP 的用户痛点、解决方案、目标市场、竞争优势和运营计划章节。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "market") {
    return [
      {
        title: "市场机会判断",
        items: [
          "高校就业服务正在从线下咨询转向智能化、过程化和数据化，商学院学生对高质量简历、面试和商业表达训练需求明显。",
          "上财商学院具备财经商科场景优势，可围绕金融、咨询、互联网、消费品、创业项目等方向形成行业化训练包。",
          "学院侧价值在于提升就业指导效率、沉淀优秀案例、形成课程建设数据。",
        ],
      },
      {
        title: "竞品类型与对比维度",
        items: [
          "通用大模型工具：生成能力强，但缺少课程模板、教师审核和学生过程记录。",
          "招聘平台工具：岗位数据强，但不解决创业实践课中的 BP、PPT、答辩和成果沉淀。",
          "校内就业系统：管理流程清楚，但个性化训练与 AI 反馈能力弱。",
          "对比维度：课程适配度、教师可审核性、案例库复用、数据闭环、学生使用门槛。",
        ],
      },
      {
        title: "进入策略",
        items: [
          "先以创业实践课 8 周试点切入，服务 50 名学生、10 个项目组。",
          "用修改前后质量评分、答辩表现、教师点评耗时作为验证指标。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "business") {
    return [
      {
        title: "商业计划书 BP 初稿 - 执行摘要",
        items: [
          `${project} 面向上财商学院学生提供职业定位、简历优化、岗位匹配、模拟面试、BP 路演和教师点评闭环。`,
          "项目以 B2B2C 模式切入：学院或就业指导中心采购平台，学生在课程和求职训练中使用。",
          "核心价值：提高学生就业表达与创业展示质量，提高教师指导效率，沉淀学院数字化教学资产。",
          "问题背景：高校学生在求职与创业实践中往往有想法、有经历，但难以将经历转化成结构化表达；教师也缺少高效追踪学生过程的工具。",
          "解决方案：平台通过课程知识库、专家技能、AI 对话生成和教师审核反馈，支持学生完成从创意到成果的全过程训练。",
          "当前阶段目标：先以上海财经大学商学院创业实践课程为试点，验证学生使用频次、教师点评效率和成果质量提升。",
        ],
      },
      {
        title: "市场容量与商业模式",
        items: [
          "目标市场：高校商学院创业实践、就业指导、职业发展和创新创业教育场景。",
          "早期切入：以上海财经大学商学院创业实践课 8 周试点为样板，形成可复制的课程方案。",
          "收入来源：学院年度订阅、行业岗位训练包、案例库扩展包、答辩题库服务。",
          "成本结构：模型调用成本、知识库维护、课程模板建设、客户成功与培训。",
          "试点假设：50 名学生每周使用 2 次，10 个项目组至少形成 30 份阶段成果，教师点评时间减少 30%。",
          "客户决策人：商学院教学院长、创新创业课程负责人、就业指导中心、数字化教学建设部门。",
          "采购理由：提升课程展示度、降低教师重复点评负担、沉淀优秀实践成果、形成可汇报的数字化建设指标。",
          "商业模式建议：第一年以课程试点包切入，第二年扩展到学院就业训练包和跨课程案例库服务。",
        ],
      },
      {
        title: "风险评估与专业校准",
        items: [
          "风险：学生过度依赖 AI。应对：关键节点必须提交给教师审核，强调人工修改和反思。",
          "风险：输出内容泛化。应对：绑定上财商学院课程资料、评分标准和优秀案例。",
          "风险：隐私与数据合规。应对：正式版接入权限控制、脱敏、日志审计和数据留存策略。",
          "专业校准：将学生口语化描述统一转化为商业术语，例如目标用户、价值主张、商业模式、财务假设和验证指标。",
          "运营风险：教师不愿意改变原有点评习惯。应对：教师端只保留审核、退回、点评、优秀案例四类核心动作，降低使用负担。",
          "试点风险：学生初期输入质量较低。应对：聊天框预置学生提问模板，引导学生输入目标用户、问题场景和验证假设。",
          "验收指标：登录使用率、成果提交数、退回修改次数、优秀案例数、教师点评耗时、学生满意度。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "pitch") {
    return [
      {
        title: "10 页路演 PPT 大纲",
        items: [
          "1. 项目标题：AI 就业教练，面向商学院学生的职业发展训练平台。",
          "2. 用户痛点：学生表达碎片化，教师难以批量指导，学院成果难沉淀。",
          "3. 解决方案：学生端 AI 工作台 + 教师审核中心 + 课程知识库。",
          "4. 使用流程：创意整理、项目定位、BP、PPT、答辩、多媒体物料。",
          "5. 商业模式：学院订阅 + 行业训练包 + 案例库服务。",
          "6. 试点计划：50 名学生、10 个小组、8 周周期。",
        ],
      },
      {
        title: "演讲提示",
        items: [
          "开场先讲课堂真实问题：学生能生成内容，但缺少老师可审核、可追踪、可沉淀的教学闭环。",
          "中段展示学生端和教师端如何打通，突出提交审核、退回修改、优秀成果沉淀。",
          "结尾用试点指标收束：成果质量提升、教师点评效率提升、案例库沉淀数量。",
        ],
      },
      {
        title: "视觉建议",
        items: [
          "使用上财深蓝、白色、金色点缀，保持高校商学院正式感。",
          "图表建议：三方角色流程图、8 周试点甘特图、竞品矩阵、商业模式画布。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "script") {
    return [
      {
        title: "路演稿生成总纲",
        items: [
          "讲述主线：从“商学院学生求职与创业表达反馈不连续”切入，展示 AI 就业教练如何把创意、BP、PPT、答辩和教师反馈连成教学闭环。",
          "听众定位：创业实践课教师、学院管理者、就业指导中心和潜在试点客户，重点听他们关心的教学价值、可落地性和数据沉淀。",
          "核心表达：AI 就业教练不是单点生成工具，而是学生端生成、教师端审核、管理端监控的实践教学平台。",
          "证据承接：建议在讲稿中引用 50 名学生、10 个小组、8 周试点、阶段成果提交、教师审核反馈和优秀案例沉淀等演示数据。",
        ],
      },
      {
        title: "1 分钟电梯演讲",
        items: [
          "各位老师好，我们的项目是 AI 就业教练，面向商学院学生的职业发展与创业实践训练平台。我们发现学生在求职和创业实践中常常有想法、有经历，但很难把它们转化成清晰的 BP、PPT 和答辩表达；教师也很难批量看到学生每一步是如何修改和提升的。",
          "AI 就业教练通过学生端对话工作台帮助学生完成头脑风暴、项目定位、商业计划书、路演 PPT 和路演稿生成；教师端可以在关键节点审核、退回修改和标记优秀成果；管理端则看到知识库、权限、调用和建设成效。我们希望用 8 周试点证明：学生成果质量更稳定，教师指导更高效，学院能够沉淀可复用的实践教学资产。",
        ],
      },
      {
        title: "3 分钟标准路演稿",
        items: [
          "开场 0:00-0:30：在创业实践课里，学生经常不是没有想法，而是想法分散、表达不完整、材料产出慢。老师要在有限时间里批量指导多个小组，也很难看到每个小组从创意到成果的修改过程。",
          "方案 0:30-1:20：AI 就业教练提供一个对话式学生工作台。学生选择专家后，可以生成头脑风暴清单、产品定位说明、BP、路演 PPT、路演稿和多媒体物料；生成结果可提交老师审核，老师可以通过或退回修改。",
          "价值 1:20-2:10：对学生，它降低从想法到成果的门槛；对教师，它把重复性的初稿整理交给 AI，把老师精力留给方向判断和关键点评；对学院，它沉淀优秀项目案例、评分标准和课程建设数据。",
          "商业与试点 2:10-2:45：我们采用学院订阅和课程试点包模式，先服务 50 名学生、10 个项目组、8 周创业实践课程，验证登录使用率、成果提交数、退回修改率、优秀案例数和教师点评效率。",
          "结尾 2:45-3:00：我们的目标不是替代老师，而是让学生生成、教师指导和成果沉淀真正连成一个可追踪、可评估、可复用的教学闭环。",
        ],
      },
      {
        title: "5 分钟完整路演稿与转场",
        items: [
          "第 1 页转场：先用课堂真实痛点建立共识，再进入用户痛点页。",
          "第 2-3 页讲法：强调学生端不是随便问 AI，而是在课程知识库和专家提示词引导下完成阶段成果。",
          "第 4-6 页讲法：商业模式要先讲学院为什么付费，再讲学生如何持续使用，避免只停留在功能介绍。",
          "第 7-8 页讲法：展示教师审核中心和知识库维护，说明平台如何把 AI 生成纳入教学质量控制。",
          "第 9-10 页讲法：用 8 周试点指标收束，提出后续接入真实知识库、账号系统和导出服务的建设路径。",
          "结尾行动号召：我们希望先以上财商学院创业实践课程为样板，完成一轮可演示、可复盘、可扩展的试点验证。",
          commonSources,
        ],
      },
    ];
  }

  if (expertId === "defense") {
    return [
      {
        title: "商学院评委追问",
        items: [
          "你们如何证明这不是通用 AI 聊天工具，而是适合商学院创业实践课的平台？",
          "学院为什么愿意付费？请从教学效率、学生质量和成果沉淀三个角度回答。",
          "如果学生生成内容质量不稳定，教师端如何把关？",
          "8 周试点结束后，你们用哪些量化指标证明项目有效？",
        ],
      },
      {
        title: "回答建议",
        items: [
          "先给结论：本项目的核心壁垒是课程模板、教师审核、知识库和成果沉淀闭环。",
          "回答商业模式时，先讲学院端价值，再讲学生端体验，不要只说 AI 能生成。",
          "回答风险时主动承认 AI 只是辅助，最终成果仍需学生修改和教师点评。",
        ],
      },
      {
        title: "表达改进点",
        items: [
          "少讲技术名词，多讲课程场景：作业、BP、PPT、答辩、教师反馈。",
          "每个回答控制在 45 秒以内，采用“结论-证据-下一步验证”的结构。",
          commonSources,
        ],
      },
    ];
  }

  return [
    {
      title: "创意物料包",
      items: [
        "宣传视频主线：上财商学院学生从课堂创意出发，通过 AI 工作台生成 BP/PPT，再提交老师审核，最终完成路演展示。",
        "海报标题：AI 赋能创业实践课，让每一次创意都有反馈、有修改、有沉淀。",
        "海报 Prompt：上海财经大学商学院课堂场景，学生小组围绕创业项目讨论，屏幕展示 AI 对话、BP、PPT 和教师审核状态，深蓝白色高校科技风。",
        "使用场景：课程路演开场、客户演示视频、成果展示页、学院数字化教学建设汇报。",
        "核心卖点：学生端快速产出、教师端关键审核、管理员端成果沉淀，形成可演示的教学闭环。",
      ],
    },
    {
      title: "6 镜头分镜",
      items: [
        "镜头 1：商学院课堂，小组讨论创业项目；字幕：从课堂创意开始；旁白：一个好想法，需要被整理成清晰方案。",
        "镜头 2：学生在 AI 工作台输入项目想法；字幕：自动整理痛点与任务清单；旁白：AI 助教帮助学生快速识别用户痛点和验证假设。",
        "镜头 3：系统生成 BP 与 PPT；字幕：课程模板辅助成果产出；旁白：从定位到商业计划书，再到路演 PPT，过程更高效。",
        "镜头 4：教师审核中心给出修改意见；字幕：关键节点人工指导；旁白：教师在关键节点进行方向纠偏和质量把关。",
        "镜头 5：学生根据反馈修改答辩稿；字幕：从生成到打磨；旁白：AI 评委进行压力测试，帮助学生提升表达。",
        "镜头 6：路演现场展示项目；字幕：过程可见、反馈可追踪、成果可沉淀；旁白：让创业实践教学从结果提交走向全过程培养。",
      ],
    },
  ];
}

function buildBlocks(expertId: ExpertId, skillName: string, mode: ModelMode = "Auto"): ResultBlock[] {
  const sufeBlocks = buildSufeBlocks(expertId, skillName, mode);
  if (sufeBlocks.length) return applyModeVariant(sufeBlocks, mode, expertId, skillName);

  if (expertId === "brainstorm") {
    return [
      {
        title: "头脑风暴核心创意整理表",
        items: [
          "核心创意：面向高校学生的 AI 就业教练，围绕简历优化、岗位匹配、模拟面试提供连续训练。",
          "创意方向 1：求职材料诊断，自动识别简历结构、成果量化和岗位关键词缺口。",
          "创意方向 2：岗位匹配训练，根据目标岗位拆解能力要求和补强任务。",
          "创意方向 3：AI 评委陪练，模拟面试官追问并给出表达改进建议。",
        ],
      },
      {
        title: "用户痛点识别",
        items: [
          "学生想法多但散，难以把求职需求转化为可执行产品功能。",
          "简历和面试反馈依赖老师或同伴，反馈周期长且质量不稳定。",
          "学生缺少可重复训练的场景，无法持续改进商业表达与求职表达。",
        ],
      },
      {
        title: "待验证任务清单",
        items: [
          "访谈 5 位不同年级学生，验证他们是否愿意连续使用 3 次以上。",
          "用 2 个真实岗位测试简历诊断和岗位匹配是否可解释。",
          "整理 10 个高频面试问题，测试 AI 追问能否帮助学生补充证据。",
        ],
      },
    ];
  }

  if (expertId === "positioning") {
    return [
      {
        title: "价值主张与差异化表达",
        items: [
          "一句话定位：AI 就业教练是面向高校学生的职业发展训练平台，把简历优化、岗位匹配和模拟面试变成可持续练习。",
          "核心价值：将一次性就业咨询升级为 24/7 的个性化训练，帮助学生讲清楚自己的能力。",
          "差异化：不是通用聊天工具，而是结合高校就业场景、课程任务和教师点评流程的实践教学助手。",
        ],
      },
      {
        title: "产品定位说明大纲",
        items: [
          "目标用户：商学院本科生、研究生、求职准备期学生，以及负责就业指导和创业实践的教师。",
          "使用场景：简历初稿修改、岗位能力拆解、模拟面试答辩、路演表达训练、优秀案例复盘。",
          "用户画像：缺少求职经验但愿意主动练习的学生；需要批量初评并聚焦深度指导的教师。",
          "定位结论：以课程化、场景化、可沉淀为核心，服务商学院创新创业与就业能力培养。",
        ],
      },
      {
        title: "下一步任务清单",
        items: [
          "补充 5 位目标学生访谈，验证最需要的求职训练环节。",
          "形成标准《产品定位说明大纲》，作为后续 BP 编写基础。",
          "把定位语压缩成路演开场 20 秒版本。",
        ],
      },
    ];
  }

  if (expertId === "market") {
    return [
      {
        title: "市场机会",
        items: [
          "高校就业服务正在从线下咨询转向数字化、个性化和过程化训练。",
          "学生求职准备周期提前，简历、实习、面试训练需求覆盖大二到研二人群。",
          "学校端更关注就业质量、指导效率和可追踪过程数据。",
        ],
      },
      {
        title: "竞品分析维度",
        items: [
          "通用 AI 工具：生成能力强，但缺少课程模板、评分标准和教师闭环。",
          "招聘平台工具：岗位数据丰富，但不服务课堂教学和阶段成果沉淀。",
          "高校就业系统：管理属性强，个性化训练和实时反馈能力不足。",
        ],
      },
      {
        title: "进入策略",
        items: [
          "先从创业实践课和就业指导课切入，形成 8 周试点数据。",
          "用优秀修改前后案例证明教学价值，再扩展到学院就业服务。",
          "将 BP、PPT、答辩和多媒体物料沉淀为课程案例库。",
        ],
      },
    ];
  }

  if (expertId === "business") {
    return [
      {
        title: "商业计划书 BP 初稿结构",
        items: [
          "执行摘要：AI 就业教练为高校学生提供职业定位、简历优化、模拟面试和岗位匹配训练。",
          "用户痛点：学生缺少持续反馈，教师难以批量跟踪过程，学校缺少可沉淀的就业指导数据。",
          "解决方案：学生端 AI 训练工作台 + 教师审核反馈中心 + 教学成果库。",
        ],
      },
      {
        title: "商业模式与财务假设",
        items: [
          "收费模式：学院或就业中心年度订阅，按学生规模配置基础服务包。",
          "增值服务：行业岗位包、模拟面试题库、优秀案例库和多媒体展示包。",
          "早期假设：50 名学生、10 组项目、8 周试点验证留存与教师使用频率。",
        ],
      },
      {
        title: "风险评估",
        items: [
          "风险 1：学生只把系统当一次性生成工具，需要用阶段任务和教师反馈强化持续使用。",
          "风险 2：就业数据涉及隐私，正式版需做权限、脱敏和日志审计。",
          "风险 3：模型输出质量不稳定，需要绑定课程模板、评分 Rubric 和案例库。",
        ],
      },
    ];
  }

  if (expertId === "pitch") {
    return [
      {
        title: "PPT 页面标题及脉络",
        items: pptSlides.map(([title, point]) => `${title}：${point}`),
      },
      {
        title: "核心观点大纲",
        items: [
          "开场突出学生求职反馈不连续、教师指导难批量、学校成果难沉淀三类痛点。",
          "解决方案用学生端、教师端、管理员端三方闭环说明系统价值。",
          "商业模式重点讲学校端付费理由和教学数据沉淀价值。",
        ],
      },
      {
        title: "路演脚本建议",
        items: [
          "第 1 分钟讲清楚用户痛点和目标用户。",
          "第 2 分钟展示学生生成 BP/PPT 与教师审核闭环。",
          "第 3 分钟说明试点路径、商业模式和风险应对。",
        ],
      },
    ];
  }

  if (expertId === "defense") {
    return defenseBlocks(buildDefensePractice("I-1001", "teacher"));
  }

  if (expertId === "media") {
    return [
      {
        title: "30 秒宣传视频脚本",
        items: [
          "0-5 秒：学生面对空白简历和岗位 JD，画面叠加字幕“我该怎么准备面试？”",
          "6-15 秒：AI 就业教练自动拆解岗位要求，给出简历修改建议和模拟面试问题。",
          "16-24 秒：教师后台看到学生训练记录，针对商业表达和证据链给出点评。",
          "25-30 秒：学生完成路演 PPT 与答辩稿，字幕“让每一次练习都有反馈、有沉淀”。",
        ],
      },
      {
        title: "6 镜头视频分镜表",
        items: [
          "镜头 1：宿舍桌面，学生打开简历；旁白：求职准备最难的是不知道哪里要改；时长 4 秒。",
          "镜头 2：系统识别岗位关键词；字幕：岗位能力拆解；时长 5 秒。",
          "镜头 3：AI 给出简历优化建议；字幕：即时反馈；时长 5 秒。",
          "镜头 4：模拟面试追问弹出；字幕：压力测试；时长 6 秒。",
          "镜头 5：教师审核中心给出点评；字幕：导师指导闭环；时长 5 秒。",
          "镜头 6：学生完成路演展示；字幕：从想法到成果；时长 5 秒。",
        ],
      },
      {
        title: "海报文案与 Prompt",
        items: [
          "主标题：AI 就业教练，让求职准备变成可持续训练。",
          "副标题：简历优化、岗位匹配、模拟面试、教师点评，一站式完成。",
          "海报 Prompt：高校商学院课堂场景，学生使用笔记本完成职业训练，深蓝白色科技教育风，高级、干净、正式系统感。",
          "产品视觉图 Prompt：三栏 Web 平台界面，左侧学生任务，中间 AI 对话，右侧教师反馈状态，SUFE 深蓝与金色点缀。",
        ],
      },
    ];
  }

  return [{ title: `${skillName}生成结果`, items: ["已生成结构化建议。"] }];
}

function buildDefensePractice(ideaId: string, visibility: "self" | "teacher"): DefensePractice {
  const transcript: DefenseTurn[] = [
    {
      id: makeId("DT"),
      sender: "ai",
      content: "请先用 1 分钟说明：AI 就业教练和普通简历工具相比，真正解决了什么教学问题？",
      createdAt: nowTime(),
    },
    {
      id: makeId("DT"),
      sender: "student",
      content: "它不只是优化简历，而是把职业定位、岗位匹配、模拟面试和教师点评串成连续训练流程。",
      createdAt: nowTime(),
    },
    {
      id: makeId("DT"),
      sender: "ai",
      content: "如果学校问你们如何证明 8 周试点有效，你会用哪些指标回应？",
      createdAt: nowTime(),
    },
  ];
  const evaluation = buildDefenseEvaluation();
  return {
    id: makeId("D"),
    ideaId,
    basis: "BP + PPT + 路演稿",
    scripts: {
      "1分钟":
        "各位老师好，我们的项目是 AI 就业教练。它面向高校学生，把职业定位、简历优化、岗位匹配和模拟面试整合成连续训练流程，帮助学生获得即时反馈，也帮助教师沉淀过程数据。",
      "3分钟":
        "我们观察到，高校学生求职准备常常依赖零散咨询，反馈不连续，教师也难以批量了解学生准备过程。AI 就业教练通过学生端对话工作台承接简历、岗位和面试训练，通过教师端审核中心形成点评闭环，最终沉淀优秀案例和评分数据。商业上，我们优先面向学院和就业中心提供年度订阅，并用 8 周试点验证学生活跃、成果质量和教师指导效率。",
      "5分钟":
        "AI 就业教练的核心不是替代老师，而是把学生准备过程变得可见、可评、可沉淀。学生从头脑风暴开始整理职业方向，再完成项目定位、BP、PPT 和答辩模拟；教师在关键节点看到成果提交，给出通过或退回修改意见。这个闭环能解决学生反馈不稳定、教师指导成本高、学校缺少可复用就业案例三个问题。我们计划先在 50 名学生、10 组项目、8 周周期中试点，验证训练频次、修改前后质量提升和教师点评效率。",
    },
    questions: [
      "你们和通用 AI 简历工具相比，真正的壁垒是什么？",
      "学校为什么愿意为这个系统付费，而不是让学生自己使用免费工具？",
      "如果 AI 建议不准确，教师如何介入并保证教学质量？",
      "学生求职数据涉及隐私，正式版怎么处理权限和脱敏？",
      "8 周试点结束后，你们用什么指标证明项目有效？",
      "这个项目从创业实践课切入后，如何扩展到就业指导、职业发展或其他商科课程？",
      "如果学生输入内容很少，系统如何保证输出不是空泛模板？",
      "教师端如何筛选优秀成果，并把这些成果沉淀成下一届学生可参考的案例？",
    ],
    answerSuggestions: [
      "回答竞品问题时，强调课程模板、评分标准、教师反馈和成果沉淀四个闭环能力。",
      "回答付费问题时，从就业质量、教师效率、过程数据和优秀案例库四个角度说明学校端价值。",
      "回答质量问题时，说明 AI 只做预评审和结构化建议，关键节点由教师审核。",
      "回答隐私问题时，明确正式版会接入权限、脱敏、日志审计和数据留存策略。",
      "回答扩展问题时，先说明创业实践课是样板场景，再扩展到简历工作坊、模拟面试、案例分析和职业发展课程。",
      "回答输入质量问题时，强调系统会通过固定提问模板引导学生补充目标用户、痛点、场景、假设和验证计划。",
      "回答成果沉淀问题时，说明教师可将通过审核的 BP、PPT、答辩记录和宣传物料标记为优秀案例，并进入成果库。",
    ],
    expressionTips: [
      "开头 20 秒先讲痛点，不要先讲技术。",
      "每个回答尽量按“结论-证据-下一步验证”结构展开。",
      "涉及商业模式时主动说明试点规模和验证指标。",
      "回答中尽量使用“课程模板、教师审核、过程记录、成果沉淀”这四个关键词，帮助评委快速理解系统边界。",
      "不要承诺 AI 完全替代教师，应强调 AI 负责生成与预评审，教师负责关键节点指导和最终质量把关。",
    ],
    transcript,
    evaluation,
    visibility,
    createdAt: nowTime(),
  };
}

function defenseBlocks(practice: DefensePractice): ResultBlock[] {
  return [
    { title: "1/3/5 分钟演讲稿", items: Object.entries(practice.scripts).map(([label, text]) => `${label}：${text}`) },
    { title: "评委压力测试问题", items: practice.questions },
    { title: "回答建议", items: practice.answerSuggestions },
    { title: "表达改进点", items: practice.expressionTips },
    ...(practice.evaluation?.length ? practice.evaluation : []),
  ];
}

function getDefenseFocus(answer: string) {
  if (/(商业|收费|付费|订阅|收入|盈利|商业模式|续费)/.test(answer)) return "商业模式与学校付费理由";
  if (/(老师|教师|审核|点评|退回|指导|质量|把关)/.test(answer)) return "教师审核与教学质量把关";
  if (/(隐私|安全|数据|权限|脱敏|日志|合规)/.test(answer)) return "数据安全与权限合规";
  if (/(试点|指标|效果|数据|8周|八周|验证|成效)/.test(answer)) return "试点指标与建设成效验证";
  if (/(竞品|通用|招聘|平台|差异|壁垒|优势)/.test(answer)) return "竞品差异与项目壁垒";
  if (/(学生|用户|画像|痛点|需求|求职|就业)/.test(answer)) return "学生用户痛点与真实需求";
  if (/(ppt|bp|答辩|路演|成果|案例|沉淀)/i.test(answer)) return "阶段成果与课程沉淀";
  return "回答逻辑与证据支撑";
}

function buildFollowUpQuestion(answer: string, turnCount: number) {
  const focus = getDefenseFocus(answer);
  const trimmed = answer.length > 42 ? `${answer.slice(0, 42)}...` : answer;
  const map: Record<string, string[]> = {
    商业模式与学校付费理由: [
      `你刚才提到“${trimmed}”。采购之后谁来使用、谁维护、谁看数据？这三个角色要说清楚。`,
      "如果只能先卖一个版本，年度订阅、课程试点包和行业训练包中，哪个最适合作为第一阶段收入来源？",
    ],
    教师审核与教学质量把关: [
      `你刚才强调了教师相关内容。请具体说明老师在哪几个节点介入，哪些内容可以由 AI 预评审，哪些必须人工把关？`,
      "如果教师担心学生过度依赖 AI，你们会怎样设计审核和退回修改机制？",
    ],
    数据安全与权限合规: [
      `你刚才提到数据或隐私。请说明正式版如何做权限控制、脱敏、日志审计和数据留存。`,
      "如果学生上传简历、BP 或答辩录音，这些材料在系统里应该如何分级管理？",
    ],
    试点指标与建设成效验证: [
      `你刚才谈到了试点或效果。请给出 8 周试点结束后最重要的三个量化指标。`,
      "这些指标里，哪些能证明学生成果质量提升，哪些能证明教师指导效率提升？",
    ],
    竞品差异与项目壁垒: [
      `你刚才讲到差异或平台优势。请用一句话说明你们和通用 AI、招聘平台、传统教学平台分别有什么不同。`,
      "如果评委认为这只是套壳 AI，你会拿哪三个证据反驳？",
    ],
    学生用户痛点与真实需求: [
      `你刚才围绕学生或用户展开。请具体说明目标学生是谁，他们最痛的三个场景分别是什么？`,
      "你们准备如何验证这些学生真的愿意持续使用，而不是只在老师要求时使用一次？",
    ],
    阶段成果与课程沉淀: [
      `你刚才提到了 BP、PPT、答辩或成果沉淀。请说明这些成果如何从学生端提交到教师端，再进入优秀案例库。`,
      "如果只选择一个成果作为客户演示重点，你会选 BP、PPT、答辩记录还是宣传视频？为什么？",
    ],
    回答逻辑与证据支撑: [
      `我听到你的回答是“${trimmed}”。请把这个回答补成“结论-证据-下一步验证”的结构。`,
      "请补充一个更具体的课堂例子，让评委能听出这个系统确实服务创业实践教学。",
    ],
  };
  const questions = map[focus];
  return questions[Math.min(turnCount - 1, questions.length - 1)];
}

function getDefenseSuggestedAnswer(answerIndex: number) {
  const answers = [
    "学校愿意付费的原因不是买一个普通 AI 聊天工具，而是买一套能进入课程流程的实践教学闭环。学生端负责把创意、BP、PPT 和答辩材料逐步生成出来，教师端可以在关键节点审核、退回修改和标记优秀成果，学院端最后能沉淀案例和过程数据。这个价值是学生自己用通用 AI 很难形成的。",
    "采购后主要有三个角色：学生在课堂项目里使用，老师负责审核和指导，学院或课程负责人看试点数据和成果沉淀。维护上第一阶段可以由课程组和平台管理员共同维护知识库模板，老师只需要处理审核和点评，不需要承担复杂配置。",
    "第一阶段我会先卖课程试点包，而不是一开始卖行业训练包。因为创业实践课有明确周期、明确学生小组和明确交付物，8 周内可以验证使用次数、成果提交数、退回修改率、教师点评耗时和优秀案例数量。试点跑通后，再转成学院年度订阅。",
    "教师介入主要放在三个节点：BP 初稿、路演 PPT 和答辩复盘。AI 可以先做结构化生成和预评审，但方向判断、质量把关和最终通过必须由老师完成。这样既能减少重复初稿点评，也不会让学生完全依赖 AI。",
    "数据安全上，正式版需要按角色控制权限，学生只能看自己的项目，老师看所带班级，管理员看运营数据。学生上传的简历、录音和 BP 材料要做脱敏、日志留痕和留存周期管理，敏感信息不直接进入公开案例库。",
  ];
  return answers[Math.min(answerIndex, answers.length - 1)];
}

function buildDefenseEvaluation(transcript: DefenseTurn[] = []): ResultBlock[] {
  const studentAnswers = transcript.filter((turn) => turn.sender === "student").map((turn) => turn.content);
  const lastAnswer = studentAnswers.at(-1) || "";
  const focus = lastAnswer ? getDefenseFocus(lastAnswer) : "回答逻辑与证据支撑";
  return [
    {
      title: "答辩综合评价",
      items: [
        "综合评分：86/100。整体表达完整，能讲清楚教学闭环，但商业付费理由还可以更直接。",
        `本轮重点：${focus}。后续可以围绕你刚才回答中的关键词继续做压力测试。`,
        "表达清晰度：开场逻辑清楚，建议把技术描述减少 20%，更多讲学生和老师的实际变化。",
        "商业逻辑：学校端年度订阅路径成立，需要补充试点后转化指标和续费触发条件。",
        "教学价值：已经能够说明从 AI 生成到教师审核再到成果沉淀的闭环，但还需要用 1-2 个具体课堂场景增强说服力。",
        "证据支撑：目前回答更多是逻辑推导，建议补充学生访谈、教师点评耗时、成果修改前后评分等可验证数据。",
        "风险意识：能主动提到隐私和 AI 输出质量，但应进一步说明正式版的权限、日志、脱敏和人工审核机制。",
      ],
    },
    {
      title: "改进建议",
      items: [
        "回答竞品问题时，先说结论：我们的差异是课程模板、教师审核、过程数据和成果沉淀。",
        "回答试点效果时，建议固定三个指标：学生训练次数、成果修改前后评分提升、教师点评节省时间。",
        "回答隐私问题时，不要泛泛说安全，要明确权限、脱敏、日志审计和数据留存策略。",
        "回答商业模式时，不要只说订阅收费，要讲清楚采购方为什么有预算：课程建设、就业质量、数字化教学成果和优秀案例沉淀。",
        "回答教学价值时，建议用“学生原始想法 - AI 生成初稿 - 教师退回修改 - 最终路演成果”这条链路举例。",
        "回答技术实现时，避免出现底层工具名称，只说平台可接入专家能力、知识库、文件生成和多媒体生成服务。",
      ],
    },
    {
      title: "建议补充到答辩稿的关键句",
      items: [
        "我们的项目不是让 AI 替学生完成作业，而是把学生从想法到成果的过程结构化，让教师更早看到问题并进行指导。",
        "系统的核心价值不在于单次生成，而在于创意、定位、BP、PPT、答辩、教师反馈和成果库之间形成闭环。",
        "8 周试点后，我们将用学生使用次数、阶段成果数量、修改前后评分提升、教师点评时间变化来判断项目是否有效。",
        "正式版会通过权限控制、数据脱敏、日志审计和教师审核节点，保证教学质量和数据安全。",
      ],
    },
  ];
}

function formatDefenseEvaluationForChat(blocks: ResultBlock[]) {
  return blocks
    .map((block) => `${block.title}\n${block.items.map((item) => `• ${item}`).join("\n")}`)
    .join("\n\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function triggerDownload(href: string, filename: string, revokeUrl = false) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revokeUrl) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function downloadWord(filename: string, title: string, blocks?: ResultBlock[]) {
  const body = blocks?.length
    ? blocks
        .map(
          (block) =>
            `<h2>${escapeHtml(block.title)}</h2><ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
        )
        .join("")
    : "<p>Demo 演示版成果内容。</p>";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.75;color:#10233f;padding:40px 48px}.doc-meta{color:#5f7088;font-size:13px;margin:0 0 18px}h1{color:#003b79;border-bottom:3px solid #bf8f2a;padding-bottom:12px;margin-bottom:10px}h2{margin:26px 0 10px;color:#003b79;font-size:20px}ul{margin-top:8px;padding-left:22px}li{margin:7px 0}.footer{margin-top:34px;padding-top:12px;border-top:1px solid #d7e3ef;color:#7b8ca4;font-size:12px}</style></head><body><h1>${escapeHtml(title)}</h1><p class="doc-meta">上海财经大学商学院 AI 赋能创业实践教学示范平台 Demo｜阶段成果自动生成稿</p>${body}<p class="footer">说明：本文件为演示版生成内容，正式版可接入课程知识库、教师审核记录和真实导出服务。</p></body></html>`;
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename, true);
}

function getDownloadTitle(message: Pick<ChatMessage, "artifactType" | "skillName">, fallback = "AI 生成成果") {
  if (!message.artifactType) return fallback;
  if (message.artifactType === "POSITIONING") return "产品定位说明大纲";
  if (message.artifactType === "BP") return "商业计划书 BP 初稿";
  if (message.artifactType === "PPT") return "路演 PPT";
  if (message.artifactType === "BRAINSTORM") return "待验证任务清单";
  if (message.artifactType === "DEFENSE") return "答辩复盘";
  if (message.artifactType === "MEDIA") return "创意物料包";
  return message.skillName || artifactLabels[message.artifactType];
}

function getBrainstormTaskBlocks(blocks?: ResultBlock[]): ResultBlock[] {
  const candidates =
    blocks?.filter((block) => {
      const title = block.title || "";
      const joinedItems = block.items.join(" ");
      return /任务|行动|验证|清单/.test(title) || /任务|访谈|验证|交付物|负责人|样本|岗位 JD/.test(joinedItems);
    }) || [];

  if (candidates.length) return candidates;

  const availableBlocks = blocks?.filter((block) => block.items.length) || [];
  if (availableBlocks.length) return availableBlocks;

  return [
    {
      title: "待验证任务清单",
      items: [
        "任务 1：访谈 8 名上财商学院学生，覆盖大二、大三、大四和研究生；记录他们在简历、岗位选择、面试、创业项目表达中的真实困难。",
        "任务 2：收集 5 份真实岗位 JD，覆盖金融、咨询、互联网产品、市场营销、商业分析；测试 AI 能否拆解岗位要求并映射到学生经历。",
        "任务 3：选取 3 份学生简历初稿，分别让 AI 输出修改建议，再请同学判断建议是否可执行、是否比通用 AI 更贴近商学院场景。",
        "任务 4：请 2 位创业实践课教师评估 AI 生成的产品定位、BP、PPT、答辩建议是否符合课程评分标准。",
        "任务 5：设计一张“修改前后对比表”，记录学生原始表达、AI 建议、学生修改稿、教师点评和最终得分。",
        "任务 6：在 10 个小组中试跑一次“创意-定位-BP-PPT-答辩”链路，统计每组完成时间和卡点。",
      ],
    },
    {
      title: "任务分工与交付物",
      items: [
        "产品同学：整理学生端聊天流程和阶段成果字段，交付一张功能流程图。",
        "调研同学：完成学生访谈、教师访谈和岗位 JD 收集，交付访谈纪要与岗位能力标签表。",
        "展示同学：准备 PPT、宣传视频和答辩稿，交付路演素材包。",
        "课程对接同学：整理评分 Rubric、BP 模板和优秀案例标签，交付知识库分类清单。",
      ],
    },
    {
      title: "验证标准",
      items: [
        "学生访谈中至少 60% 的受访者认为持续反馈比一次性生成更有价值。",
        "教师评估中至少 2 位教师认可 AI 初稿能减少重复点评时间。",
        "试跑小组能在 8 周链路内形成定位说明、BP、PPT 和答辩记录四类成果。",
      ],
    },
  ];
}

function downloadArtifactWord(message: Pick<ChatMessage, "artifactType" | "blocks" | "skillName">, titlePrefix = "") {
  const title = `${titlePrefix}${getDownloadTitle(message, "阶段对话记录")}`;
  const filename = `${title}.doc`;
  if (message.artifactType === "BRAINSTORM") {
    downloadWord("待验证任务清单.doc", "待验证任务清单", getBrainstormTaskBlocks(message.blocks));
    return;
  }
  downloadWord(filename, title, message.blocks);
}

function downloadDemoPpt() {
  triggerDownload(demoPptUrl, "AI就业教练-路演PPT.pptx");
}

function downloadPptAsset(asset?: GeneratedAsset) {
  if (asset?.pptUrl) {
    triggerDownload(asset.pptUrl, asset.pptFileName || `${asset.title}.pptx`);
    return;
  }
  downloadDemoPpt();
}

async function generateLexiangPptContext(message: ChatMessage, idea: Idea) {
  const response = await fetch("/lexiang-api/ppt-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `${idea.title} - 路演 PPT`,
      prompt: message.content,
      blocks: message.blocks || [],
    }),
  });
  const result = (await response.json()) as {
    configured?: boolean;
    content?: string;
    references?: PptKnowledgeReference[];
    pptUrl?: string;
    pptFileName?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(result.message || "乐享知识库生成 PPT 失败");
  }
  return result;
}

function buildMediaAsset(idea: Idea, sourceMessage?: ChatMessage): GeneratedAsset {
  const title = `${idea.title} - 宣传视频物料`;
  return {
    id: makeId("A"),
    ideaId: idea.id,
    type: "VIDEO",
    title,
    sourceMessageId: sourceMessage?.id,
    createdAt: nowTime(),
    prompt:
      "模型提示词：上海财经大学商学院创业实践课程成果展示宣传片，16:9 横版，正式高校商学院气质，深蓝、白色、浅灰为主色，金色点缀。画面包含商学院课堂、小组讨论、学生端 AI 创意工作台、教师审核中心、BP/PPT 生成、答辩模拟和成果沉淀看板。风格干净、高级、真实，不要过度赛博，不要卡通，不要夸张科技粒子。",
    script:
      "0-5秒：商学院课堂，小组围绕创业项目讨论。字幕：从一个课堂创意开始。旁白：在创业实践课上，学生常常有很多想法，却难以快速形成清晰方案。\n5-10秒：学生在 AI 创意工作台输入项目想法，系统生成头脑风暴整理和待验证任务清单。字幕：AI 辅助头脑风暴整理。旁白：AI 助教帮助学生归纳创意、识别痛点、生成可执行任务。\n10-15秒：产品定位说明大纲、商业计划书 BP 和路演 PPT 依次出现。字幕：从想法到方案。旁白：项目定位、商业计划书和路演 PPT 可以被快速结构化产出。\n15-20秒：教师端审核中心，老师查看学生成果并给出退回修改意见。字幕：教师关键节点审核。旁白：教师可以查看过程记录，给出修改建议，让 AI 生成真正进入教学闭环。\n20-25秒：答辩模拟页面，AI 评委提出追问，学生进行语音回答。字幕：答辩模拟与表达提升。旁白：系统模拟路演答辩场景，帮助学生提升商业表达和临场应变能力。\n25-30秒：成果库、数据看板和学生路演展示。字幕：过程可见｜反馈可追踪｜成果可沉淀。旁白：让创业实践教学从结果提交，升级为全过程培养。",
    storyboard:
      "镜头1：上海财经大学商学院课堂全景，学生小组围桌讨论，桌面有笔记本和创业项目草稿；字幕“从课堂创意开始”；时长5秒。\n镜头2：学生端 AI 创意工作台特写，聊天框输入项目想法，右侧出现“核心创意、用户痛点、待验证任务”；字幕“AI 辅助头脑风暴整理”；时长5秒。\n镜头3：系统自动生成《产品定位说明大纲》《商业计划书 BP 初稿》《路演 PPT》三个成果卡片；字幕“从想法到方案”；时长5秒。\n镜头4：教师端提交审核中心，老师打开学生成果，填写点评意见并点击退回修改；字幕“教师关键节点审核”；时长5秒。\n镜头5：答辩模拟界面，AI 评委弹出压力测试问题，学生语音回答；字幕“答辩模拟与表达提升”；时长5秒。\n镜头6：路演现场和成果库看板交替出现，展示优秀案例、试点数据和成果沉淀；字幕“过程可见、反馈可追踪、成果可沉淀”；时长5秒。",
    posterPrompt:
      "海报主标题：AI 赋能创业实践课。副标题：从课堂创意到路演成果，让每一次实践都有反馈、有修改、有沉淀。卖点短句：头脑风暴整理｜产品定位说明｜BP 与 PPT 生成｜答辩模拟｜教师审核反馈。行动号召：开启商学院创业实践教学新闭环。",
    visualPrompt:
      "产品视觉图 Prompt：上海财经大学商学院数字化教学平台界面，深蓝白色高级 UI，左侧是学生创意空间与 AI 对话，中间展示产品定位、BP、PPT、答辩模拟成果卡片，右侧是教师审核反馈面板和成果沉淀数据，画面真实、正式、适合高校商学院客户演示。",
  };
}

function downloadMediaPackage(asset: GeneratedAsset) {
  downloadWord(`${asset.title}.doc`, asset.title, [
    { title: "模型提示词", items: [asset.prompt || ""] },
    { title: "30 秒宣传视频脚本", items: (asset.script || "").split("\n") },
    { title: "视频分镜表", items: (asset.storyboard || "").split("\n") },
    { title: "海报文案 Prompt", items: [asset.posterPrompt || ""] },
    { title: "产品视觉图 Prompt", items: [asset.visualPrompt || ""] },
  ]);
}

function downloadDemoVideo() {
  triggerDownload(demoVideoUrl, "AI就业教练-宣传视频.mp4");
}

function downloadGeneratedWorkBuddyVideo() {
  triggerDownload(workBuddyGeneratedVideoUrl, "WorkBuddy生成宣传视频.mp4");
}

function downloadVideoAsset(asset?: GeneratedAsset) {
  if (asset?.videoUrl) {
    triggerDownload(asset.videoUrl, `${asset.title}.mp4`);
    return;
  }
  downloadDemoVideo();
}

function getSubmissionPptAsset(submission: Submission, generatedAssets: GeneratedAsset[]) {
  return (
    generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === submission.sourceMessageId) ||
    generatedAssets.find((asset) => asset.type === "PPT" && asset.ideaId === submission.ideaId)
  );
}

function getSubmissionVideoAsset(submission: Submission, generatedAssets: GeneratedAsset[]) {
  return (
    generatedAssets.find((asset) => asset.type === "VIDEO" && asset.sourceMessageId === submission.sourceMessageId) ||
    generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === submission.ideaId) ||
    buildMediaAsset(
      {
        id: submission.ideaId,
        title: submission.artifactTitle.replace(/\s*-\s*多媒体物料$/, ""),
        description: submission.artifactSummary,
        stage: artifactLabels[submission.artifactType],
        updatedAt: submission.submittedAt,
      },
      undefined,
    )
  );
}

function getSubmissionDownloadLabel(submission: Submission) {
  if (submission.artifactType === "PPT") return "下载 PPTX";
  if (submission.artifactType === "MEDIA") return "下载 MP4 视频";
  if (submission.artifactType === "BRAINSTORM") return "下载任务清单 Word";
  return `下载 ${getDownloadTitle(submission)} Word`;
}

function downloadSubmissionArtifact(submission: Submission, generatedAssets: GeneratedAsset[]) {
  if (submission.artifactType === "PPT") {
    downloadPptAsset(getSubmissionPptAsset(submission, generatedAssets));
    return;
  }
  if (submission.artifactType === "MEDIA") {
    downloadVideoAsset(getSubmissionVideoAsset(submission, generatedAssets));
    return;
  }
  if (submission.artifactType === "BRAINSTORM") {
    downloadWord("待验证任务清单.doc", "待验证任务清单", getBrainstormTaskBlocks(submission.blocks));
    return;
  }
  downloadWord(`${submission.artifactTitle}.doc`, submission.artifactTitle, submission.blocks);
}

function buildWorkBuddyVideoPrompt(asset: GeneratedAsset) {
  const projectDir = "D:/桌面/上财/workbuddy-video-test";
  const outputFile = "D:/桌面/上财/public/generated-videos/sufe-workbuddy-video.mp4";
  return [
    "请使用已加载的 remotion-video-generator / Video Generator 技能生成宣传视频。",
    "",
    "硬性要求：",
    "1. 不要分析现有项目源码，不要读取 D:/桌面/上财/src/App.tsx。",
    `2. Remotion 项目文件只在 ${projectDir} 目录内创建/修改。`,
    "3. 使用 Remotion 生成 16:9、30fps、30 秒 MP4，时长必须是 30 秒。",
    `4. 必须创建目录 D:/桌面/上财/public/generated-videos，并把最终 MP4 渲染到：${outputFile}`,
    "5. package.json 里必须有 render 脚本，且 render 脚本输出到上面的 MP4 路径。",
    "6. 必须实际执行 npm install（如已安装可跳过）和 npm run render，不能只创建源码。",
    "7. 不读取网络素材，不等待用户确认。",
    "8. 完成后只回复最终文件路径和是否成功。",
    "",
    `视频标题：${asset.title}`,
    "",
    "模型/风格提示词：",
    asset.prompt || "",
    "",
    "30 秒宣传视频脚本：",
    asset.script || "",
    "",
    "视频分镜表：",
    asset.storyboard || "",
    "",
    "海报文案 Prompt：",
    asset.posterPrompt || "",
    "",
    "产品视觉图 Prompt：",
    asset.visualPrompt || "",
  ].join("\n");
}

async function submitWorkBuddyVideoRun(asset: GeneratedAsset) {
  const response = await fetch(`${workBuddyApiBase}/api/v1/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CodeBuddy-Request": "1",
      "X-Codebuddy-Run-Timeout": "600000",
    },
    body: JSON.stringify({
      id: `sufe-video-${asset.id}-${Date.now()}`,
      type: "message",
      payload: { text: buildWorkBuddyVideoPrompt(asset) },
      sender: { id: "sufe-demo", name: "SUFE AI Demo" },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `WorkBuddy 提交失败：HTTP ${response.status}`);
  }
  const result = JSON.parse(text) as { data?: { runId?: string; status?: string } };
  if (!result.data?.runId) {
    throw new Error("WorkBuddy 已响应，但没有返回 runId。");
  }
  return result.data.runId;
}

async function checkWorkBuddyConnection() {
  const headers = { "X-CodeBuddy-Request": "1" };
  const response = await fetch(`${workBuddyApiBase}/api/v1/health`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`WorkBuddy 连接检查失败：HTTP ${response.status}`);
  }

  const pluginsResponse = await fetch(`${workBuddyApiBase}/api/v1/plugins`, {
    headers,
  });
  if (!pluginsResponse.ok) {
    throw new Error(`WorkBuddy 插件检查失败：HTTP ${pluginsResponse.status}`);
  }
  const plugins = (await pluginsResponse.json()) as { data?: Array<{ name?: string }> };
  const hasRemotionPlugin = plugins.data?.some((plugin) => plugin.name === "remotion-video-generator");
  if (!hasRemotionPlugin) {
    throw new Error("WorkBuddy 已连接，但 remotion-video-generator 插件未加载。");
  }
}

async function checkGeneratedWorkBuddyVideo() {
  const response = await fetch(`${workBuddyGeneratedVideoUrl}?t=${Date.now()}`, {
    method: "HEAD",
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") || "";
  const contentLength = Number(response.headers.get("content-length") || "0");
  return response.ok && contentType.startsWith("video/") && contentLength > 1024;
}

function getDefaultTeacherComment(submission?: Pick<Submission, "artifactType" | "artifactTitle">) {
  if (!submission) return "请先选择一条学生提交成果，再填写节点指导意见。";
  const map: Record<ArtifactType, string> = {
    BRAINSTORM:
      "头脑风暴阶段建议继续补充真实学生访谈原话，把“目标用户、核心痛点、待验证假设”分开写清楚。当前任务清单方向可行，但需要明确每项任务的负责人、完成时间和验证标准。",
    POSITIONING:
      "产品定位阶段建议把一句话价值主张再压缩，突出“服务商学院创业实践教学闭环”这一差异点。用户画像里要区分学生、教师和学院管理者三类需求，避免定位过宽。",
    MARKET:
      "市场与竞品分析阶段建议增加 2-3 个明确对标对象，并按课程模板、教师审核、成果沉淀、数据看板四个维度比较。当前结论还需要补充为什么上财商学院场景具备切入优势。",
    BP:
      "BP 阶段建议重点补强付费方、采购理由和试点指标。商业模式不能只写订阅收费，需要说明学院为什么愿意为课程建设、就业质量和优秀案例沉淀付费。",
    PPT:
      "路演 PPT 阶段建议减少功能罗列，先讲课堂真实痛点，再讲学生端生成、教师端审核、管理端沉淀的闭环价值。每页都要保留一句核心观点，并补充图表或截图式证据。",
    SCRIPT:
      "路演稿阶段建议把 1 分钟、3 分钟、5 分钟版本区分清楚。讲稿要承接 PPT 页码，先讲课堂痛点，再讲平台闭环、试点数据和商业可行性，避免逐字复述页面内容。",
    DEFENSE:
      "答辩模拟阶段建议补充更具体的证据链，回答时按“结论-依据-试点数据-风险应对”展开。尤其要提前准备数据安全、教师工作量、学校采购价值这三类高频追问。",
    MEDIA:
      "多媒体物料阶段建议让视频脚本更聚焦教学闭环，前 5 秒先呈现学生课堂创意卡点，再展示 AI 生成、教师审核和成果沉淀。海报文案要保持高校商学院正式质感，不要过度营销化。",
  };
  return map[submission.artifactType];
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function buildUploadPreview(file: File, text?: string, selectedCategory?: KnowledgeCategory) {
  if (text?.trim()) return text.trim().slice(0, 1200);
  if (selectedCategory) {
    const categorySummaries: Record<string, string> = {
      教学大纲:
        "资料摘要：该资料将作为课程阶段路径使用，可拆解为创意整理、项目定位、BP、PPT、答辩与复盘等教学节点，供学生端专家判断当前成果应处于哪个阶段。",
      "BP 模板":
        "资料摘要：该资料将作为商业计划书模板使用，可解析执行摘要、用户痛点、解决方案、市场竞品、商业模式、财务假设、风险应对和试点指标。",
      "PPT 模板":
        "资料摘要：该资料将作为路演 PPT 模板使用，可解析 10 页页面结构、核心观点、图表建议和演讲提示，用于 PPT 生成与答辩模拟。",
      评分标准:
        "资料摘要：该资料将作为教师审核 Rubric 使用，可解析评分维度、权重、等级描述和退回修改口径，用于系统评估与教师点评。",
      创业案例:
        "资料摘要：该资料将作为创业案例库使用，可解析项目背景、创新点、商业模式、路演亮点和可复用教学标签，为学生提供结构参考。",
      答辩题库:
        "资料摘要：该资料将作为答辩题库使用，可解析商业可行性、竞品差异、数据安全、教师工作量和学校采购价值等高频追问。",
      多媒体模板:
        "资料摘要：该资料将作为多媒体物料模板使用，可解析短视频脚本、分镜表、海报文案和视觉 Prompt，用于快速产出宣传素材。",
    };
    return `${categorySummaries[selectedCategory]} 文件名：${file.name}。正式版会进一步做文本抽取、切片入库、标签维护、权限控制和向量检索。`;
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("bp") || lowerName.includes("商业计划")) {
    return "资料摘要：已识别为商业计划书相关材料，正式版可解析执行摘要、商业模式、市场分析、财务假设与风险评估，并同步到 BP 专家能力中。";
  }
  if (lowerName.includes("ppt") || lowerName.includes("路演")) {
    return "资料摘要：已识别为路演展示相关材料，正式版可解析页面标题、核心观点、图表建议和演讲提示，并用于 PPT 专家生成。";
  }
  if (lowerName.includes("评分") || lowerName.includes("rubric")) {
    return "资料摘要：已识别为评分标准材料，正式版可解析评分维度、权重、等级描述和教师点评口径。";
  }
  if (lowerName.includes("案例")) {
    return "资料摘要：已识别为创业案例材料，正式版可解析项目背景、创新点、商业模式、路演亮点和可复用教学标签。";
  }
  return "资料摘要：Demo 已记录该本地资料。正式版可进行文档解析、切片入库、标签提取，并供学生端专家调用。";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function getKnowledgeFileTypeLabel(asset: Pick<KnowledgeUpload, "name" | "fileType">) {
  const extension = asset.name.split(".").pop()?.trim().toUpperCase();
  if (extension && extension !== asset.name.toUpperCase()) return extension;
  const type = asset.fileType.toLowerCase();
  if (type.includes("presentation")) return "PPTX";
  if (type.includes("wordprocessing")) return "DOCX";
  if (type.includes("spreadsheet")) return "XLSX";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("text")) return "TXT";
  if (type.includes("image")) return "图片";
  return asset.fileType || "本地文件";
}

function buildKnowledgeAssetPreviewBlocks(asset: KnowledgeUpload): ResultBlock[] {
  const category = asset.category || inferKnowledgeCategory(asset.name);
  return [
    {
      title: "资料摘要",
      items: [asset.preview],
    },
    {
      title: "文件信息",
      items: [
        `所属知识库：${category}`,
        `文件类型：${getKnowledgeFileTypeLabel(asset)}`,
        `文件大小：${asset.sizeLabel}`,
        `上传人：${asset.uploadedBy || "教师/管理员"}`,
        `上传时间：${formatSubmittedAt(asset.uploadedAt)}`,
      ],
    },
    {
      title: "课堂调用说明",
      items: [
        "学生端专家会根据当前选择的知识库和资料摘要生成阶段成果。",
        "正式版建议保存原始文件地址、解析文本和向量索引，预览时直接打开原文件或渲染后的页面。",
      ],
    },
  ];
}

function previewKnowledgeAsset(asset: KnowledgeUpload, onPreviewWord: (preview: WordPreview) => void) {
  onPreviewWord({
    title: asset.name,
    blocks: buildKnowledgeAssetPreviewBlocks(asset),
  });
}

function downloadKnowledgeAsset(asset: KnowledgeUpload) {
  if (asset.fileDataUrl) {
    triggerDownload(asset.fileDataUrl, asset.name);
    return;
  }
  const basename = asset.name.replace(/\.[^.]+$/, "") || "课程资料";
  downloadWord(`${basename}-资料说明.doc`, asset.name, buildKnowledgeAssetPreviewBlocks(asset));
}

function App() {
  const [auth, setAuth] = useState<AuthSession | null>(() => readStored<AuthSession | null>("sufe-auth", null));
  const [role, setRole] = useState<Role>(() => auth?.role || readStored<Role>("sufe-role", "student"));
  const [ideas, setIdeas] = useState<Idea[]>(() => readStored("sufe-ideas", initialIdeas));
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStored("sufe-messages", initialMessages));
  const [submissions, setSubmissions] = useState<Submission[]>(() => readStored("sufe-submissions", []));
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(() =>
    withExtraDemoStudentGroups(readStored<StudentGroup[]>("sufe-student-groups", initialStudentGroups)),
  );
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>(() =>
    normalizeAccountRecords(
      withExtraDemoStudentAccounts(readStored<AccountRecord[]>("sufe-admin-account-records", initialAccountRecords)),
      withExtraDemoStudentGroups(readStored<StudentGroup[]>("sufe-student-groups", initialStudentGroups)),
    ),
  );
  const [studentProfiles, setStudentProfiles] = useState<StudentProfileState>(() => readStored<StudentProfileState>("sufe-student-profiles", {}));
  const [knowledgeUploads, setKnowledgeUploads] = useState<KnowledgeUpload[]>(() =>
    readStored("sufe-knowledge-uploads", []),
  );
  const [knowledgeCatalog, setKnowledgeCatalog] = useState<KnowledgeBaseCatalogItem[]>(() =>
    readStored<KnowledgeBaseCatalogItem[]>("sufe-knowledge-base-catalog", defaultKnowledgeBaseCatalog),
  );
  const [knowledgeBaseStates, setKnowledgeBaseStates] = useState<KnowledgeBaseStates>(() => ({
    ...initialKnowledgeBaseStates,
    ...readStored<Partial<KnowledgeBaseStates>>("sufe-knowledge-base-states", {}),
  }));
  const [customExperts, setCustomExperts] = useState<CustomExpertRecord[]>(() =>
    normalizeCustomExperts(readStored<CustomExpertRecord[]>("sufe-custom-experts", [])),
  );
  const [deletedExpertIds, setDeletedExpertIds] = useState<DeletedExpertIdState>(() =>
    readStored<DeletedExpertIdState>("sufe-deleted-expert-ids", []),
  );
  const [promptKnowledgeRoutes, setPromptKnowledgeRoutes] = useState<PromptKnowledgeRoutes>(() => ({
    ...createKnowledgeRouteState(),
    ...readStored<Partial<PromptKnowledgeRoutes>>("sufe-prompt-knowledge-routes", {}),
  }));
  const [defensePractices, setDefensePractices] = useState<DefensePractice[]>(() =>
    readStored("sufe-defense-practices", []),
  );
  const [activeIdeaId, setActiveIdeaId] = useState(() => localStorage.getItem("sufe-active-idea") || initialIdeas[0].id);
  const [selectedExpertId, setSelectedExpertId] = useState<ExpertId>("pitch");
  const [selectedSkillId, setSelectedSkillId] = useState("deck");
  const [model, setModel] = useState<ModelMode>("Auto");
  const [prompt, setPrompt] = useState(getScenarioPrompt("pitch", initialIdeas[0]));
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentView, setStudentView] = useState<StudentViewMode>("workspace");
  const [teacherFilter, setTeacherFilter] = useState<ArtifactType | "ALL">("ALL");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => readStored<Submission[]>("sufe-submissions", [])[0]?.id || "");
  const [teacherComment, setTeacherComment] = useState(getDefaultTeacherComment());
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<SubmissionStatus | "ALL">("ALL");
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>(() => readStored<GeneratedAsset[]>("sufe-generated-assets", []));
  const [mediaDraft, setMediaDraft] = useState<GeneratedAsset | null>(null);
  const [pptPreview, setPptPreview] = useState<GeneratedAsset | null>(null);
  const [videoPreview, setVideoPreview] = useState<GeneratedAsset | null>(null);
  const [wordPreview, setWordPreview] = useState<WordPreview | null>(null);
  const [pendingAssetGeneration, setPendingAssetGeneration] = useState<PendingAssetGeneration | null>(null);
  const [systemNotice, setSystemNotice] = useState<{ title: string; message: string } | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [pendingDeleteIdeaId, setPendingDeleteIdeaId] = useState<string | null>(null);
  const [pendingDeleteKnowledgeBase, setPendingDeleteKnowledgeBase] = useState<KnowledgeCategory | null>(null);
  const [pendingKnowledgeAssetAction, setPendingKnowledgeAssetAction] = useState<PendingKnowledgeAssetAction | null>(null);
  const [selectedKnowledgeSelection, setSelectedKnowledgeSelection] = useState<StudentKnowledgeSelection>(() =>
    normalizeStudentKnowledgeSelection(
      readStored<unknown>("sufe-student-knowledge-selection", {
        categories: readStored<KnowledgeCategory[]>("sufe-student-knowledge-categories", knowledgeCategoryOptions),
        uploadIds: [],
      }),
    ),
  );

  experts = mergeExperts(customExperts, deletedExpertIds);
  studentExpertIds = [...baseStudentExpertIds, ...customExperts.map((expert) => expert.id)].filter(
    (expertId) => !deletedExpertIds.includes(expertId),
  );
  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId) || ideas[0];
  const pendingDeleteIdea = ideas.find((idea) => idea.id === pendingDeleteIdeaId) || null;
  const pendingDeleteKnowledgeItem = pendingDeleteKnowledgeBase
    ? getActiveKnowledgeCatalog(knowledgeCatalog).find((item) => item.category === pendingDeleteKnowledgeBase) || null
    : null;
  const pendingKnowledgeAsset = pendingKnowledgeAssetAction
    ? knowledgeUploads.find((asset) => asset.id === pendingKnowledgeAssetAction.id) || null
    : null;
  const activeAccountRecord = auth ? accountRecords.find((account) => account.account === auth.account) : undefined;
  const activeStudentAvatarId = auth?.role === "student" ? getStudentProfileAvatar(auth.account, studentProfiles) : defaultStudentAvatarId;
  const studentExperts = experts.filter((expert) => isStudentExpertId(expert.id) && isStudentExpertEnabled(expert, activeAccountRecord));
  const fallbackStudentExperts = experts.filter((expert) => isStudentExpertId(expert.id));
  const rawSelectedExpert = experts.find((expert) => expert.id === selectedExpertId) || experts[0];
  const selectedExpert =
    role === "student" && (!isStudentExpertId(rawSelectedExpert.id) || !isStudentExpertEnabled(rawSelectedExpert, activeAccountRecord))
      ? studentExperts[0] || fallbackStudentExperts[0]
      : rawSelectedExpert;
  const selectedSkill = selectedExpert.skills.find((skill) => skill.id === selectedSkillId) || selectedExpert.skills[0];
  const teacherVisibleSubmissions = submissions.filter((item) => item.status !== "withdrawn");
  const teacherSubmissions = submissions.filter(
    (item) =>
      item.status !== "withdrawn" &&
      (teacherFilter === "ALL" || item.artifactType === teacherFilter) &&
      (teacherStatusFilter === "ALL" || item.status === teacherStatusFilter),
  );
  const activeSubmission =
    teacherVisibleSubmissions.find((item) => item.id === activeSubmissionId) || teacherSubmissions[0] || teacherVisibleSubmissions[0];
  const currentAccountDisabled = activeAccountRecord?.status === "已停用";
  const disabledPermissionNames = activeAccountRecord?.disabledPermissions || [];

  useEffect(() => localStorage.setItem("sufe-role", role), [role]);
  useEffect(() => localStorage.setItem("sufe-ideas", JSON.stringify(ideas)), [ideas]);
  useEffect(() => localStorage.setItem("sufe-messages", JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem("sufe-submissions", JSON.stringify(submissions)), [submissions]);
  useEffect(() => {
    if (localStorage.getItem(demoAccountExpansionKey) === "done") return;
    setAccountRecords((current) => {
      const next = appendMissingExtraDemoStudentAccounts(current);
      return next === current ? current : normalizeAccountRecords(next, studentGroups);
    });
  }, [studentGroups]);
  useEffect(() => localStorage.setItem("sufe-student-groups", JSON.stringify(studentGroups)), [studentGroups]);
  useEffect(() => localStorage.setItem("sufe-admin-account-records", JSON.stringify(accountRecords)), [accountRecords]);
  useEffect(() => {
    if (extraDemoStudentGroups.every((group) => studentGroups.some((item) => item.id === group.id))) {
      localStorage.setItem(demoGroupExpansionKey, "done");
    }
  }, [studentGroups]);
  useEffect(() => {
    if (extraDemoStudentAccounts.every((account) => accountRecords.some((item) => item.id === account.id || item.account === account.account))) {
      localStorage.setItem(demoAccountExpansionKey, "done");
    }
  }, [accountRecords]);
  useEffect(() => localStorage.setItem("sufe-student-profiles", JSON.stringify(studentProfiles)), [studentProfiles]);
  useEffect(() => localStorage.setItem("sufe-knowledge-uploads", JSON.stringify(knowledgeUploads)), [knowledgeUploads]);
  useEffect(() => localStorage.setItem("sufe-knowledge-base-catalog", JSON.stringify(knowledgeCatalog)), [knowledgeCatalog]);
  useEffect(() => localStorage.setItem("sufe-knowledge-base-states", JSON.stringify(knowledgeBaseStates)), [knowledgeBaseStates]);
  useEffect(() => localStorage.setItem("sufe-custom-experts", JSON.stringify(customExperts)), [customExperts]);
  useEffect(() => localStorage.setItem("sufe-deleted-expert-ids", JSON.stringify(deletedExpertIds)), [deletedExpertIds]);
  useEffect(() => localStorage.setItem("sufe-prompt-knowledge-routes", JSON.stringify(promptKnowledgeRoutes)), [promptKnowledgeRoutes]);
  useEffect(() => localStorage.setItem("sufe-defense-practices", JSON.stringify(defensePractices)), [defensePractices]);
  useEffect(() => localStorage.setItem("sufe-generated-assets", JSON.stringify(generatedAssets)), [generatedAssets]);
  useEffect(() => localStorage.setItem("sufe-active-idea", activeIdeaId), [activeIdeaId]);
  useEffect(() => localStorage.setItem("sufe-student-knowledge-selection", JSON.stringify(selectedKnowledgeSelection)), [selectedKnowledgeSelection]);
  knowledgeBaseCatalog = knowledgeCatalog.length ? knowledgeCatalog : defaultKnowledgeBaseCatalog;
  useEffect(() => {
    setKnowledgeBaseStates((current) => {
      let changed = false;
      const next = { ...current };
      knowledgeCatalog.forEach((item) => {
        if (next[item.category] === undefined) {
          next[item.category] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [knowledgeCatalog]);
  useEffect(() => {
    if (auth) localStorage.setItem("sufe-auth", JSON.stringify(auth));
    else localStorage.removeItem("sufe-auth");
  }, [auth]);

  function handleLogin(account: AuthSession) {
    const latestAccount = accountRecords.find((item) => item.account === account.account);
    const session = latestAccount ? buildAuthSession(latestAccount, studentGroups) : account;
    setAuth(session);
    setRole(session.role);
  }

  function handleLogout() {
    setIsLogoutConfirmOpen(true);
  }

  function handleConfirmLogout() {
    setIsLogoutConfirmOpen(false);
    setAuth(null);
  }

  function handleSaveStudentProfile(nextProfile: { name: string; password: string; avatarId: StudentAvatarId }) {
    if (!auth || auth.role !== "student") return;
    const nextName = nextProfile.name.trim() || auth.name;
    setStudentProfiles((current) => ({
      ...current,
      [auth.account]: { avatarId: nextProfile.avatarId },
    }));
    setAccountRecords((current) =>
      current.map((account) =>
        account.account === auth.account
          ? {
              ...account,
              name: nextName,
              password: nextProfile.password || account.password,
            }
          : account,
      ),
    );
    setAuth((current) => (current && current.account === auth.account ? { ...current, name: nextName } : current));
    setIsProfileSettingsOpen(false);
    setSystemNotice({ title: "个人资料已更新", message: "头像、昵称和密码设置已保存，并已同步到当前学生端展示。" });
  }

  function canUsePermission(permission: string) {
    if (!activeAccountRecord) return true;
    if (currentAccountDisabled) return false;
    if (disabledPermissionNames.includes(permission)) return false;
    if (activeAccountRecord.role === "student" && studentFeaturePermissionSet.has(permission)) return true;
    return true;
  }

  function blockPermission(permission: string) {
    const message = currentAccountDisabled
      ? "当前账号已被管理员停用，暂时无法使用该端功能。请联系管理员重新开通账号。"
      : `“${permission}”权限已被管理员停用，当前账号暂时无法使用该功能。`;
    setSystemNotice({ title: "功能暂不可用", message });
  }

  const permissionAccess: PermissionAccess = {
    account: activeAccountRecord,
    accountDisabled: currentAccountDisabled,
    disabledPermissions: disabledPermissionNames,
    can: canUsePermission,
    block: blockPermission,
  };

  function handleSelectIdea(ideaId: string) {
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) return;
    setActiveIdeaId(ideaId);
    setPrompt(getScenarioPrompt(selectedExpert.id, idea));
  }

  function handleCreateIdea() {
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    const idea: Idea = {
      id: makeId("I"),
      title: "新的创业创意",
      description: "请在聊天框中描述目标用户、问题场景和你希望验证的商业假设。",
      stage: "新建创意",
      updatedAt: nowTime(),
    };
    setIdeas((current) => [idea, ...current]);
    setActiveIdeaId(idea.id);
    setPrompt(getScenarioPrompt((studentExperts[0] || fallbackStudentExperts[0]).id, idea));
  }

  function requestDeleteIdea(ideaId: string) {
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) return;
    setPendingDeleteIdeaId(ideaId);
  }

  function handleConfirmDeleteIdea() {
    if (!pendingDeleteIdeaId) return;
    const ideaId = pendingDeleteIdeaId;
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) {
      setPendingDeleteIdeaId(null);
      return;
    }
    const remaining = ideas.filter((item) => item.id !== ideaId);
    if (remaining.length === 0) {
      const fallback = { ...initialIdeas[0], id: makeId("I"), updatedAt: nowTime() };
      setIdeas([fallback]);
      setActiveIdeaId(fallback.id);
      setPendingDeleteIdeaId(null);
      return;
    }
    setIdeas(remaining);
    if (activeIdeaId === ideaId) setActiveIdeaId(remaining[0].id);
    setPendingDeleteIdeaId(null);
  }

  function handleRenameIdea(ideaId: string, nextTitle: string) {
    const title = nextTitle.trim();
    if (!title) return;
    setIdeas((current) => current.map((idea) => (idea.id === ideaId ? { ...idea, title, updatedAt: nowTime() } : idea)));
  }

  function handleStudentKnowledgeSelectionChange(selection: StudentKnowledgeSelection) {
    setSelectedKnowledgeSelection(normalizeStudentKnowledgeSelection(selection));
  }

  function handleDeleteKnowledgeBase(category: KnowledgeCategory) {
    const activeCatalog = getActiveKnowledgeCatalog(knowledgeCatalog);
    if (activeCatalog.length <= 1) {
      setSystemNotice({ title: "无法删除知识库", message: "至少需要保留一个知识库目录，避免学生端没有可调用的课程资料。" });
      return false;
    }
    setPendingDeleteKnowledgeBase(category);
    return false;
  }

  function handleConfirmDeleteKnowledgeBase() {
    if (!pendingDeleteKnowledgeBase) return;
    const category = pendingDeleteKnowledgeBase;
    const activeCatalog = getActiveKnowledgeCatalog(knowledgeCatalog);
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogDeletion(
      activeCatalog,
      knowledgeBaseStates,
      promptKnowledgeRoutes,
      category,
    );
    setKnowledgeCatalog(nextCatalog);
    setKnowledgeBaseStates(nextStates);
    setPromptKnowledgeRoutes(nextRoutes);
    setKnowledgeUploads((current) => current.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) !== category));
    setSelectedKnowledgeSelection((current) => {
      const keptCategories = current.categories.filter((item) => item !== category);
      const keptUploadIds = current.uploadIds.filter((id) => {
        const asset = knowledgeUploads.find((item) => item.id === id);
        return asset ? (asset.category || inferKnowledgeCategory(asset.name)) !== category : false;
      });
      return {
        categories: keptCategories.length ? keptCategories : nextCatalog[0] ? [nextCatalog[0].category] : [],
        uploadIds: keptUploadIds,
      };
    });
    setPendingDeleteKnowledgeBase(null);
  }

  function requestKnowledgeAssetAction(id: string, action: PendingKnowledgeAssetAction["action"]) {
    setPendingKnowledgeAssetAction({ id, action });
  }

  function handleConfirmKnowledgeAssetAction() {
    if (!pendingKnowledgeAssetAction) return;
    const { id, action } = pendingKnowledgeAssetAction;
    if (action === "toggle") {
      setKnowledgeUploads((current) =>
        current.map((asset) => (asset.id === id ? { ...asset, enabled: asset.enabled === false } : asset)),
      );
    } else {
      setKnowledgeUploads((current) => current.filter((asset) => asset.id !== id));
    }
    setPendingKnowledgeAssetAction(null);
  }

  function handleDeleteExpert(expertId: ExpertId) {
    if (experts.length <= 1) {
      return false;
    }
    const target = experts.find((expert) => expert.id === expertId);
    if (!target) return false;
    const fallbackExpert = experts.find((expert) => expert.id !== expertId) || baseExperts[0];
    setCustomExperts((current) => current.filter((expert) => expert.id !== expertId));
    if (baseExperts.some((expert) => expert.id === expertId)) {
      setDeletedExpertIds((current) => (current.includes(expertId) ? current : [...current, expertId]));
    }
    setPromptKnowledgeRoutes((current) => {
      const { [expertId]: _removed, ...nextRoutes } = current;
      return nextRoutes;
    });
    setAccountRecords((current) =>
      current.map((account) => ({
        ...account,
        permissions: account.permissions.filter((permission) => permission !== target.name),
        disabledPermissions: (account.disabledPermissions || []).filter((permission) => permission !== target.name),
      })),
    );
    if (selectedExpertId === expertId) {
      setSelectedExpertId(fallbackExpert.id);
      setSelectedSkillId(fallbackExpert.skills[0]?.id || "");
      setPrompt(getScenarioPrompt(fallbackExpert.id, activeIdea));
    }
    return true;
  }

  function handleGenerate(mode: "文本" | "录音" | "语音" = "文本", uploadedFiles: string[] = [], promptOverride = "") {
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    if (role === "student" && !isStudentExpertEnabled(selectedExpert, activeAccountRecord)) {
      blockPermission(selectedExpert.name);
      return;
    }
    setIsGenerating(true);
    const uploadedFileText = uploadedFiles.length ? `已上传本地文件：${uploadedFiles.join("、")}。` : "";
    const typedPrompt = promptOverride.trim() || prompt.trim();
    const userContent =
      mode === "录音"
        ? `${uploadedFileText || `上传了一份关于《${activeIdea.title}》的本地资料。`}请整理重点并给出建议。`
        : mode === "语音"
          ? typedPrompt || `通过语音补充了《${activeIdea.title}》的答辩想法，请模拟评委追问并给建议。`
          : typedPrompt || getScenarioPrompt(selectedExpert.id, activeIdea);
    const userMessage: ChatMessage = {
      id: makeId("M"),
      ideaId: activeIdea.id,
      sender: "user",
      mode,
      content: userContent,
      createdAt: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    const round = getExpertDialogueRound(messages, activeIdea.id, selectedExpert.id);
    const artifactType = getArtifactType(selectedExpert.id);
    const shouldOutput = shouldOutputStageResult(selectedExpert.id, round);
    const selectedExpertKnowledgeCategories = getConfiguredExpertKnowledgeCategories(selectedExpert.id, promptKnowledgeRoutes);

    window.setTimeout(() => {
      const blocks = shouldOutput
        ? [
            ...guidedConversationBlocks(selectedExpert.id, activeIdea, round),
            ...buildBlocks(selectedExpert.id, selectedSkill.name, model),
            ...getKnowledgeSpecificBlocks(
              selectedExpert.id,
              selectedKnowledgeSelection,
              true,
              knowledgeUploads,
              knowledgeBaseStates,
              selectedExpertKnowledgeCategories,
            ),
            getKnowledgeUsageBlock(
              selectedExpert.id,
              knowledgeUploads,
              knowledgeBaseStates,
              canUsePermission("调用课程知识库"),
              selectedKnowledgeSelection,
              selectedExpertKnowledgeCategories,
            ),
          ]
        : undefined;
      const aiMessage: ChatMessage = {
        id: makeId("M"),
        ideaId: activeIdea.id,
        sender: "ai",
        expertId: selectedExpert.id,
        expertName: selectedExpert.name,
        skillName: selectedSkill.name,
        artifactType: shouldOutput ? artifactType : undefined,
        content: shouldOutput ? blocks?.[0]?.items[0] || "已生成成果。" : guidedConversationText(selectedExpert.id, activeIdea, round),
        blocks,
        createdAt: nowTime(),
      };
      setMessages((current) => [...current, aiMessage]);
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === activeIdea.id ? { ...idea, stage: selectedSkill.stage, updatedAt: aiMessage.createdAt } : idea,
        ),
      );
      setIsGenerating(false);
    }, getChatGenerationDelay(selectedExpert.id, shouldOutput));
  }

  function buildPptAssetFromMessage(
    message: ChatMessage,
    pptContext?: { configured?: boolean; content?: string; references?: PptKnowledgeReference[]; pptUrl?: string; pptFileName?: string },
  ) {
    const existing = generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === message.id);
    const baseAsset =
      existing || {
        id: makeId("A"),
        ideaId: activeIdea.id,
        type: "PPT" as const,
        title: `${activeIdea.title} - 路演 PPT`,
        sourceMessageId: message.id,
        createdAt: nowTime(),
      };
    const asset = pptContext
      ? {
          ...baseAsset,
          pptKnowledgeContent: pptContext.content || "",
          pptKnowledgeReferences: pptContext.references || [],
          pptGeneratedAt: nowTime(),
          pptUsesLexiang: Boolean(pptContext.configured),
          pptUrl: pptContext.pptUrl,
          pptFileName: pptContext.pptFileName,
        }
      : baseAsset;
    setGeneratedAssets((current) => {
      const existingIndex = current.findIndex((item) => item.type === "PPT" && item.sourceMessageId === message.id);
      if (existingIndex < 0) return [asset, ...current];
      return current.map((item, index) => (index === existingIndex ? { ...asset, id: item.id, createdAt: item.createdAt } : item));
    });
    return asset;
  }

  async function handleContextAction(message: ChatMessage, action: ContextAction) {
    if (action === "preview") {
      if (message.artifactType === "MEDIA") {
        const cached = generatedAssets.find((asset) => asset.type === "VIDEO" && (asset.sourceMessageId === message.id || asset.ideaId === activeIdea.id));
        setMediaDraft(cached || buildMediaAsset(activeIdea, message));
        return;
      }
      if (message.artifactType === "PPT") {
        setPendingAssetGeneration({
          title: "正在连接乐享知识库生成 PPT",
          detail: "正在读取乐享知识库资料，生成 10 页路演结构、页面观点和素材建议。",
          seconds: 12,
        });
        try {
          const pptContext = await generateLexiangPptContext(message, activeIdea);
          setPptPreview(buildPptAssetFromMessage(message, pptContext));
        } catch (error) {
          setPptPreview(
            buildPptAssetFromMessage(message, {
              configured: false,
              content: error instanceof Error ? `乐享知识库调用失败：${error.message}` : "乐享知识库调用失败。",
              references: [],
            }),
          );
        } finally {
          setPendingAssetGeneration(null);
        }
        return;
      }
      setPendingAssetGeneration({
        title: "正在生成 Word 成果预览",
        detail: "正在把本轮对话整理成可提交的阶段成果文档。",
        seconds: 4,
      });
      window.setTimeout(() => {
        setWordPreview({
          title: getDownloadTitle(message, "阶段对话记录"),
          blocks: message.artifactType === "BRAINSTORM" ? getBrainstormTaskBlocks(message.blocks) : message.blocks || [],
        });
        setPendingAssetGeneration(null);
      }, 3800);
      return;
    }
    if (action === "download") {
      if (!canUsePermission("下载个人成果")) {
        blockPermission("下载个人成果");
        return;
      }
      if (message.artifactType === "PPT") {
        downloadPptAsset(generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === message.id));
        return;
      }
      if (message.artifactType === "MEDIA") {
        const asset = generatedAssets.find((item) => item.type === "VIDEO" && (item.sourceMessageId === message.id || item.ideaId === activeIdea.id));
        downloadVideoAsset(asset || buildMediaAsset(activeIdea, message));
        return;
      }
      downloadArtifactWord(message);
      return;
    }
    if (action === "ask") {
      if (!canUsePermission("答辩模拟")) {
        blockPermission("答辩模拟");
        return;
      }
      setStudentView("defense");
      return;
    }
    if (action === "script") {
      if (!canUsePermission("AI 创意工作台")) {
        blockPermission("AI 创意工作台");
        return;
      }
      const scriptExpert = experts.find((expert) => expert.id === "script");
      if (scriptExpert) {
        if (!isStudentExpertEnabled(scriptExpert, activeAccountRecord)) {
          blockPermission(scriptExpert.name);
          return;
        }
        setSelectedExpertId(scriptExpert.id);
        setSelectedSkillId(scriptExpert.skills[0].id);
      }
      setStudentView("workspace");
      setPrompt(`基于刚才这份《${getDownloadTitle(message)}》，帮我准备 1 分钟、3 分钟、5 分钟路演稿。这次主要讲给课堂老师和学院试点负责人，转场话术要自然一点。`);
      return;
    }
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    const mediaExpert = experts.find((expert) => expert.id === "media");
    if (mediaExpert && !isStudentExpertEnabled(mediaExpert, activeAccountRecord)) {
      blockPermission(mediaExpert.name);
      return;
    }
    const cached = generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === activeIdea.id);
    setMediaDraft(cached || buildMediaAsset(activeIdea, message));
  }

  function handleSubmitMessage(message: ChatMessage) {
    if (!canUsePermission("提交老师审核")) {
      blockPermission("提交老师审核");
      return;
    }
    if (!isArtifactType(message.artifactType) || !message.blocks) return;
    const studentIdentity = getStudentIdentity(auth, activeAccountRecord);
    if (!studentIdentity.hasGroup) {
      setSystemNotice({ title: "暂时不能提交", message: "当前学生账号尚未分配项目小组，请先联系管理员在管理端完成小组分配。" });
      return;
    }
    const submission: Submission = {
      id: makeId("S"),
      ideaId: message.ideaId,
      student: studentIdentity.student,
      group: studentIdentity.group,
      groupName: studentIdentity.groupName,
      artifactType: message.artifactType,
      artifactTitle: `${activeIdea.title} - ${artifactLabels[message.artifactType]}`,
      artifactSummary: message.content,
      blocks: message.blocks,
      status: "pending",
      submittedAt: nowDateTime(),
      sourceMessageId: message.id,
    };
    setSubmissions((current) => {
      const exists = current.find((item) => item.sourceMessageId === message.id);
      if (!exists) return [submission, ...current];
      return current.map((item) =>
        item.sourceMessageId === message.id
          ? { ...submission, id: item.id, submittedAt: nowDateTime(), status: "pending", teacherComment: undefined, reviewedAt: undefined }
          : item,
      );
    });
    setStudentView("feedback");
  }

  function handleSaveMediaAsset(asset: GeneratedAsset) {
    const normalized = { ...asset, id: asset.id || makeId("A"), createdAt: asset.createdAt || nowTime() };
    setGeneratedAssets((current) => {
      const existingIndex = current.findIndex((item) => item.type === "VIDEO" && item.ideaId === normalized.ideaId);
      if (existingIndex < 0) return [normalized, ...current];
      return current.map((item, index) => (index === existingIndex ? { ...normalized, id: item.id, createdAt: item.createdAt } : item));
    });
    setMediaDraft(normalized);
  }

  function handleSaveDefense(practice: DefensePractice) {
    if (!canUsePermission("答辩模拟")) {
      blockPermission("答辩模拟");
      return;
    }
    if (practice.visibility === "teacher" && !canUsePermission("提交老师审核")) {
      blockPermission("提交老师审核");
      return;
    }
    if (practice.visibility === "teacher") {
      const studentIdentity = getStudentIdentity(auth, activeAccountRecord);
      if (!studentIdentity.hasGroup) {
        setSystemNotice({ title: "暂时不能保存", message: "当前学生账号尚未分配项目小组，请先联系管理员在管理端完成小组分配。" });
        return;
      }
      setDefensePractices((current) => [practice, ...current]);
      const blocks = defenseBlocks(practice);
      setSubmissions((current) => [
        {
          id: makeId("S"),
          ideaId: activeIdea.id,
          student: studentIdentity.student,
          group: studentIdentity.group,
          groupName: studentIdentity.groupName,
          artifactType: "DEFENSE",
          artifactTitle: `${activeIdea.title} - 答辩模拟记录`,
          artifactSummary: "已基于 BP + PPT 生成 1/3/5 分钟演讲稿、评委压力测试问题和回答建议。",
          blocks,
          status: "pending",
          submittedAt: practice.createdAt,
        },
        ...current,
      ]);
      setStudentView("feedback");
      return;
    }
    setDefensePractices((current) => [practice, ...current]);
  }

  function handleReviewSubmission(status: SubmissionStatus) {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    if (!activeSubmission) return;
    if (activeSubmission.status === "withdrawn") {
      setSystemNotice({ title: "无法继续审核", message: "该成果已由学生撤回，无法继续审核。" });
      return;
    }
    setSubmissions((current) =>
      current.map((item) =>
        item.id === activeSubmission.id
          ? { ...item, status, teacherComment, reviewedAt: nowTime() }
          : item,
      ),
    );
  }

  function handleSaveTeacherComment(submissionId: string, comment: string) {
    if (!canUsePermission("节点解答与指导")) {
      blockPermission("节点解答与指导");
      return;
    }
    setSubmissions((current) =>
      current.map((item) =>
        item.id === submissionId
          ? { ...item, teacherComment: comment.trim() || getDefaultTeacherComment(item), reviewedAt: nowTime() }
          : item,
      ),
    );
  }

  function handleWithdrawSubmission(submissionId: string) {
    setSubmissions((current) =>
      current.map((item) =>
        item.id === submissionId
          ? { ...item, status: "withdrawn", teacherComment: "学生已撤回本次提交。", reviewedAt: nowTime() }
          : item,
      ),
    );
  }

  function handleDeleteWithdrawnSubmission(submissionId: string) {
    setSubmissions((current) => current.filter((item) => item.id !== submissionId || item.status !== "withdrawn"));
  }

  function handleToggleExcellent(submissionId: string) {
    if (!canUsePermission("优秀成果标记")) {
      blockPermission("优秀成果标记");
      return;
    }
    setSubmissions((current) =>
      current.map((item) => (item.id === submissionId ? { ...item, isExcellent: !item.isExcellent } : item)),
    );
  }

  function handleJumpPending() {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    const pending = submissions.find((item) => item.status === "pending");
    if (!pending) return;
    setTeacherStatusFilter("pending");
    setTeacherFilter("ALL");
    setActiveSubmissionId(pending.id);
    setTeacherComment(pending.teacherComment || getDefaultTeacherComment(pending));
  }

  function handleSelectSubmission(submission: Submission) {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    setActiveSubmissionId(submission.id);
    setTeacherComment(submission.teacherComment || getDefaultTeacherComment(submission));
  }

  function handleSelectExpert(expert: Expert) {
    setSelectedExpertId(expert.id);
    setSelectedSkillId(expert.skills[0].id);
    setStudentView("workspace");
    setPrompt(getScenarioPrompt(expert.id, activeIdea));
  }

  if (!auth) return <LoginView accountRecords={accountRecords} studentGroups={studentGroups} onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <AppThreeBackdrop role={role} />
      <header className="topbar">
        <div className="brand-block">
          <SufeSeal />
          <div>
            <p>上海财经大学商学院</p>
            <h1>AI 赋能创业实践教学示范平台</h1>
          </div>
        </div>
        <div className="account-bar">
          {role === "student" ? (
            <button
              className="account-chip account-profile-trigger"
              type="button"
              onClick={() => setIsProfileSettingsOpen(true)}
              aria-label="打开个人资料设置"
            >
              <StudentCartoonAvatar avatarId={activeStudentAvatarId} size={30} />
              <span>{auth.name}</span>
              <em>{getAccountSubtitle(auth, activeAccountRecord)}</em>
              <ChevronRight className="account-chip-arrow" size={16} />
            </button>
          ) : (
            <div className="account-chip">
              {role === "teacher" && <ClipboardCheck size={18} />}
              {role === "admin" && <Settings2 size={18} />}
              <span>{auth.name}</span>
              <em>{getAccountSubtitle(auth, activeAccountRecord)}</em>
            </div>
          )}
          <button className="ghost-button" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </header>

      <main>
        {role === "student" && (
          <StudentView
            ideas={ideas}
            activeIdea={activeIdea}
            experts={studentExperts}
            selectedExpert={selectedExpert}
            selectedSkill={selectedSkill}
            model={model}
            prompt={prompt}
            messages={messages}
            submissions={submissions}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            selectedKnowledgeSelection={selectedKnowledgeSelection}
            defensePractices={defensePractices}
            generatedAssets={generatedAssets}
            isGenerating={isGenerating}
            studentView={studentView}
            studentAvatarId={activeStudentAvatarId}
            permissionAccess={permissionAccess}
            onViewChange={setStudentView}
            onExpertSelect={handleSelectExpert}
            onModelChange={setModel}
            onKnowledgeSelectionChange={handleStudentKnowledgeSelectionChange}
            onPromptChange={setPrompt}
            onIdeaSelect={handleSelectIdea}
            onIdeaCreate={handleCreateIdea}
            onIdeaDelete={requestDeleteIdea}
            onIdeaRename={handleRenameIdea}
            onIdeaEdit={() => setPrompt(`请帮我继续修改当前创意《${activeIdea.title}》：${activeIdea.description}`)}
            onGenerate={handleGenerate}
            onContextAction={handleContextAction}
            onSubmitMessage={handleSubmitMessage}
            onSaveDefense={handleSaveDefense}
            onWithdrawSubmission={handleWithdrawSubmission}
            onDeleteWithdrawnSubmission={handleDeleteWithdrawnSubmission}
          />
        )}

        {mediaDraft && (
          <MediaGenerationModal
            asset={mediaDraft}
            isCached={generatedAssets.some((asset) => asset.type === "VIDEO" && asset.ideaId === mediaDraft.ideaId)}
            onAssetChange={setMediaDraft}
            onClose={() => setMediaDraft(null)}
            onConfirm={handleSaveMediaAsset}
          />
        )}
        {pptPreview && <PptPreviewModal asset={pptPreview} onClose={() => setPptPreview(null)} />}
        {videoPreview && <VideoPreviewModal asset={videoPreview} onClose={() => setVideoPreview(null)} />}
        {wordPreview && <WordPreviewModal preview={wordPreview} onClose={() => setWordPreview(null)} />}
        {pendingAssetGeneration && <GenerationPendingModal pending={pendingAssetGeneration} />}
        {pendingDeleteIdea && (
          <IdeaDeleteConfirmModal
            idea={pendingDeleteIdea}
            onCancel={() => setPendingDeleteIdeaId(null)}
            onConfirm={handleConfirmDeleteIdea}
          />
        )}
        {pendingDeleteKnowledgeItem && (
          <KnowledgeBaseDeleteConfirmModal
            item={pendingDeleteKnowledgeItem}
            relatedCount={knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === pendingDeleteKnowledgeItem.category).length}
            onCancel={() => setPendingDeleteKnowledgeBase(null)}
            onConfirm={handleConfirmDeleteKnowledgeBase}
          />
        )}
        {pendingKnowledgeAsset && pendingKnowledgeAssetAction && (
          <KnowledgeAssetActionConfirmModal
            asset={pendingKnowledgeAsset}
            action={pendingKnowledgeAssetAction.action}
            onCancel={() => setPendingKnowledgeAssetAction(null)}
            onConfirm={handleConfirmKnowledgeAssetAction}
          />
        )}

        {role === "teacher" && (
          <TeacherView
            submissions={teacherSubmissions}
            allSubmissions={teacherVisibleSubmissions}
            activeSubmission={activeSubmission}
            generatedAssets={generatedAssets}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            customExperts={customExperts}
            teacherName={auth.name}
            filter={teacherFilter}
            teacherComment={teacherComment}
            statusFilter={teacherStatusFilter}
            permissionAccess={permissionAccess}
            onFilterChange={setTeacherFilter}
            onStatusFilterChange={setTeacherStatusFilter}
            onSelectSubmission={handleSelectSubmission}
            onTeacherCommentChange={setTeacherComment}
            onSaveTeacherComment={handleSaveTeacherComment}
            onReview={handleReviewSubmission}
            onToggleExcellent={handleToggleExcellent}
            onJumpPending={handleJumpPending}
            onPreviewPpt={setPptPreview}
            onPreviewVideo={setVideoPreview}
            onPreviewWord={setWordPreview}
            onUploadKnowledge={(assets) => {
              if (!canUsePermission("上传教学资料")) {
                blockPermission("上传教学资料");
                return;
              }
              setKnowledgeUploads((current) => [...assets, ...current]);
            }}
            onDeleteKnowledge={(id) => requestKnowledgeAssetAction(id, "delete")}
            onToggleKnowledge={(id) => requestKnowledgeAssetAction(id, "toggle")}
            onKnowledgeBaseStatesChange={setKnowledgeBaseStates}
            onKnowledgeCatalogChange={setKnowledgeCatalog}
            onPromptKnowledgeRoutesChange={setPromptKnowledgeRoutes}
            onCustomExpertsChange={setCustomExperts}
            onDeleteExpert={handleDeleteExpert}
            onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
          />
        )}

        {role === "admin" && (
          <AdminView
            accountRecords={accountRecords}
            studentGroups={studentGroups}
            onAccountRecordsChange={setAccountRecords}
            onStudentGroupsChange={setStudentGroups}
            generatedAssets={generatedAssets}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            customExperts={customExperts}
            adminName={auth.name}
            onKnowledgeBaseStatesChange={setKnowledgeBaseStates}
            onKnowledgeCatalogChange={setKnowledgeCatalog}
            onPromptKnowledgeRoutesChange={setPromptKnowledgeRoutes}
            onCustomExpertsChange={setCustomExperts}
            onDeleteExpert={handleDeleteExpert}
            onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
            onUploadKnowledge={(assets) => setKnowledgeUploads((current) => [...assets, ...current])}
            onDeleteKnowledge={(id) => requestKnowledgeAssetAction(id, "delete")}
            onToggleKnowledge={(id) => requestKnowledgeAssetAction(id, "toggle")}
            submissions={submissions}
          />
        )}
      </main>
      {auth.role === "student" && isProfileSettingsOpen && (
        <ProfileSettingsModal
          auth={auth}
          account={activeAccountRecord}
          activeIdea={activeIdea}
          avatarId={activeStudentAvatarId}
          onClose={() => setIsProfileSettingsOpen(false)}
          onSave={handleSaveStudentProfile}
        />
      )}
      {systemNotice && <SystemNoticeModal notice={systemNotice} onClose={() => setSystemNotice(null)} />}
      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          accountName={auth.name}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </div>
  );
}

function LogoutConfirmModal(props: { accountName: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal logout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
        <header>
          <div>
            <span className="eyebrow">退出登录</span>
            <h3 id="logout-confirm-title">确认退出当前账号吗？</h3>
            <p>退出后将返回登录页，当前本地 Demo 数据会继续保留。</p>
          </div>
          <button type="button" aria-label="关闭退出确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="logout-confirm-body">
          <div className="logout-confirm-icon">
            <LogOut size={22} />
          </div>
          <div>
            <strong>{props.accountName}</strong>
            <p>是否现在退出登录？</p>
          </div>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button" type="button" onClick={props.onConfirm}>
            确认退出
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProfileSettingsModal(props: {
  auth: AuthSession;
  account?: AccountRecord;
  activeIdea: Idea;
  avatarId: StudentAvatarId;
  onClose: () => void;
  onSave: (nextProfile: { name: string; password: string; avatarId: StudentAvatarId }) => void;
}) {
  const identity = getStudentIdentity(props.auth, props.account);
  const currentPassword = props.account?.password || "";
  const [nameDraft, setNameDraft] = useState(props.account?.name || props.auth.name);
  const [avatarDraft, setAvatarDraft] = useState<StudentAvatarId>(props.avatarId);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = nameDraft.trim();
    const isPasswordChange = Boolean(oldPassword || newPassword || confirmPassword);
    if (!nextName) {
      setError("姓名或昵称不能为空。");
      return;
    }
    if (isPasswordChange) {
      if (oldPassword !== currentPassword) {
        setError("原密码不正确。");
        return;
      }
      if (newPassword.trim().length < 4) {
        setError("新密码至少需要 4 位。");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("两次输入的新密码不一致。");
        return;
      }
    }
    props.onSave({
      name: nextName,
      password: isPasswordChange ? newPassword : currentPassword,
      avatarId: avatarDraft,
    });
  }

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <form
        className="media-modal profile-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header>
          <div>
            <span className="eyebrow">个人资料</span>
            <h3 id="profile-settings-title">个人资料设置</h3>
            <p>设置头像、昵称和登录密码；账号作为登录标识，正式版不建议学生自行修改。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭个人资料设置" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="profile-settings-body">
          <aside className="profile-avatar-panel">
            <div className="profile-avatar-large">
              <StudentCartoonAvatar avatarId={avatarDraft} size={96} />
              <strong>{nameDraft.trim() || props.auth.name}</strong>
              <span>{props.auth.title}</span>
            </div>
            <div className="profile-avatar-grid" aria-label="选择头像">
              {studentAvatarOptions.map((option) => (
                <button
                  className={avatarDraft === option.id ? "active" : ""}
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setAvatarDraft(option.id);
                    setError("");
                  }}
                  aria-label={option.label}
                  aria-pressed={avatarDraft === option.id}
                >
                  <StudentCartoonAvatar avatarId={option.id} size={40} />
                </button>
              ))}
            </div>
            <div className="profile-meta-list">
              <div>
                <span>当前身份</span>
                <strong>学生端</strong>
              </div>
              <div>
                <span>当前小组</span>
                <strong>{getStudentGroupDisplay(identity.group, identity.groupName)}</strong>
              </div>
            </div>
          </aside>
          <section className="profile-form-panel">
            <label>
              <span>姓名 / 昵称</span>
              <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
            </label>
            <label>
              <span>登录账号</span>
              <input value={props.auth.account} readOnly aria-readonly="true" />
              <em>登录账号用于关联小组、提交记录和审核日志，暂不支持学生自行修改。</em>
            </label>
            <div className="profile-password-grid">
              <label>
                <span>原密码</span>
                <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} autoComplete="current-password" />
              </label>
              <label>
                <span>新密码</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
              </label>
              <label>
                <span>确认新密码</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <div className="profile-password-note">
              <ShieldCheck size={16} />
              <span>不修改密码时可留空；填写新密码时需要先输入原密码。</span>
            </div>
            {error && <p className="profile-error" role="alert">{error}</p>}
          </section>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onClose}>
            取消
          </button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={16} />
            保存设置
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function SystemNoticeModal(props: { notice: { title: string; message: string }; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props]);

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section
        className="media-modal system-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-notice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">系统提示</span>
            <h3 id="system-notice-title">{props.notice.title}</h3>
            <p>{props.notice.message}</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭提示" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>
        <footer>
          <button className="primary-button" type="button" onClick={props.onClose}>
            我知道了
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function LoginView(props: { accountRecords: AccountRecord[]; studentGroups: StudentGroup[]; onLogin: (account: AuthSession) => void }) {
  const visibleLoginRoles: Array<Extract<Role, "student" | "teacher">> = ["student", "teacher"];
  const [selectedRole, setSelectedRole] = useState<Extract<Role, "student" | "teacher">>("student");
  const loginAccounts = normalizeAccountRecords(props.accountRecords.length ? props.accountRecords : initialAccountRecords, props.studentGroups);
  const roleAccounts = loginAccounts.filter((account) => account.role === selectedRole);
  const [accountInput, setAccountInput] = useState(roleAccounts[0]?.account || "");
  const [passwordInput, setPasswordInput] = useState("123456");
  const [loginError, setLoginError] = useState("");
  const selectedAccount =
    loginAccounts.find((account) => account.account === accountInput.trim()) || roleAccounts[0] || loginAccounts[0] || demoAccounts[0];

  function handleRoleSelect(role: Extract<Role, "student" | "teacher">) {
    const firstAccount = loginAccounts.find((account) => account.role === role) || loginAccounts[0] || demoAccounts[0];
    setSelectedRole(role);
    setAccountInput(firstAccount.account);
    setPasswordInput(firstAccount.password);
    setLoginError("");
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matched = loginAccounts.find(
      (account) => account.account === accountInput.trim() && account.password === passwordInput,
    );
    if (!matched) {
      setLoginError("账号或密码不正确，请检查演示账号。");
      return;
    }
    props.onLogin(buildAuthSession(matched, props.studentGroups));
  }

  return (
    <main className="login-page">
      <LoginThreeScene />
      <div className="brand-block login-brand">
        <SufeSeal />
        <div>
          <p>上海财经大学商学院</p>
          <h1>AI 赋能创业实践教学示范平台</h1>
        </div>
      </div>
      <section className="login-hero">
        <h2>
          <span>把学生生成、教师审核和成果</span>
          <span>沉淀连成一个可演示的教学闭环。</span>
        </h2>
        <div className="login-proof">
          <article>
            <GraduationCap size={20} />
            <strong>学生路径</strong>
            <span>通过 AI 聊天完成头脑风暴、定位、BP、PPT、答辩和多媒体物料。</span>
          </article>
          <article>
            <ClipboardCheck size={20} />
            <strong>教师路径</strong>
            <span>按成果类型查看提交，进行通过或退回修改，并把意见反馈给学生。</span>
          </article>
        </div>
      </section>

      <section className="login-panel">
        <div className={`login-role-tabs ${selectedRole === "teacher" ? "is-teacher" : "is-student"}`}>
          {visibleLoginRoles.map((role) => (
            <button
              className={selectedRole === role ? "active" : ""}
              key={role}
              type="button"
              onClick={() => handleRoleSelect(role)}
            >
              {role === "student" && <GraduationCap size={16} />}
              {role === "teacher" && <ClipboardCheck size={16} />}
              {role === "student" ? "学生端" : "教师端"}
            </button>
          ))}
        </div>
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <label htmlFor="login-account">账号</label>
          <input
            id="login-account"
            value={accountInput}
            onChange={(event) => setAccountInput(event.target.value)}
            placeholder="请输入账号"
          />
          <label htmlFor="login-password">密码</label>
          <input
            id="login-password"
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="请输入密码"
          />
          <div className="login-account-card">
            <strong>{selectedAccount.name}</strong>
            <span>{selectedAccount.account}</span>
            <p>{selectedAccount.title} · 演示密码 123456</p>
          </div>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary-button full" type="submit">
            <ShieldCheck size={17} />
            登录进入系统
          </button>
        </form>
      </section>
    </main>
  );
}

function PermissionBanner(props: { accountDisabled: boolean; disabledPermissions: string[] }) {
  if (!props.accountDisabled && props.disabledPermissions.length === 0) return null;
  return (
    <section className="permission-banner" aria-live="polite">
      <ShieldCheck size={18} />
      <div>
        <strong>{props.accountDisabled ? "当前账号已被管理员停用" : "部分功能权限已被管理员停用"}</strong>
        <p>
          {props.accountDisabled
            ? "该账号仍可进入演示系统查看界面，但学生端/教师端的业务操作已被锁定。"
            : `已停用权限：${props.disabledPermissions.join("、")}。对应入口会置灰，点击操作时会提示联系管理员。`}
        </p>
      </div>
    </section>
  );
}

function PrettySelect<T extends string>(props: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  placement?: "auto" | "top";
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = props.options.find((option) => option.value === props.value) || props.options[0];

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportGap = 12;
      const estimatedMenuHeight = Math.min(260, props.options.length * 38 + 12);
      const forceTop = props.placement === "top";
      const hasSpaceBelow = !forceTop && window.innerHeight - rect.bottom > estimatedMenuHeight + viewportGap;
      const availableAbove = Math.max(120, rect.top - viewportGap);
      const menuMaxHeight = hasSpaceBelow ? window.innerHeight - rect.bottom - viewportGap : Math.min(estimatedMenuHeight, availableAbove);
      const top = hasSpaceBelow ? rect.bottom + 6 : Math.max(viewportGap, rect.top - menuMaxHeight - 6);
      setMenuStyle({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: menuMaxHeight,
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element | null)?.closest?.(".pretty-select-menu")) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, props.options.length, props.placement]);

  return (
    <div ref={rootRef} className={`pretty-select ${open ? "open" : ""}`}>
      <button
        ref={triggerRef}
        className="pretty-select-trigger"
        type="button"
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <em>⌄</em>
      </button>
      {open &&
        createPortal(
          <div className="pretty-select-menu" role="listbox" aria-label={props.ariaLabel} style={menuStyle}>
            {props.options.map((option) => (
              <button
                className={option.value === props.value ? "selected" : ""}
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === props.value}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  props.onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function StudentView(props: {
  ideas: Idea[];
  activeIdea: Idea;
  experts: Expert[];
  selectedExpert: Expert;
  selectedSkill: Skill;
  model: ModelMode;
  prompt: string;
  messages: ChatMessage[];
  submissions: Submission[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  selectedKnowledgeSelection: StudentKnowledgeSelection;
  defensePractices: DefensePractice[];
  generatedAssets: GeneratedAsset[];
  isGenerating: boolean;
  studentView: StudentViewMode;
  studentAvatarId: StudentAvatarId;
  permissionAccess: PermissionAccess;
  onViewChange: (view: StudentViewMode) => void;
  onExpertSelect: (expert: Expert) => void;
  onModelChange: (mode: ModelMode) => void;
  onKnowledgeSelectionChange: (selection: StudentKnowledgeSelection) => void;
  onPromptChange: (value: string) => void;
  onIdeaSelect: (ideaId: string) => void;
  onIdeaCreate: () => void;
  onIdeaDelete: (ideaId: string) => void;
  onIdeaRename: (ideaId: string, nextTitle: string) => void;
  onIdeaEdit: () => void;
  onGenerate: (mode?: "文本" | "录音" | "语音", uploadedFiles?: string[], promptOverride?: string) => void;
  onContextAction: (message: ChatMessage, action: ContextAction) => void | Promise<void>;
  onSubmitMessage: (message: ChatMessage) => void;
  onSaveDefense: (practice: DefensePractice) => void;
  onWithdrawSubmission: (submissionId: string) => void;
  onDeleteWithdrawnSubmission: (submissionId: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ ideaId: string; x: number; y: number } | null>(null);
  const [renameIdeaId, setRenameIdeaId] = useState<string | null>(null);
  const renameIdea = renameIdeaId ? props.ideas.find((idea) => idea.id === renameIdeaId) || null : null;
  const currentMessages = props.messages.filter((message) => message.ideaId === props.activeIdea.id);
  const currentSubmissions = props.submissions.filter((submission) => submission.ideaId === props.activeIdea.id);
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const activeKnowledgeCategories = activeKnowledgeCatalog.map((item) => item.category);
  const studentViewPermissions: Record<StudentViewMode, string> = {
    workspace: "AI 创意工作台",
    feedback: "提交老师审核",
    defense: "答辩模拟",
  };

  return (
    <div className="student-page role-view-shell">
      <nav className="student-tabs" aria-label="学生端功能">
        {[
          ["workspace", "AI 创意工作台", MessageSquareText],
          ["feedback", "老师反馈", ClipboardCheck],
          ["defense", "答辩模拟", Mic],
        ].map(([view, label, Icon]) => {
          const permission = studentViewPermissions[view as StudentViewMode];
          const locked = !props.permissionAccess.can(permission);
          return (
            <button
              className={`${props.studentView === view ? "active" : ""} ${locked ? "locked" : ""}`.trim()}
              key={String(view)}
              type="button"
              aria-disabled={locked}
              title={locked ? `${permission}权限已停用` : String(label)}
              onClick={() => {
                if (locked) {
                  props.permissionAccess.block(permission);
                  return;
                }
                props.onViewChange(view as StudentViewMode);
              }}
            >
              <Icon size={17} />
              {String(label)}
            </button>
          );
        })}
      </nav>

      {(props.permissionAccess.accountDisabled || props.permissionAccess.disabledPermissions.length > 0) && (
        <PermissionBanner
          accountDisabled={props.permissionAccess.accountDisabled}
          disabledPermissions={props.permissionAccess.disabledPermissions}
        />
      )}

      {props.studentView === "workspace" && (
        <div className="buddy-shell view-transition-panel" key="student-workspace">
          <aside className="buddy-sidebar">
            <div className="buddy-sidebar-head">
              <div>
                <span>学生工作区</span>
                <strong>创意空间</strong>
              </div>
            </div>
            <button className={`buddy-new-chat ${props.permissionAccess.can("AI 创意工作台") ? "" : "locked"}`} type="button" onClick={props.onIdeaCreate}>
              <PenLine size={17} />
              {props.permissionAccess.can("AI 创意工作台") ? "新建创意" : "工作台权限已停用"}
            </button>
            <div className="buddy-history" aria-label="创意列表">
              {props.ideas.map((idea) => (
                <div
                  className={idea.id === props.activeIdea.id ? "active" : ""}
                  key={idea.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    const menuWidth = 132;
                    const menuHeight = 92;
                    const gap = 10;
                    props.onIdeaSelect(idea.id);
                    setContextMenu({
                      ideaId: idea.id,
                      x: Math.max(gap, Math.min(event.clientX, window.innerWidth - menuWidth - gap)),
                      y: Math.max(gap, Math.min(event.clientY, window.innerHeight - menuHeight - gap)),
                    });
                  }}
                >
                  <button className="buddy-history-main" type="button" onClick={() => props.onIdeaSelect(idea.id)}>
                    <strong>{idea.title}</strong>
                    <p>{idea.description}</p>
                    <span>{idea.stage}</span>
                  </button>
                </div>
              ))}
            </div>
            {contextMenu && (
              createPortal(
                <div className="idea-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}>
                  <button
                    className="rename-action"
                    type="button"
                    onClick={() => {
                      setRenameIdeaId(contextMenu.ideaId);
                      setContextMenu(null);
                    }}
                  >
                    <PenLine size={15} />
                    编辑
                  </button>
                  <button
                    className="delete-action"
                    type="button"
                    onClick={() => {
                      props.onIdeaDelete(contextMenu.ideaId);
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>,
                document.body,
              )
            )}
            <div className="buddy-sidebar-foot">
              <span>课程知识库</span>
              <div>
                {activeKnowledgeCategories
                  .filter((category) => props.knowledgeBaseStates[category])
                  .slice(0, 5)
                  .map((tag) => {
                    const count = props.knowledgeUploads.filter(
                      (asset) => asset.enabled !== false && (asset.category || inferKnowledgeCategory(asset.name)) === tag,
                    ).length;
                    return <em key={tag}>{tag}{count ? ` ${count}` : ""}</em>;
                  })}
              </div>
            </div>
          </aside>

          <ChatWorkspace
            activeIdea={props.activeIdea}
            experts={props.experts}
            selectedExpert={props.selectedExpert}
            selectedSkill={props.selectedSkill}
            model={props.model}
            prompt={props.prompt}
            messages={currentMessages}
            submissions={props.submissions}
            knowledgeUploads={props.knowledgeUploads}
            knowledgeCatalog={props.knowledgeCatalog}
            knowledgeBaseStates={props.knowledgeBaseStates}
            promptKnowledgeRoutes={props.promptKnowledgeRoutes}
            selectedKnowledgeSelection={props.selectedKnowledgeSelection}
            isGenerating={props.isGenerating}
            studentAvatarId={props.studentAvatarId}
            onExpertSelect={props.onExpertSelect}
            onModelChange={props.onModelChange}
            onKnowledgeSelectionChange={props.onKnowledgeSelectionChange}
            onPromptChange={props.onPromptChange}
            onIdeaEdit={props.onIdeaEdit}
            onGenerate={props.onGenerate}
            onContextAction={props.onContextAction}
            onSubmitMessage={props.onSubmitMessage}
            permissionAccess={props.permissionAccess}
          />
        </div>
      )}

      {props.studentView === "feedback" && (
        <FeedbackView
          key="student-feedback"
          submissions={currentSubmissions}
          activeIdea={props.activeIdea}
          generatedAssets={props.generatedAssets}
          onBackToWorkspace={() => props.onViewChange("workspace")}
          onContinue={(submission) => {
            props.onViewChange("workspace");
            props.onPromptChange(`请根据老师反馈继续修改《${submission.artifactTitle}》：${submission.teacherComment || "等待老师反馈中"}`);
          }}
          onWithdraw={props.onWithdrawSubmission}
          onDeleteWithdrawn={props.onDeleteWithdrawnSubmission}
          studentAvatarId={props.studentAvatarId}
          permissionAccess={props.permissionAccess}
        />
      )}

      {props.studentView === "defense" && (
        <DefenseView
          key="student-defense"
          activeIdea={props.activeIdea}
          messages={currentMessages}
          generatedAssets={props.generatedAssets.filter((asset) => asset.ideaId === props.activeIdea.id)}
          practices={props.defensePractices.filter((practice) => practice.ideaId === props.activeIdea.id)}
          studentAvatarId={props.studentAvatarId}
          onSaveDefense={props.onSaveDefense}
          permissionAccess={props.permissionAccess}
        />
      )}
      {renameIdea && (
        <IdeaRenameModal
          idea={renameIdea}
          onCancel={() => setRenameIdeaId(null)}
          onConfirm={(title) => {
            props.onIdeaRename(renameIdea.id, title);
            setRenameIdeaId(null);
          }}
        />
      )}
    </div>
  );
}

function ChatWorkspace(props: {
  activeIdea: Idea;
  experts: Expert[];
  selectedExpert: Expert;
  selectedSkill: Skill;
  model: ModelMode;
  prompt: string;
  messages: ChatMessage[];
  submissions: Submission[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  selectedKnowledgeSelection: StudentKnowledgeSelection;
  isGenerating: boolean;
  studentAvatarId: StudentAvatarId;
  onExpertSelect: (expert: Expert) => void;
  onModelChange: (mode: ModelMode) => void;
  onKnowledgeSelectionChange: (selection: StudentKnowledgeSelection) => void;
  onPromptChange: (value: string) => void;
  onIdeaEdit: () => void;
  onGenerate: (mode?: "文本" | "录音" | "语音", uploadedFiles?: string[], promptOverride?: string) => void;
  onContextAction: (message: ChatMessage, action: ContextAction) => void | Promise<void>;
  onSubmitMessage: (message: ChatMessage) => void;
  permissionAccess: PermissionAccess;
}) {
  const ExpertIcon = props.selectedExpert.icon;
  const nextExpertRound = getExpertDialogueRound(props.messages, props.activeIdea.id, props.selectedExpert.id);
  const loadingCopy = getGenerationLoadingCopy(props.selectedExpert.id, shouldOutputStageResult(props.selectedExpert.id, nextExpertRound));
  const starterPrompts = getChatStarterPrompts(props.selectedExpert.id, props.activeIdea, nextExpertRound);
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const allowedKnowledgeCategories = getConfiguredExpertKnowledgeCategories(props.selectedExpert.id, props.promptKnowledgeRoutes);
  const allowedKnowledgeSet = new Set(allowedKnowledgeCategories);
  const studentVisibleKnowledgeCatalog = activeKnowledgeCatalog.filter(
    (item) => allowedKnowledgeSet.has(item.category) && props.knowledgeBaseStates[item.category] !== false,
  );
  const studentVisibleKnowledgeUploads = props.knowledgeUploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return allowedKnowledgeSet.has(category) && props.knowledgeBaseStates[category] !== false && asset.enabled !== false;
  });
  const [isKnowledgePickerOpen, setIsKnowledgePickerOpen] = useState(false);
  const validKnowledgeSources = resolveSelectedKnowledgeSources(
    props.selectedKnowledgeSelection,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    allowedKnowledgeCategories,
  );
  const selectedKnowledgeNames = Array.from(
    new Set([
      ...validKnowledgeSources.categories,
      ...validKnowledgeSources.uploads.map((asset) => asset.category || inferKnowledgeCategory(asset.name)),
    ]),
  );
  const selectedKnowledgeNameLabel =
    selectedKnowledgeNames.length > 2
      ? `${selectedKnowledgeNames.slice(0, 2).join("、")}等`
      : selectedKnowledgeNames.join("、");
  const knowledgePickerLabel =
    selectedKnowledgeNames.length || validKnowledgeSources.uploads.length
      ? `已选：${selectedKnowledgeNameLabel || "资料"} / ${validKnowledgeSources.uploads.length} 份材料`
      : "选择知识库 / 材料";
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledIdeaIdRef = useRef<string | null>(null);
  const studentUploadRef = useRef<HTMLInputElement | null>(null);
  const speechInput = useSpeechInput({
    value: props.prompt,
    onChange: props.onPromptChange,
    fallbackText: `语音输入：我们小组想把《${props.activeIdea.title}》做成面向高校学生的创业实践工具，请帮我结合上海财经大学商学院课程要求继续完善。`,
  });

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    const firstScroll = lastScrolledIdeaIdRef.current === null;
    const ideaChanged = lastScrolledIdeaIdRef.current !== props.activeIdea.id;
    lastScrolledIdeaIdRef.current = props.activeIdea.id;
    window.requestAnimationFrame(() => {
      if (firstScroll || ideaChanged) {
        messageList.scrollTop = messageList.scrollHeight;
        return;
      }
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
    });
  }, [props.activeIdea.id, props.messages.length, props.isGenerating]);

  function handlePromptChange(value: string) {
    props.onPromptChange(value);
    speechInput.resetVoiceInput();
  }

  function handleSend() {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onGenerate(speechInput.hasVoiceInput ? "语音" : "文本");
    speechInput.resetVoiceInput();
  }

  function handleSimulateDialog() {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onPromptChange(getNextRoundPrompt(props.selectedExpert.id, props.activeIdea, nextExpertRound));
    speechInput.resetVoiceInput();
  }

  function handleStarterPrompt(promptText: string) {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onGenerate("文本", [], promptText);
    speechInput.resetVoiceInput();
  }

  function handleStudentUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    const uploadedFiles = Array.from(files).map((file) => `${file.name}（${formatFileSize(file.size)}）`);
    props.onGenerate("录音", uploadedFiles);
  }

  return (
    <section className="buddy-chat">
      <header className="buddy-chat-head">
        <div className="buddy-idea-title-motion" key={`idea-title-${props.activeIdea.id}`}>
          <span className="eyebrow">当前创意</span>
          <h2>{props.activeIdea.title}</h2>
          <p>{props.activeIdea.description}</p>
        </div>
      </header>

      <div className="buddy-message-list" ref={messageListRef}>
        <div className="buddy-message-flow" key={`idea-messages-${props.activeIdea.id}`}>
          {props.messages.length === 0 && !props.isGenerating && (
            <section className="buddy-empty-guide" aria-label="AI 起步引导">
              <div className="buddy-empty-orb">
                <Sparkles size={26} />
              </div>
              <span className="eyebrow">AI 引导</span>
              <h3>可以先从一个创业想法聊起</h3>
              <p>
                当前创意还没有对话记录。你可以直接点击下面的问题，让 {props.selectedExpert.name}
                先帮你把课堂讨论内容整理成可继续推进的方向。
              </p>
              <div className="starter-prompt-grid">
                {starterPrompts.map((item) => (
                  <button key={item.label} type="button" onClick={() => handleStarterPrompt(item.prompt)}>
                    <strong>{item.label}</strong>
                    <span>{item.prompt}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {props.messages.map((message) => {
            const submitted = props.submissions.find((item) => item.sourceMessageId === message.id);
            const artifactType = isArtifactType(message.artifactType) ? message.artifactType : undefined;
            const messageExpert = message.sender === "ai" ? resolveMessageExpert(message, props.selectedExpert) : props.selectedExpert;
            const MessageExpertIcon = messageExpert.icon;
            return (
              <article className={`buddy-message ${message.sender === "user" ? "user-message" : "ai-message"}`} key={message.id}>
                <div className={`buddy-avatar ${message.sender === "ai" ? "ai" : ""}`}>
                  {message.sender === "ai" ? <MessageExpertIcon size={34} /> : <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />}
                </div>
                <div className="buddy-bubble">
                  {message.sender === "user" ? (
                    <>
                      <span>
                        {message.mode || "文本"}输入 · {message.createdAt}
                      </span>
                      <p>{message.content}</p>
                    </>
                  ) : (
                    <>
                      <div className="buddy-ai-meta">
                        <strong>{message.expertName || messageExpert.name}</strong>
                        <em>{message.skillName || props.selectedSkill.name}</em>
                      </div>
                      {message.blocks ? (
                        <ResultPanel result={message.blocks} expertId={messageExpert.id} />
                      ) : (
                        <p>{message.content}</p>
                      )}
                      {artifactType && (
                        <div className="context-actions">
                          {isArtifactType(message.artifactType) && (
                            <button
                              className={submitted ? "is-success" : props.permissionAccess.can("提交老师审核") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("提交老师审核")) {
                                  props.permissionAccess.block("提交老师审核");
                                  return;
                                }
                                props.onSubmitMessage(message);
                              }}
                              disabled={Boolean(submitted)}
                            >
                              <Send size={15} />
                              {submitted
                                ? `${statusLabels[submitted.status]}`
                                : props.permissionAccess.can("提交老师审核")
                                  ? "提交老师审核"
                                  : "提交权限已停用"}
                            </button>
                          )}
                          {artifactType === "MEDIA" && (
                            <button
                              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("AI 创意工作台")) {
                                  props.permissionAccess.block("AI 创意工作台");
                                  return;
                                }
                                props.onContextAction(message, "video");
                              }}
                            >
                              <Clapperboard size={15} />
                              预览/生成宣传视频
                            </button>
                          )}
                          {(artifactType === "BP" || artifactType === "PPT") && (
                            <button
                              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("AI 创意工作台")) {
                                  props.permissionAccess.block("AI 创意工作台");
                                  return;
                                }
                                props.onContextAction(message, "script");
                              }}
                            >
                              <FileText size={15} />
                              生成路演稿
                            </button>
                          )}
                          {(artifactType === "BP" || artifactType === "PPT" || artifactType === "SCRIPT") && (
                            <button
                              className={props.permissionAccess.can("答辩模拟") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("答辩模拟")) {
                                  props.permissionAccess.block("答辩模拟");
                                  return;
                                }
                                props.onContextAction(message, "ask");
                              }}
                            >
                              <Mic size={15} />
                              进入答辩模拟
                            </button>
                          )}
                          <button type="button" onClick={() => props.onContextAction(message, "preview")}>
                            <MonitorPlay size={15} />
                            {artifactType === "PPT"
                              ? "预览 PPT"
                              : artifactType === "MEDIA"
                                ? "预览视频"
                                : `预览 ${isArtifactType(message.artifactType) ? getDownloadTitle(message) : "阶段记录"} Word`}
                          </button>
                          <button
                            className={props.permissionAccess.can("下载个人成果") ? "" : "is-locked"}
                            type="button"
                            onClick={() => {
                              if (!props.permissionAccess.can("下载个人成果")) {
                                props.permissionAccess.block("下载个人成果");
                                return;
                              }
                              props.onContextAction(message, "download");
                            }}
                          >
                            <Download size={15} />
                            {props.permissionAccess.can("下载个人成果")
                              ? artifactType === "PPT"
                                ? "下载 PPTX"
                                : artifactType === "MEDIA"
                                  ? "下载 MP4 视频"
                                  : "下载 Word"
                              : "下载权限已停用"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {props.isGenerating && (
            <article className="buddy-message ai-message">
              <div className="buddy-avatar ai">
                <ExpertIcon size={34} />
              </div>
              <div className="buddy-bubble">
                <div className="buddy-ai-meta">
                  <strong>{props.selectedExpert.name}</strong>
                  <em>{props.selectedSkill.name}</em>
                </div>
                <section className="result-panel loading-card" aria-live="polite">
                  <div className="loader-orbit">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4>{loadingCopy.title}</h4>
                    <p>{loadingCopy.detail}</p>
                  </div>
                </section>
              </div>
            </article>
          )}
        </div>
      </div>

      <footer className="buddy-composer">
        <div className="buddy-current-expert">
          <span className="expert-icon" style={{ "--accent": props.selectedExpert.accent } as CSSProperties}>
            <ExpertIcon size={42} />
          </span>
          <div>
            <strong>{props.selectedExpert.name}</strong>
            <p>{props.selectedExpert.role}</p>
          </div>
        </div>
        <textarea
          aria-label="和 AI 助教对话"
          value={props.prompt}
          disabled={!props.permissionAccess.can("AI 创意工作台")}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!props.isGenerating) handleSend();
            }
          }}
          placeholder="输入你的创业想法、课堂讨论内容，或上传录音让 AI 先整理..."
        />
        {speechInput.notice && (
          <p className={`voice-status ${speechInput.isListening ? "listening" : ""}`} aria-live="polite">
            {speechInput.notice}
          </p>
        )}
        <div className="buddy-composer-tools">
          <label>
            <span>专家</span>
            <PrettySelect
              value={props.selectedExpert.id}
              disabled={!props.permissionAccess.can("AI 创意工作台")}
              placement="top"
              ariaLabel="选择专家"
              options={props.experts.map((expert) => ({ value: expert.id, label: expert.name }))}
              onChange={(value) => {
                const expert = props.experts.find((item) => item.id === value);
                if (expert) props.onExpertSelect(expert);
              }}
            />
          </label>
          <label>
            <span>模式</span>
            <PrettySelect
              value={props.model}
              disabled={!props.permissionAccess.can("AI 创意工作台")}
              ariaLabel="选择生成模式"
              options={modelModes.map((mode) => ({ value: mode, label: mode }))}
              onChange={(value) => props.onModelChange(value)}
            />
          </label>
          <label className="knowledge-select-control">
            <span>知识库</span>
            <button
              className={`knowledge-picker-trigger ${props.permissionAccess.can("调用课程知识库") ? "" : "is-locked"}`}
              type="button"
              aria-disabled={!props.permissionAccess.can("调用课程知识库")}
              onClick={() => {
                if (!props.permissionAccess.can("调用课程知识库")) {
                  props.permissionAccess.block("调用课程知识库");
                  return;
                }
                setIsKnowledgePickerOpen(true);
              }}
            >
              <BookOpen size={15} />
              <span className="knowledge-picker-text">
                {props.permissionAccess.can("调用课程知识库") ? knowledgePickerLabel : "知识库权限已停用"}
              </span>
            </button>
          </label>
          <div className="composer-utility-group" aria-label="输入工具">
            <input
              ref={studentUploadRef}
              className="visually-hidden-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.mp3,.m4a,.wav"
              onChange={(event) => {
                handleStudentUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
              type="button"
              onClick={() => {
                if (!props.permissionAccess.can("AI 创意工作台")) {
                  props.permissionAccess.block("AI 创意工作台");
                  return;
                }
                studentUploadRef.current?.click();
              }}
            >
              <Upload size={17} />
              本地上传
            </button>
            <button
              className={`${speechInput.isListening ? "voice-active" : ""} ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`.trim()}
              type="button"
              onClick={() => {
                if (!props.permissionAccess.can("AI 创意工作台")) {
                  props.permissionAccess.block("AI 创意工作台");
                  return;
                }
                speechInput.toggle();
              }}
            >
              <Mic size={17} />
              {speechInput.isListening ? "停止听写" : "语音输入"}
            </button>
          </div>
          <span className="composer-key-hint">Enter 发送 / Shift+Enter 换行</span>
          <div className="buddy-send-actions">
            <button
              className={`simulate-dialog-button ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`}
              type="button"
              onClick={handleSimulateDialog}
              disabled={props.isGenerating}
            >
              <MessageSquareText size={17} />
              模拟对话
            </button>
            <button
              className={`buddy-send ${props.isGenerating ? "is-loading" : ""} ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`.trim()}
              type="button"
              onClick={handleSend}
              disabled={props.isGenerating}
            >
              <Sparkles size={18} />
              {props.isGenerating ? "生成中" : props.permissionAccess.can("AI 创意工作台") ? "发送" : "生成权限已停用"}
            </button>
          </div>
        </div>
      </footer>
      {isKnowledgePickerOpen && (
        <StudentKnowledgePickerModal
          catalog={studentVisibleKnowledgeCatalog}
          uploads={studentVisibleKnowledgeUploads}
          states={props.knowledgeBaseStates}
          expertName={props.selectedExpert.name}
          allowedCategories={allowedKnowledgeCategories}
          selection={props.selectedKnowledgeSelection}
          onCancel={() => setIsKnowledgePickerOpen(false)}
          onConfirm={(selection) => {
            props.onKnowledgeSelectionChange(selection);
            setIsKnowledgePickerOpen(false);
          }}
        />
      )}
    </section>
  );
}

function StudentKnowledgePickerModal(props: {
  catalog: KnowledgeBaseCatalogItem[];
  uploads: KnowledgeUpload[];
  states: KnowledgeBaseStates;
  expertName: string;
  allowedCategories: KnowledgeCategory[];
  selection: StudentKnowledgeSelection;
  onCancel: () => void;
  onConfirm: (selection: StudentKnowledgeSelection) => void;
}) {
  const catalog = props.catalog;
  const allowedCategorySet = new Set(props.allowedCategories);
  const firstCategory = catalog.find((item) => props.states[item.category] !== false)?.category || catalog[0]?.category || "";
  function cleanSelection(selection: StudentKnowledgeSelection) {
    const normalized = normalizeStudentKnowledgeSelection(selection);
    const categories = normalized.categories.filter(
      (category) => allowedCategorySet.has(category) && props.states[category] !== false,
    );
    const categorySet = new Set(categories);
    return {
      categories,
      uploadIds: normalized.uploadIds.filter((id) => {
        const asset = props.uploads.find((item) => item.id === id);
        if (!asset) return false;
        const category = asset.category || inferKnowledgeCategory(asset.name);
        return (
          allowedCategorySet.has(category) &&
          props.states[category] !== false &&
          asset.enabled !== false &&
          !categorySet.has(category)
        );
      }),
    };
  }

  const [draftSelection, setDraftSelection] = useState<StudentKnowledgeSelection>(() => cleanSelection(props.selection));
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory>(firstCategory);
  const [search, setSearch] = useState("");
  const activeCatalogItem = catalog.find((item) => item.category === activeCategory) || catalog[0];
  const searchText = search.trim().toLowerCase();
  const activeCategoryWholeSelected = draftSelection.categories.includes(activeCategory);
  const categoryUploads = props.uploads
    .filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === activeCategory)
    .filter((asset) => {
      if (!searchText) return true;
      return [asset.name, asset.fileType, asset.preview, asset.uploadedBy, asset.sizeLabel].join(" ").toLowerCase().includes(searchText);
    });
  const enabledCategoryUploads = categoryUploads.filter((asset) => asset.enabled !== false && props.states[activeCategory] !== false);
  const selectedUploadSet = new Set(draftSelection.uploadIds);
  const selectedCategorySet = new Set(draftSelection.categories.filter((category) => props.states[category] !== false));
  const selectedUploads = props.uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return (
      selectedUploadSet.has(asset.id) &&
      asset.enabled !== false &&
      props.states[category] !== false &&
      !selectedCategorySet.has(category)
    );
  });
  const selectedCategoryUploadCount = draftSelection.categories.reduce((count, category) => {
    if (props.states[category] === false) return count;
    return count + props.uploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === category && asset.enabled !== false).length;
  }, 0);

  function toggleCategory(category: KnowledgeCategory) {
    if (props.states[category] === false) return;
    setDraftSelection((current) => {
      const selected = current.categories.includes(category);
      const categoryUploadIds = props.uploads
        .filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === category)
        .map((asset) => asset.id);
      return {
        categories: selected ? current.categories.filter((item) => item !== category) : [...current.categories, category],
        uploadIds: selected ? current.uploadIds : current.uploadIds.filter((id) => !categoryUploadIds.includes(id)),
      };
    });
  }

  function toggleUpload(uploadId: string) {
    const asset = props.uploads.find((item) => item.id === uploadId);
    if (!asset) return;
    const category = asset.category || inferKnowledgeCategory(asset.name);
    if (asset.enabled === false || props.states[category] === false) return;
    setDraftSelection((current) => {
      const selected = current.uploadIds.includes(uploadId);
      return {
        categories: current.categories.filter((item) => item !== category),
        uploadIds: selected ? current.uploadIds.filter((item) => item !== uploadId) : [...current.uploadIds, uploadId],
      };
    });
  }

  function removeCategory(category: KnowledgeCategory) {
    setDraftSelection((current) => ({
      categories: current.categories.filter((item) => item !== category),
      uploadIds: current.uploadIds,
    }));
  }

  function removeUpload(uploadId: string) {
    setDraftSelection((current) => ({
      categories: current.categories,
      uploadIds: current.uploadIds.filter((item) => item !== uploadId),
    }));
  }

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal student-knowledge-modal" role="dialog" aria-modal="true" aria-label="选择知识库资料">
        <header>
          <div>
            <span className="eyebrow">课程知识库</span>
            <h3>选择本轮对话参考资料</h3>
            <p>
              当前专家：{props.expertName}。这里只显示教师端/管理端为该专家开放的知识库目录和已启用资料。
            </p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭知识库选择" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>

        <div className="student-knowledge-picker-body">
          <section className="student-knowledge-column directory-column">
            <div className="student-knowledge-column-head">
              <strong>知识库目录</strong>
              <span>{draftSelection.categories.length} 个目录</span>
            </div>
            <div className="student-knowledge-list">
              {catalog.length === 0 && (
                <div className="student-knowledge-empty">当前专家暂无已开放知识库，请教师端或管理端先配置专家可调用目录。</div>
              )}
              {catalog.map((item) => {
                const enabled = props.states[item.category] !== false;
                const fileCount = props.uploads.filter(
                  (asset) => (asset.category || inferKnowledgeCategory(asset.name)) === item.category && asset.enabled !== false,
                ).length;
                const selected = draftSelection.categories.includes(item.category);
                return (
                  <div
                    className={`student-knowledge-row directory-row ${activeCategory === item.category ? "active" : ""} ${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`}
                    key={item.category}
                    role="button"
                    tabIndex={enabled ? 0 : -1}
                    aria-disabled={!enabled}
                    onClick={() => {
                      if (enabled) setActiveCategory(item.category);
                    }}
                    onKeyDown={(event) => {
                      if (!enabled) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveCategory(item.category);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!enabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleCategory(item.category)}
                    />
                    <span>
                      <strong>{item.category}</strong>
                      <em>{enabled ? `${fileCount} 份可用资料` : "已停用"}</em>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="student-knowledge-column material-column">
            <div className="student-knowledge-column-head">
              <strong>{activeCatalogItem?.category || "资料列表"}</strong>
              <span>{enabledCategoryUploads.length} 份可用</span>
            </div>
            <label className="student-knowledge-search">
              <Filter size={15} />
              <input value={search} placeholder="搜索资料名称、摘要或上传人" onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="student-knowledge-list material-list">
              {categoryUploads.length === 0 ? (
                <div className="student-knowledge-empty">当前目录暂无匹配资料，可以直接选择整个目录使用课程默认模板。</div>
              ) : (
                categoryUploads.map((asset) => {
                  const category = asset.category || inferKnowledgeCategory(asset.name);
                  const enabled = asset.enabled !== false && props.states[category] !== false;
                  const selected = !activeCategoryWholeSelected && draftSelection.uploadIds.includes(asset.id);
                  return (
                    <div
                      className={`student-knowledge-row material-row ${selected ? "selected" : ""} ${activeCategoryWholeSelected ? "covered" : ""} ${enabled ? "" : "disabled"}`}
                      key={asset.id}
                      role="group"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!enabled || activeCategoryWholeSelected}
                        onChange={() => toggleUpload(asset.id)}
                      />
                      <span>
                        <strong>{asset.name}</strong>
                        <em>
                          {asset.fileType} · {asset.sizeLabel} · {asset.uploadedBy || "教师上传"} ·{" "}
                          {activeCategoryWholeSelected ? "已包含在整库中" : enabled ? "可调用" : "已停用"}
                        </em>
                        <small>{asset.preview}</small>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="student-knowledge-column summary-column">
            <div className="student-knowledge-column-head">
              <strong>已选内容</strong>
              <span>{draftSelection.categories.length} 个目录 / {selectedUploads.length} 份材料</span>
            </div>
            <div className="student-knowledge-summary">
              {draftSelection.categories.length === 0 && selectedUploads.length === 0 ? (
                <div className="student-knowledge-empty">还没有选择知识库。本轮发送后会使用系统默认课程资料。</div>
              ) : (
                <>
                  {draftSelection.categories.map((category) => (
                    <article className="selected-source-card" key={category}>
                      <div>
                        <strong>{category}知识库</strong>
                        <span>整库调用 · {props.states[category] === false ? "已停用" : "可用"}</span>
                      </div>
                      <button type="button" aria-label={`移除${category}知识库`} onClick={() => removeCategory(category)}>
                        <X size={15} />
                      </button>
                    </article>
                  ))}
                  {selectedUploads.map((asset) => (
                    <article className="selected-source-card" key={asset.id}>
                      <div>
                        <strong>{asset.name}</strong>
                        <span>{asset.category || inferKnowledgeCategory(asset.name)} · 单份材料</span>
                      </div>
                      <button type="button" aria-label={`移除${asset.name}`} onClick={() => removeUpload(asset.id)}>
                        <X size={15} />
                      </button>
                    </article>
                  ))}
                </>
              )}
            </div>
            <div className="student-knowledge-selection-note">
              <BookOpen size={16} />
              <span>整库选择会覆盖该目录下全部可用资料；当前预计引用 {selectedCategoryUploadCount + selectedUploads.length} 份材料。</span>
            </div>
          </section>
        </div>

        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => props.onConfirm(cleanSelection(draftSelection))}
          >
            确认选择
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ResultPanel(props: { result: ResultBlock[]; expertId: ExpertId }) {
  return (
    <section className="result-panel">
      {props.expertId === "pitch" && (
        <div className="slide-preview-grid">
          {pptSlides.map((slide, index) => (
            <article className="slide-thumb" key={slide[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{slide[0]}</strong>
              <p>{slide[1]}</p>
              <small>{slide[2]}</small>
            </article>
          ))}
        </div>
      )}
      <div className="result-blocks">
        {props.result.map((block) => (
          <article className="result-block" key={block.title}>
            <h4>{block.title}</h4>
            <ul>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function IdeaDeleteConfirmModal(props: { idea: Idea; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-idea-title">
        <header>
          <div>
            <span className="eyebrow">删除创意</span>
            <h3 id="delete-idea-title">确认删除《{props.idea.title}》？</h3>
            <p>删除后，该创意会从左侧创意空间中移除；Demo 中不会继续展示这条创意的对话入口。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.idea.title}</strong>
          <p>{props.idea.description}</p>
          <span>{props.idea.stage}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function IdeaRenameModal(props: { idea: Idea; onCancel: () => void; onConfirm: (title: string) => void }) {
  const [title, setTitle] = useState(props.idea.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSubmit = title.trim().length > 0;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props]);

  function submitRename() {
    if (!canSubmit) return;
    props.onConfirm(title.trim());
  }

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section
        className="media-modal rename-idea-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-idea-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">创意空间</span>
            <h3 id="rename-idea-title">重命名当前创意</h3>
            <p>名称会同步显示在左侧创意列表和当前对话标题里。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭重命名" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <label className="rename-idea-form">
          <span>创意名称</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename();
            }}
          />
        </label>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button" type="button" disabled={!canSubmit} onClick={submitRename}>
            保存名称
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeBaseDeleteConfirmModal(props: {
  item: KnowledgeBaseCatalogItem;
  relatedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-knowledge-title">
        <header>
          <div>
            <span className="eyebrow">删除知识库目录</span>
            <h3 id="delete-knowledge-title">确认删除“{props.item.category}知识库”？</h3>
            <p>删除后，该目录会从教师端、管理端、学生端下拉选择和专家提示词引用范围中同步移除。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.item.category}知识库</strong>
          <p>{props.item.description}</p>
          <span>{props.relatedCount} 份资料将同步移除 · 适用模块：{props.item.usedBy}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function ExpertDeleteConfirmModal(props: { expert: Expert; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-expert-title">
        <header>
          <div>
            <span className="eyebrow">删除专家</span>
            <h3 id="delete-expert-title">确认删除“{props.expert.name}”？</h3>
            <p>删除后，该专家会从教师端、管理端和学生端专家列表中同步移除。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.expert.name}</strong>
          <p>{props.expert.role}</p>
          <span>适用场景：{props.expert.scenario}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function SkillFolderUploadGuideModal(props: { actorLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal skill-folder-upload-modal" role="dialog" aria-modal="true" aria-labelledby="skill-folder-upload-title">
        <header>
          <div>
            <span className="eyebrow">{props.actorLabel}</span>
            <h3 id="skill-folder-upload-title">上传专家 Skill 文件夹</h3>
            <p>请选择已经调试好的专家 Skill 文件夹。系统会优先读取 SKILL.md，并把同目录下的 md、txt、json 文件作为专家上下文。</p>
          </div>
          <button type="button" aria-label="关闭上传说明" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="skill-folder-upload-body">
          <article>
            <strong>浏览器安全确认</strong>
            <p>选择文件夹后，Edge / Chrome 会弹出“是否将文件上传到此站点”的原生确认。这个弹窗属于浏览器安全机制，页面不能修改样式或按钮文案。</p>
          </article>
          <article>
            <strong>读取范围</strong>
            <p>当前 Demo 只读取文本配置文件，不上传到真实后端；正式版可在这里接入专家 Skill 入库、版本管理和权限审核。</p>
          </article>
        </div>
        <footer className="skill-folder-upload-actions">
          <button className="ghost-button skill-folder-upload-secondary" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button prompt-save-button skill-folder-upload-primary" type="button" onClick={props.onConfirm}>
            <Upload size={15} />
            继续选择文件夹
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeBaseDetailModal(props: {
  item: KnowledgeBaseCatalogItem;
  uploads: KnowledgeUpload[];
  enabled: boolean;
  actorLabel: string;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const relatedUploads = props.uploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === props.item.category);
  const enabledUploads = relatedUploads.filter((asset) => asset.enabled !== false);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section className="media-modal knowledge-detail-modal knowledge-base-detail-modal" role="dialog" aria-modal="true" aria-label="知识库详情">
        <header>
          <div>
            <span className="eyebrow">知识库详情</span>
            <h3>{props.item.category}知识库</h3>
            <p>{props.item.description}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="review-detail-body">
          <section className="detail-card review-summary-card">
            <dl>
              <div>
                <dt>目录状态</dt>
                <dd>{props.enabled ? "已开放" : "已停用"}</dd>
              </div>
              <div>
                <dt>资料数量</dt>
                <dd>{relatedUploads.length} 份</dd>
              </div>
              <div>
                <dt>已启用资料</dt>
                <dd>{enabledUploads.length} 份</dd>
              </div>
              <div>
                <dt>适用模块</dt>
                <dd>{props.item.usedBy}</dd>
              </div>
              <div>
                <dt>维护端</dt>
                <dd>{props.actorLabel}</dd>
              </div>
              <div>
                <dt>同步范围</dt>
                <dd>学生端 / 教师端 / 管理端</dd>
              </div>
            </dl>
          </section>
          <section className="detail-card knowledge-base-related-card">
            <span className="eyebrow">目录资料</span>
            {relatedUploads.length === 0 ? (
              <p>当前目录还没有上传资料，可先选择该目录后上传文件。</p>
            ) : (
              <div className="knowledge-base-related-list">
                {relatedUploads.slice(0, 6).map((asset) => (
                  <article key={asset.id}>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.fileType} · {asset.sizeLabel} · {asset.enabled === false ? "未启用" : "已启用"}
                    </span>
                  </article>
                ))}
              </div>
            )}
            <div className="teacher-file-actions">
              <button type="button" onClick={props.onToggle}>
                {props.enabled ? "停用知识库" : "启用知识库"}
              </button>
              <button className="danger" type="button" onClick={props.onDelete}>
                删除知识库
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeAssetActionConfirmModal(props: {
  asset: KnowledgeUpload;
  action: PendingKnowledgeAssetAction["action"];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = props.action === "delete";
  const isEnabled = props.asset.enabled !== false;
  const actionLabel = isDelete ? "删除资料" : isEnabled ? "停用资料" : "启用资料";
  const nextStatus = isDelete ? "从资料列表中移除" : isEnabled ? "学生端和专家提示词将暂不引用该资料" : "学生端和专家提示词可重新引用该资料";
  const confirmLabel = isDelete ? "确认删除" : isEnabled ? "确认停用" : "确认启用";
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-asset-action-title">
        <header>
          <div>
            <span className="eyebrow">{actionLabel}</span>
            <h3 id="knowledge-asset-action-title">确认{actionLabel}“{props.asset.name}”？</h3>
            <p>{nextStatus}。该操作会同步影响教师端、管理端和学生端知识库调用状态。</p>
          </div>
          <button type="button" aria-label="关闭确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.asset.name}</strong>
          <p>{props.asset.preview}</p>
          <span>
            {props.asset.category || inferKnowledgeCategory(props.asset.name)}知识库 · {props.asset.fileType} · {props.asset.sizeLabel}
          </span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PptPreviewModal(props: { asset: GeneratedAsset; onClose: () => void }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const generatedSlides = parseGeneratedPptSlides(props.asset.pptKnowledgeContent);
  const activeImage = pptPreviewImages[activeSlide];
  const activeMeta = generatedSlides[activeSlide] || generatedSlides[0];
  const pptSourceLabel = props.asset.pptUsesLexiang ? "乐享知识库生成" : "Demo 内置结构";
  const pptFileUrl = props.asset.pptUrl || demoPptUrl;
  const pptReferences = props.asset.pptKnowledgeReferences || [];
  const visibleReferences = pptReferences.slice(0, 3);
  const hiddenReferenceCount = Math.max(0, pptReferences.length - visibleReferences.length);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal ppt-modal" role="dialog" aria-modal="true" aria-label="预览路演 PPT">
        <header>
          <div>
            <span className="eyebrow">{pptSourceLabel}</span>
            <h3>{props.asset.title}</h3>
            <p>
              {props.asset.pptUsesLexiang && props.asset.pptUrl
                ? "已根据乐享知识库结果生成新的 PPTX 文件；页面图片用于模板预览，下载按钮会获取乐享生成的 PPTX。"
                : props.asset.pptUsesLexiang
                  ? "这里展示基于乐享知识库生成的 10 页路演结构；页面图片沿用当前 Demo 模板，标题和观点来自乐享结果。"
                : "这里展示 Demo 内置 PPT 结构；配置乐享 AppKey/AppSecret 后，点击预览会调用乐享知识库生成内容。"}
            </p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="ppt-image-preview-body">
          <section className="ppt-image-stage">
            <img src={activeImage} alt={`PPT 第 ${activeSlide + 1} 页预览`} />
            <div className="ppt-slide-bottom">
              <article className="ppt-slide-meta-card">
                <span>{String(activeSlide + 1).padStart(2, "0")} / {pptPreviewImages.length}</span>
                <strong>{activeMeta[0]}</strong>
                <p>{activeMeta[1]} · {activeMeta[2]}</p>
              </article>
              {visibleReferences.length ? (
                <article className="ppt-reference-card">
                  <span>引用来源</span>
                  <div>
                    {visibleReferences.map((reference) =>
                      reference.url ? (
                        <a href={reference.url} key={`${reference.title}-${reference.url}`} target="_blank" rel="noreferrer">
                          {reference.title}
                        </a>
                      ) : (
                        <em key={`${reference.title}-${reference.url || ""}`}>{reference.title}</em>
                      ),
                    )}
                    {hiddenReferenceCount > 0 && <em>+{hiddenReferenceCount} 个来源</em>}
                  </div>
                </article>
              ) : (
                <article className="ppt-reference-card muted">
                  <span>引用来源</span>
                  <p>暂无外部来源，当前页使用内置模板结构。</p>
                </article>
              )}
            </div>
          </section>
          <section className="ppt-thumb-strip" aria-label="PPT 页面缩略图">
            {pptPreviewImages.map((image, index) => (
              <button className={activeSlide === index ? "active" : ""} key={image} type="button" onClick={() => setActiveSlide(index)}>
                <img src={image} alt={`第 ${index + 1} 页缩略图`} />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{generatedSlides[index]?.[0] || `第 ${index + 1} 页`}</strong>
              </button>
            ))}
          </section>
        </div>
        <footer className="context-actions">
          <a className="button-link" href={pptFileUrl} target="_blank" rel="noreferrer">
            <MonitorPlay size={15} />
            浏览器打开
          </a>
          <button type="button" onClick={() => (props.asset.pptUrl ? triggerDownload(props.asset.pptUrl, props.asset.pptFileName || `${props.asset.title}.pptx`) : downloadDemoPpt())}>
            <Download size={15} />
            下载 PPTX
          </button>
        </footer>
      </section>
    </div>
  );
}

function WordPreviewModal(props: { preview: WordPreview; onClose: () => void }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal word-modal" role="dialog" aria-modal="true" aria-label="预览 Word 文档">
        <header>
          <div>
            <span className="eyebrow">Word 成果预览</span>
            <h3>{props.preview.title}</h3>
            <p>这里展示将要下载为 Word 的阶段成果内容，正式版可接入真实文档模板和批注导出。</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="word-preview-page">
          <h1>{props.preview.title}</h1>
          <p className="word-meta">上海财经大学商学院 AI 赋能创业实践教学示范平台 Demo｜阶段成果自动生成稿</p>
          {props.preview.blocks.map((block) => (
            <section key={block.title}>
              <h2>{block.title}</h2>
              <ul>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="context-actions">
          <button type="button" onClick={() => downloadWord(`${props.preview.title}.doc`, props.preview.title, props.preview.blocks)}>
            <Download size={15} />
            下载 Word
          </button>
        </footer>
      </section>
    </div>
  );
}

function GenerationPendingModal(props: { pending: PendingAssetGeneration }) {
  const [progress, setProgress] = useState(4);
  const isWaitingForResult = progress >= 91.5;

  useEffect(() => {
    const startedAt = performance.now();
    const duration = Math.max(1, props.pending.seconds) * 1000;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(92, 4 + (elapsed / duration) * 88);
      setProgress(nextProgress);
    }, 120);

    return () => window.clearInterval(timer);
  }, [props.pending.seconds, props.pending.title]);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal pending-modal" role="dialog" aria-modal="true" aria-label="正在生成">
        <div className="pending-generation">
          <div className="loader-orbit">
            <Sparkles size={26} />
          </div>
          <span className="eyebrow">正在生成</span>
          <h3>{props.pending.title}</h3>
          <p>{props.pending.detail}</p>
          <div className="pending-progress" aria-hidden="true">
            <strong style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <small>{isWaitingForResult ? "生成结果还在返回，完成后会自动打开预览。" : `预计等待 ${props.pending.seconds} 秒左右，进度会按实际生成时间推进。`}</small>
        </div>
      </section>
    </div>
  );
}

function VideoPreviewModal(props: { asset: GeneratedAsset; onClose: () => void }) {
  const hasGeneratedVideo = Boolean(props.asset.videoUrl);
  const videoUrl = hasGeneratedVideo ? props.asset.videoUrl || workBuddyGeneratedVideoUrl : demoVideoUrl;

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal video-only-modal" role="dialog" aria-modal="true" aria-label="预览宣传视频">
        <header>
          <div>
            <span className="eyebrow">宣传视频预览</span>
            <h3>{props.asset.title}</h3>
            <p>教师端可直接查看学生生成的视频成果，并下载 MP4 或对应的视频物料包。</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="video-only-body">
          <video className="video-player" controls preload="metadata" src={videoUrl}>
            <track kind="captions" />
          </video>
          <div className="video-asset-summary">
            <strong>视频生成说明</strong>
            <p>{hasGeneratedVideo ? "已显示 WorkBuddy 生成的视频成果。" : props.asset.prompt || "已接入预生成视频：AI_Coach_30s.mp4。"}</p>
            <span>生成时间：{props.asset.createdAt}</span>
          </div>
        </div>
        <footer className="context-actions">
          <button type="button" onClick={() => downloadMediaPackage(props.asset)}>
            <Download size={15} />
            下载视频物料包
          </button>
          <button type="button" onClick={hasGeneratedVideo ? downloadGeneratedWorkBuddyVideo : downloadDemoVideo}>
            <MonitorPlay size={15} />
            下载 MP4 视频
          </button>
        </footer>
      </section>
    </div>
  );
}

function MediaGenerationModal(props: {
  asset: GeneratedAsset;
  isCached: boolean;
  onAssetChange: (asset: GeneratedAsset) => void;
  onClose: () => void;
  onConfirm: (asset: GeneratedAsset) => void;
}) {
  const [showPreview, setShowPreview] = useState(Boolean(props.asset.videoUrl));
  const [isRendering, setIsRendering] = useState(false);
  const [workBuddyRunId, setWorkBuddyRunId] = useState("");
  const [workBuddyError, setWorkBuddyError] = useState("");
  const [workBuddyStatus, setWorkBuddyStatus] = useState<"idle" | "checking" | "connected" | "offline">("idle");
  const [workBuddyStatusMessage, setWorkBuddyStatusMessage] = useState("点击生成视频时才会连接 WorkBuddy。");
  const [generatedVideoVersion, setGeneratedVideoVersion] = useState(() => Date.now());
  const [hasGeneratedWorkBuddyVideo, setHasGeneratedWorkBuddyVideo] = useState(Boolean(props.asset.videoUrl));
  const [videoCheckMessage, setVideoCheckMessage] = useState("");
  const [videoRenderProgress, setVideoRenderProgress] = useState(4);

  const modalEyebrow = hasGeneratedWorkBuddyVideo && showPreview ? "视频已生成" : workBuddyRunId ? "正在渲染视频" : isRendering ? "正在提交任务" : "先确认生成提示词";
  const modalDescription =
    hasGeneratedWorkBuddyVideo && showPreview
      ? "已生成的视频会保留在当前成果中，点击重新生成才会覆盖。"
      : workBuddyRunId
        ? "视频正在由本机 WorkBuddy / CodeBuddy 渲染，完成后会自动显示预览。"
        : isRendering
          ? "正在把脚本、分镜和视觉提示词提交到本机 WorkBuddy / CodeBuddy。"
          : "请先检查模型提示词、脚本、分镜和海报 Prompt，确认后再提交视频生成任务。";
  const hasRenderTimedOut = videoCheckMessage.startsWith("暂未找到");
  const isWaitingForGeneratedVideo = Boolean(workBuddyRunId && !showPreview && !hasRenderTimedOut);
  const shouldShowRenderingState = isRendering || Boolean(workBuddyRunId && !showPreview);
  const isVideoWaitingForResult = videoRenderProgress >= 91.5 && !hasRenderTimedOut;
  const videoPreviewUrl = hasGeneratedWorkBuddyVideo ? `${workBuddyGeneratedVideoUrl}?v=${generatedVideoVersion}` : demoVideoUrl;

  useEffect(() => {
    if (props.asset.videoUrl || !props.isCached) return;
    let isMounted = true;
    checkGeneratedWorkBuddyVideo().then((isReady) => {
      if (!isMounted || !isReady) return;
      setGeneratedVideoVersion(Date.now());
      setHasGeneratedWorkBuddyVideo(true);
      setShowPreview(true);
      setVideoCheckMessage("视频已生成，可以预览。");
      markWorkBuddyVideoReady();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!workBuddyRunId || showPreview) return;
    setVideoCheckMessage("已提交生成任务，正在检查本地 MP4 文件是否生成。");

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      checkGeneratedWorkBuddyVideo()
        .then((isReady) => {
          if (isReady) {
            setGeneratedVideoVersion(Date.now());
            setHasGeneratedWorkBuddyVideo(true);
            setShowPreview(true);
            setVideoCheckMessage("视频已生成，可以预览。");
            markWorkBuddyVideoReady();
            window.clearInterval(timer);
          } else if (attempts >= 60) {
            setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
            window.clearInterval(timer);
          }
        })
        .catch(() => {
          if (attempts >= 60) {
            setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
            window.clearInterval(timer);
          }
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [showPreview, workBuddyRunId]);

  useEffect(() => {
    if (!shouldShowRenderingState) {
      setVideoRenderProgress(4);
      return;
    }
    if (hasRenderTimedOut) {
      setVideoRenderProgress(92);
      return;
    }

    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(92, 4 + (elapsed / 90000) * 88);
      setVideoRenderProgress(nextProgress);
    }, 160);

    return () => window.clearInterval(timer);
  }, [hasRenderTimedOut, shouldShowRenderingState]);

  function updateField(field: keyof GeneratedAsset, value: string) {
    props.onAssetChange({ ...props.asset, [field]: value });
  }

  function markWorkBuddyVideoReady() {
    const nextAsset = { ...props.asset, videoUrl: workBuddyGeneratedVideoUrl, videoGeneratedAt: nowTime() };
    props.onAssetChange(nextAsset);
    props.onConfirm(nextAsset);
  }

  async function handleConfirmPrompt() {
    if (isRendering) return;
    const regeneratingAsset = { ...props.asset, videoUrl: undefined, videoGeneratedAt: undefined };
    props.onAssetChange(regeneratingAsset);
    props.onConfirm(regeneratingAsset);
    setShowPreview(false);
    setHasGeneratedWorkBuddyVideo(false);
    setIsRendering(true);
    setWorkBuddyRunId("");
    setWorkBuddyError("");
    setWorkBuddyStatus("checking");
    setWorkBuddyStatusMessage("正在连接 WorkBuddy / CodeBuddy。");
    setGeneratedVideoVersion(0);
    setVideoCheckMessage("");
    try {
      await checkWorkBuddyConnection();
      setWorkBuddyStatus("connected");
      setWorkBuddyStatusMessage("已连接 WorkBuddy，正在提交视频生成任务。");
      const runId = await submitWorkBuddyVideoRun(regeneratingAsset);
      setWorkBuddyRunId(runId);
    } catch (error) {
      setWorkBuddyStatus("offline");
      setWorkBuddyStatusMessage("WorkBuddy 服务未连接或提交失败。");
      setWorkBuddyError(error instanceof Error ? error.message : "WorkBuddy 提交失败。");
    } finally {
      setIsRendering(false);
    }
  }

  async function handleCheckGeneratedVideo() {
    const isReady = await checkGeneratedWorkBuddyVideo();
    if (isReady) {
      setGeneratedVideoVersion(Date.now());
      setHasGeneratedWorkBuddyVideo(true);
      setShowPreview(true);
      setVideoCheckMessage("视频已生成，可以预览。");
      markWorkBuddyVideoReady();
      return;
    }
    setShowPreview(false);
    setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
  }

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal" role="dialog" aria-modal="true" aria-label="生成宣传视频">
        <header>
          <div>
            <span className="eyebrow">{modalEyebrow}</span>
            <h3>{props.asset.title}</h3>
            <p>{modalDescription}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="media-modal-body prompt-only">
          <div className={`workbuddy-status workbuddy-status-${workBuddyStatus}`}>
            <span aria-hidden="true" />
            <div>
              <strong>
                WorkBuddy：
                {workBuddyStatus === "connected" ? "已连接" : workBuddyStatus === "checking" ? "连接中" : workBuddyStatus === "offline" ? "未连接" : "待生成时连接"}
              </strong>
              <p>{workBuddyStatusMessage}</p>
            </div>
          </div>
          {shouldShowRenderingState && (
            <div className="video-preview pending-video">
              <div className="loader-orbit">
                <Clapperboard size={26} />
              </div>
              <strong>{isRendering ? "正在提交生成任务" : hasRenderTimedOut ? "视频暂未生成完成" : "正在渲染视频中"}</strong>
              <p>
                {isRendering
                  ? "正在把视频脚本和分镜提交给 WorkBuddy。"
                  : videoCheckMessage || "WorkBuddy 正在渲染 MP4，完成后会自动显示预览。"}
              </p>
              <div className="pending-progress" aria-hidden="true">
                <strong style={{ transform: `scaleX(${videoRenderProgress / 100})` }} />
              </div>
              <small>
                {hasRenderTimedOut
                  ? "没有检测到 MP4，可以稍后点击检查并显示视频。"
                  : isVideoWaitingForResult
                    ? "WorkBuddy 还在返回结果，完成后会自动显示视频。"
                    : "进度会跟随渲染等待推进，不会提前跑满。"}
              </small>
            </div>
          )}
          {workBuddyError && <p className="asset-hint workbuddy-error">{workBuddyError}</p>}
          {showPreview && (
            <div className="video-preview">
              <video
                className="video-player"
                controls
                preload="metadata"
                src={videoPreviewUrl}
              >
                <track kind="captions" />
              </video>
              <p className="asset-hint">
                {hasGeneratedWorkBuddyVideo
                  ? "已显示 WorkBuddy 生成的 MP4。"
                  : "已接入预生成视频：AI_Coach_30s.mp4。可继续下载 MP4 或视频物料包。"}
              </p>
            </div>
          )}
          <div className="media-form">
            <label>
              模型/风格提示词
              <textarea value={props.asset.prompt || ""} onChange={(event) => updateField("prompt", event.target.value)} />
            </label>
            <label>
              30 秒宣传视频脚本
              <textarea value={props.asset.script || ""} onChange={(event) => updateField("script", event.target.value)} />
            </label>
            <label>
              视频分镜表
              <textarea value={props.asset.storyboard || ""} onChange={(event) => updateField("storyboard", event.target.value)} />
            </label>
            <label>
              海报文案 Prompt
              <textarea value={props.asset.posterPrompt || ""} onChange={(event) => updateField("posterPrompt", event.target.value)} />
            </label>
            <label>
              产品视觉图 Prompt
              <textarea value={props.asset.visualPrompt || ""} onChange={(event) => updateField("visualPrompt", event.target.value)} />
            </label>
          </div>
        </div>
        <footer className="context-actions">
          <button type="button" onClick={handleConfirmPrompt} disabled={isRendering || isWaitingForGeneratedVideo}>
            <Clapperboard size={15} />
            {isRendering
              ? "正在提交任务"
              : isWaitingForGeneratedVideo
                ? "正在渲染视频"
                : hasGeneratedWorkBuddyVideo
                  ? "重新生成视频"
                  : "提交 WorkBuddy 生成视频"}
          </button>
          {workBuddyRunId && !showPreview && hasRenderTimedOut && (
            <button type="button" onClick={handleCheckGeneratedVideo}>
              <MonitorPlay size={15} />
              检查并显示视频
            </button>
          )}
          {showPreview && (
            <>
              <button type="button" onClick={() => downloadMediaPackage(props.asset)}>
                <Download size={15} />
                下载视频物料包
              </button>
              {showPreview && (
                <button type="button" onClick={hasGeneratedWorkBuddyVideo ? downloadGeneratedWorkBuddyVideo : downloadDemoVideo}>
                  <MonitorPlay size={15} />
                  下载 MP4 视频
                </button>
              )}
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function FeedbackView(props: {
  activeIdea: Idea;
  submissions: Submission[];
  generatedAssets: GeneratedAsset[];
  onBackToWorkspace: () => void;
  onContinue: (submission: Submission) => void;
  onWithdraw: (submissionId: string) => void;
  onDeleteWithdrawn: (submissionId: string) => void;
  studentAvatarId: StudentAvatarId;
  permissionAccess: PermissionAccess;
}) {
  const emptySearch: StudentFeedbackSearch = { keyword: "", artifactType: "ALL", status: "ALL" };
  const [searchDraft, setSearchDraft] = useState<StudentFeedbackSearch>(emptySearch);
  const [search, setSearch] = useState<StudentFeedbackSearch>(emptySearch);
  const [pendingWithdraw, setPendingWithdraw] = useState<Submission | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Submission | null>(null);
  const [detailSubmission, setDetailSubmission] = useState<Submission | null>(null);
  const filteredSubmissions = props.submissions.filter((submission) => {
    const keyword = search.keyword.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      [
        submission.artifactTitle,
        submission.artifactSummary,
        submission.teacherComment,
        artifactLabels[submission.artifactType],
        statusLabels[submission.status],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    return (
      matchesKeyword &&
      (search.artifactType === "ALL" || submission.artifactType === search.artifactType) &&
      (search.status === "ALL" || submission.status === search.status)
    );
  });

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft);
  }

  function resetSearch() {
    setSearchDraft(emptySearch);
    setSearch(emptySearch);
  }

  return (
    <section className="workspace-panel feedback-page">
      <div className="panel-title">
        <div>
          <span className="eyebrow">学生端</span>
          <h3>老师反馈</h3>
          <p>当前创意：{props.activeIdea.title}。这里仅展示该创意提交给老师审核的阶段成果；切换左侧创意可查看对应反馈。</p>
        </div>
        <button className="ghost-button feedback-back-button" type="button" onClick={props.onBackToWorkspace} disabled={!props.permissionAccess.can("AI 创意工作台")}>
          <MessageSquareText size={16} />
          回到 AI 创意工作台
        </button>
      </div>
      <form className="feedback-search" onSubmit={applySearch}>
        <label className="feedback-search-keyword">
          <span>成果名称 / 老师意见 / 关键词</span>
          <input
            type="search"
            placeholder="输入成果名称、反馈意见或关键词"
            value={searchDraft.keyword}
            onChange={(event) => setSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
          />
        </label>
        <label>
          <span>成果类型</span>
          <PrettySelect
            value={searchDraft.artifactType}
            ariaLabel="筛选成果类型"
            options={[
              { value: "ALL" as ArtifactType | "ALL", label: "全部成果类型" },
              ...(Object.keys(artifactLabels) as ArtifactType[]).map((type) => ({ value: type, label: artifactLabels[type] })),
            ]}
            onChange={(value) => setSearchDraft((current) => ({ ...current, artifactType: value }))}
          />
        </label>
        <label>
          <span>审核状态</span>
          <PrettySelect
            value={searchDraft.status}
            ariaLabel="筛选审核状态"
            options={[
              { value: "ALL" as SubmissionStatus | "ALL", label: "全部状态" },
              ...(Object.keys(statusLabels) as SubmissionStatus[]).map((status) => ({ value: status, label: statusLabels[status] })),
            ]}
            onChange={(value) => setSearchDraft((current) => ({ ...current, status: value }))}
          />
        </label>
        <div className="feedback-search-actions">
          <button className="primary-button feedback-query-button" type="submit">
            <Filter size={15} />
            查询
          </button>
          <button className="ghost-button feedback-reset-button" type="button" onClick={resetSearch}>
            <RotateCcw size={15} />
            重置
          </button>
        </div>
      </form>
      <div className="submission-grid">
        {props.submissions.length === 0 && (
          <article className="empty-state">
            <ClipboardCheck size={26} />
            <strong>还没有提交给老师的成果</strong>
            <p>在 AI 生成结果下点击“提交老师审核”，这里会同步显示状态和老师意见。</p>
          </article>
        )}
        {props.submissions.length > 0 && filteredSubmissions.length === 0 && (
          <article className="empty-state">
            <ClipboardCheck size={26} />
            <strong>暂无匹配成果</strong>
            <p>可以调整成果类型、审核状态或关键词后重新查询。</p>
          </article>
        )}
        {filteredSubmissions.map((submission) => (
          <article className="submission-card" key={submission.id}>
            <div className="submission-card-head">
              <div className="submission-owner-mark">
                <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />
                <div>
                  <span>{artifactLabels[submission.artifactType]}</span>
                  <h4>{submission.artifactTitle}</h4>
                </div>
              </div>
              <div className="submission-card-badges">
                {submission.isExcellent && <em className="excellent-badge">优秀成果</em>}
                <em className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</em>
              </div>
            </div>
            <p>{submission.artifactSummary}</p>
            {submission.isExcellent && (
              <div className="excellent-notice">
                <BookOpen size={16} />
                已被老师标记为优秀实践成果，将进入课程成果库用于后续教学展示与案例沉淀。
              </div>
            )}
            <dl>
              <div>
                <dt>提交时间</dt>
                <dd>{formatSubmittedAt(submission.submittedAt)}</dd>
              </div>
              <div>
                <dt>审核时间</dt>
                <dd>{submission.reviewedAt || "等待老师处理"}</dd>
              </div>
            </dl>
            <div className="teacher-comment-box">
              <strong>老师意见</strong>
              <p>{submission.teacherComment || "老师还没有填写反馈。"}</p>
            </div>
            <div className="context-actions">
              <button type="button" onClick={() => setDetailSubmission(submission)}>
                <FileText size={15} />
                查看详情
              </button>
              <button type="button" onClick={() => props.onContinue(submission)} disabled={!props.permissionAccess.can("AI 创意工作台")}>
                <PenLine size={15} />
                {props.permissionAccess.can("AI 创意工作台") ? "根据反馈继续修改" : "修改权限已停用"}
              </button>
              {submission.status === "pending" && (
                <button type="button" onClick={() => setPendingWithdraw(submission)} disabled={!props.permissionAccess.can("提交老师审核")}>
                  <LogOut size={15} />
                  {props.permissionAccess.can("提交老师审核") ? "撤回提交" : "提交权限已停用"}
                </button>
              )}
              {submission.status === "withdrawn" && (
                <button className="is-danger" type="button" onClick={() => setPendingDelete(submission)}>
                  <Trash2 size={15} />
                  删除记录
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {pendingWithdraw && (
        <WithdrawSubmissionConfirmModal
          submission={pendingWithdraw}
          onCancel={() => setPendingWithdraw(null)}
          onConfirm={() => {
            props.onWithdraw(pendingWithdraw.id);
            setPendingWithdraw(null);
          }}
        />
      )}
      {pendingDelete && (
        <DeleteWithdrawnSubmissionConfirmModal
          submission={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            props.onDeleteWithdrawn(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
      {detailSubmission && <StudentSubmissionDetailModal submission={detailSubmission} generatedAssets={props.generatedAssets} onClose={() => setDetailSubmission(null)} />}
    </section>
  );
}

function WithdrawSubmissionConfirmModal(props: { submission: Submission; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-submission-title">
        <header>
          <div>
            <span className="eyebrow">撤回提交</span>
            <h3 id="withdraw-submission-title">确认撤回这次提交吗？</h3>
            <p>撤回后，教师端将不再显示该待审核成果；学生端仍会保留已撤回记录，方便回看。</p>
          </div>
          <button type="button" aria-label="关闭撤回确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.submission.artifactTitle}</strong>
          <p>{props.submission.artifactSummary}</p>
          <span>{artifactLabels[props.submission.artifactType]} · {formatSubmittedAt(props.submission.submittedAt)}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认撤回
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function DeleteWithdrawnSubmissionConfirmModal(props: { submission: Submission; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-withdrawn-submission-title">
        <header>
          <div>
            <span className="eyebrow">删除撤回记录</span>
            <h3 id="delete-withdrawn-submission-title">确认删除这条已撤回内容吗？</h3>
            <p>只会删除学生端这条撤回记录，不会删除原始 AI 对话和已经生成的本地文件。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.submission.artifactTitle}</strong>
          <p>{props.submission.artifactSummary}</p>
          <span>{artifactLabels[props.submission.artifactType]} · 已撤回 · {formatSubmittedAt(props.submission.submittedAt)}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            删除记录
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function StudentSubmissionDetailModal(props: { submission: Submission; generatedAssets: GeneratedAsset[]; onClose: () => void }) {
  const blocks = props.submission.blocks || [];
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop student-submission-detail-backdrop" role="presentation">
      <section className="media-modal review-detail-modal student-submission-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-submission-detail-title">
        <header>
          <div>
            <span className="eyebrow">提交内容详情</span>
            <h3 id="student-submission-detail-title">{props.submission.artifactTitle}</h3>
            <p>这里展示的是提交给老师时保存的成果快照，便于学生自己回看提交内容。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭详情" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="review-detail-body student-submission-detail-body">
          <section className="detail-card submission-overview-card">
            <div className="submission-overview-head">
              <div>
                <span className="eyebrow">提交概况</span>
                <h4>{artifactLabels[props.submission.artifactType]}</h4>
              </div>
              <em className={`submission-status ${props.submission.status}`}>{statusLabels[props.submission.status]}</em>
            </div>
            <p>{props.submission.artifactSummary}</p>
            <dl className="submission-detail-meta compact">
              <div>
                <dt>提交时间</dt>
                <dd>{formatSubmittedAt(props.submission.submittedAt)}</dd>
              </div>
              <div>
                <dt>审核时间</dt>
                <dd>{props.submission.reviewedAt || "等待老师处理"}</dd>
              </div>
            </dl>
          </section>
          <section className="detail-card">
            <span className="eyebrow">老师意见</span>
            <p>{props.submission.teacherComment || "老师还没有填写反馈。"}</p>
          </section>
          <section className="detail-card">
            <span className="eyebrow">提交材料</span>
            <div className="review-blocks">
              {blocks.length === 0 && (
                <article>
                  <strong>暂无结构化内容</strong>
                  <ul>
                    <li>这条提交没有保存到结构化成果块，可以回到 AI 创意工作台查看原始对话。</li>
                  </ul>
                </article>
              )}
              {blocks.map((block) => (
                <article key={block.title}>
                  <strong>{block.title}</strong>
                  <ul>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onClose}>
            关闭
          </button>
          <button className="primary-button" type="button" onClick={() => downloadSubmissionArtifact(props.submission, props.generatedAssets)}>
            <Download size={15} />
            {getSubmissionDownloadLabel(props.submission)}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function DefenseView(props: {
  activeIdea: Idea;
  messages: ChatMessage[];
  generatedAssets: GeneratedAsset[];
  practices: DefensePractice[];
  studentAvatarId: StudentAvatarId;
  onSaveDefense: (practice: DefensePractice) => void;
  permissionAccess: PermissionAccess;
}) {
  const latestBpMessage = [...props.messages].reverse().find((message) => message.sender === "ai" && message.artifactType === "BP");
  const [turns, setTurns] = useState<DefenseTurn[]>([
    {
      id: makeId("DT"),
      sender: "ai",
      content: latestBpMessage
        ? "我是本轮 AI 评委。系统会自动使用当前创意最新生成的商业计划书 BP 作为答辩依据，点击“开始答辩”即可进入模拟。"
        : "当前创意还没有商业计划书 BP。请先到商业模式/BP 专家生成 BP，再进入答辩模拟。",
      createdAt: nowTime(),
    },
  ]);
  const [answer, setAnswer] = useState(() => (latestBpMessage ? getDefenseSuggestedAnswer(0) : ""));
  const [evaluation, setEvaluation] = useState<ResultBlock[] | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<DefensePractice | null>(null);
  const defenseChatListRef = useRef<HTMLDivElement | null>(null);
  const defenseHasScrolledRef = useRef(false);
  const speechInput = useSpeechInput({
    value: answer,
    onChange: setAnswer,
    fallbackText: "语音回答：我们的项目服务商学院创业实践课堂，先帮助学生把创意整理成可验证假设，再生成 BP、PPT、路演稿和答辩材料，老师端可以审核并反馈。",
  });
  const activeBlocks = selectedPractice
    ? defenseBlocks(selectedPractice)
    : evaluation || buildDefenseEvaluation();

  useEffect(() => {
    const chatList = defenseChatListRef.current;
    if (!chatList) return;
    window.requestAnimationFrame(() => {
      if (!defenseHasScrolledRef.current) {
        defenseHasScrolledRef.current = true;
        chatList.scrollTop = chatList.scrollHeight;
        return;
      }
      chatList.scrollTo({ top: chatList.scrollHeight, behavior: "smooth" });
    });
  }, [turns.length, evaluation]);

  function appendAi(content: string) {
    setTurns((current) => [...current, { id: makeId("DT"), sender: "ai", content, createdAt: nowTime() }]);
  }

  function handleStart() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    const basis = latestBpMessage;
    if (!basis) {
      appendAi("当前创意还没有可用的商业计划书 BP。先生成 BP 后，我会自动带入最新版本进行答辩模拟。");
      setAnswer("");
      return;
    }
    setSelectedPractice(null);
    setEvaluation(null);
    speechInput.resetVoiceInput();
    setTurns([
      {
        id: makeId("DT"),
        sender: "ai",
        content: `本轮将基于当前创意最新的《${basis.skillName || "商业计划书 BP"}》进行答辩。第一个问题：学校为什么愿意为这个系统付费，而不是让学生自己使用通用 AI？`,
        createdAt: nowTime(),
      },
    ]);
    setAnswer(getDefenseSuggestedAnswer(0));
  }

  function handleSendAnswer() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    const content = answer.trim();
    if (!content) return;
    const nextTurnCount = turns.filter((turn) => turn.sender === "student").length + 1;
    setTurns((current) => [...current, { id: makeId("DT"), sender: "student", content, createdAt: nowTime() }]);
    setAnswer("");
    speechInput.resetVoiceInput();
    window.setTimeout(() => {
      appendAi(buildFollowUpQuestion(content, nextTurnCount));
      setAnswer(getDefenseSuggestedAnswer(nextTurnCount));
    }, 3200);
  }

  function buildCurrentPractice(visibility: "self" | "teacher") {
    const practice = buildDefensePractice(props.activeIdea.id, visibility);
    return {
      ...practice,
      transcript: turns,
      evaluation: evaluation || buildDefenseEvaluation(),
      createdAt: nowDateTime(),
    };
  }

  function handleFinish() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    window.setTimeout(() => {
      const nextEvaluation = buildDefenseEvaluation(turns);
      const evaluationTurn: DefenseTurn = {
        id: makeId("DT"),
        sender: "ai",
        content: `本轮答辩已结束，我先给出综合评价和下一轮修改建议。\n\n${formatDefenseEvaluationForChat(nextEvaluation)}`,
        createdAt: nowTime(),
      };
      const nextTranscript = [...turns, evaluationTurn];
      setEvaluation(nextEvaluation);
      const savedPractice: DefensePractice = {
        ...buildDefensePractice(props.activeIdea.id, "self"),
        transcript: nextTranscript,
        evaluation: nextEvaluation,
        createdAt: nowDateTime(),
      };
      setTurns(nextTranscript);
      setSelectedPractice(savedPractice);
      props.onSaveDefense(savedPractice);
    }, 4200);
  }

  function handleSave(visibility: "self" | "teacher") {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    if (visibility === "teacher" && !props.permissionAccess.can("提交老师审核")) {
      props.permissionAccess.block("提交老师审核");
      return;
    }
    const practice = buildCurrentPractice(visibility);
    props.onSaveDefense(practice);
  }

  function selectDefensePractice(practice: DefensePractice) {
    setSelectedPractice(practice);
    setTurns(practice.transcript?.length ? practice.transcript : buildDefensePractice(practice.ideaId, practice.visibility).transcript);
    setEvaluation(practice.evaluation?.length ? practice.evaluation : buildDefenseEvaluation());
  }

  return (
    <section className="workspace-panel defense-page">
      <div className="panel-title">
        <div>
          <span className="eyebrow">AI 评委对话</span>
          <h3>答辩模拟：{props.activeIdea.title}</h3>
        </div>
        <button
          className="ghost-button soft-download-button"
          type="button"
          onClick={() => downloadWord("答辩复盘.doc", "答辩复盘", activeBlocks)}
          disabled={!props.permissionAccess.can("下载个人成果")}
        >
          <Download size={16} />
          下载答辩复盘
        </button>
      </div>
      <div className="defense-layout">
        <div className="defense-main">
          <section className="defense-chat">
            <div className="defense-chat-list" ref={defenseChatListRef}>
              {turns.map((turn) => (
                <article className={`defense-turn ${turn.sender}`} key={turn.id}>
                  <div className="buddy-avatar">
                    {turn.sender === "ai" ? <DefenseJudgeAvatar size={34} /> : <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />}
                  </div>
                  <div className="buddy-bubble">
                    <span>{turn.sender === "ai" ? "AI 评委" : "学生回答"} · {turn.createdAt}</span>
                    <p>{turn.content}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="defense-composer">
              <textarea
                aria-label="输入答辩回答"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  speechInput.resetVoiceInput();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSendAnswer();
                  }
                }}
                placeholder="输入你的答辩回答，例如：我们不是单点生成工具，而是把学生端生成、教师端审核和课程成果沉淀连成闭环..."
              />
              {speechInput.notice && (
                <p className={`voice-status ${speechInput.isListening ? "listening" : ""}`} aria-live="polite">
                  {speechInput.notice}
                </p>
              )}
              <div className="context-actions defense-composer-actions">
                <div className="defense-composer-action-group">
                  <button type="button" onClick={handleStart} disabled={!props.permissionAccess.can("答辩模拟")}>
                    <Mic size={15} />
                    开始答辩
                  </button>
                  <button type="button" onClick={handleFinish} disabled={!props.permissionAccess.can("答辩模拟")}>
                    <CheckCircle2 size={15} />
                    结束并生成评价
                  </button>
                </div>
                <div className="defense-composer-action-group right">
                  <button
                    className={`defense-voice-button ${speechInput.isListening ? "voice-active" : ""}`.trim()}
                    type="button"
                    onClick={speechInput.toggle}
                    disabled={!props.permissionAccess.can("答辩模拟")}
                  >
                    <Mic size={15} />
                    {speechInput.isListening ? "停止听写" : "语音回答"}
                  </button>
                  <button
                    className="defense-send-button"
                    type="button"
                    onClick={handleSendAnswer}
                    disabled={!props.permissionAccess.can("答辩模拟")}
                    aria-keyshortcuts="Enter"
                    title="Enter 发送"
                  >
                    <Send size={15} />
                    发送回答
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
        <aside className="defense-side">
          <div className="detail-card defense-action-card">
            <span className="eyebrow">答辩动作</span>
            <h4>自动答辩依据</h4>
            <p>系统会自动读取当前创意里最新生成的商业计划书 BP，不需要学生手动选择。</p>
            <div className={`auto-basis-card ${latestBpMessage ? "" : "empty"}`}>
              <strong>{latestBpMessage ? latestBpMessage.skillName || "商业计划书 BP" : "暂无商业计划书 BP"}</strong>
              <span>{latestBpMessage ? `生成时间：${latestBpMessage.createdAt}` : "请先在商业模式/BP 专家里生成最终 BP 成果。"}</span>
            </div>
            <div className="context-actions vertical">
              <button type="button" onClick={() => handleSave("teacher")} disabled={!props.permissionAccess.can("答辩模拟") || !props.permissionAccess.can("提交老师审核")}>
                <Send size={15} />
                发送给老师审核
              </button>
              <button type="button" onClick={() => handleSave("self")} disabled={!props.permissionAccess.can("答辩模拟")}>
                <Save size={15} />
                仅保存给自己
              </button>
              <button type="button" onClick={() => downloadWord("答辩复盘.doc", "答辩复盘", activeBlocks)} disabled={!props.permissionAccess.can("下载个人成果")}>
                <Download size={15} />
                自己下载
              </button>
            </div>
          </div>
          <div className="detail-card defense-record-card">
            <span className="eyebrow">我的答辩记录</span>
            <div className="defense-records">
              {props.practices.length === 0 && <p>暂无保存记录。</p>}
              {props.practices.map((practice) => (
                <article
                  className={selectedPractice?.id === practice.id ? "selected" : ""}
                  key={practice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectDefensePractice(practice)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectDefensePractice(practice);
                    }
                  }}
                >
                  <div className="defense-record-owner">
                    <StudentCartoonAvatar avatarId={props.studentAvatarId} size={30} />
                    <div className="defense-record-copy">
                      <strong>{practice.createdAt}</strong>
                      <span>{practice.visibility === "teacher" ? "已发送给老师" : "仅自己可见"}</span>
                    </div>
                  </div>
                  <div className="defense-record-action">
                    <em>{practice.evaluation?.[0]?.items?.[0]?.match(/\d+\/100/)?.[0] || "86/100"}</em>
                    <span>{selectedPractice?.id === practice.id ? "当前" : "查看"}</span>
                    <ChevronRight size={16} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PromptSaveSuccessModal(props: { message?: string; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop save-success-backdrop" role="presentation">
      <section className="save-success-modal" role="dialog" aria-modal="true" aria-label="保存成功">
        <div className="save-success-mark">
          <CheckCircle2 size={28} />
        </div>
        <h3>{props.message || "已保存系统提示词和用户输入组装规则。"}</h3>
        <button type="button" onClick={props.onClose}>
          确定
        </button>
      </section>
    </div>,
    document.body,
  );
}

type IssueOverviewMetric = {
  value: string;
  label: string;
  note: string;
  detailTitle: string;
  summary: string;
  items: string[];
  action: string;
};

function IssueMetricDetailModal(props: { metric: IssueOverviewMetric; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal issue-metric-modal" role="dialog" aria-modal="true" aria-label="问题监测指标详情">
        <header>
          <div>
            <span className="eyebrow">课堂问题监测</span>
            <h3>{props.metric.detailTitle}</h3>
            <p>{props.metric.summary}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="issue-metric-summary">
          <strong>{props.metric.value}</strong>
          <div>
            <span>{props.metric.label}</span>
            <p>{props.metric.note}</p>
          </div>
        </div>
        <div className="issue-metric-body">
          <h4>具体说明</h4>
          <ul>
            {props.metric.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="issue-metric-action">
          <span>建议处理</span>
          <p>{props.metric.action}</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function getIssuePlaybook(label: string | null) {
  switch (label) {
    case "竞品维度不足":
      return {
        priority: "适合在市场竞品节点集中讲 12 分钟",
        evidenceGap: "学生缺的是比较维度，不是竞品名称数量。",
        teacherMove: "先要求所有组按同一张矩阵补齐，再点评差异化结论。",
        questions: [
          "你们比较的是替代方案、直接竞品，还是老师当前手工流程？",
          "这个竞品维度能不能支撑用户为什么选你们，而不是只说明功能多？",
          "如果删掉“更智能”这句话，你们还剩下哪一个可证明的差异？",
        ],
        reviewFocus: [
          "竞品是否至少覆盖通用 AI、垂直平台、校内现有流程三类。",
          "每个比较维度是否和购买理由或课堂验收有关。",
          "PPT 竞争页是否能直接沉淀为答辩时的差异化回答。",
        ],
      };
    case "答辩证据薄弱":
      return {
        priority: "适合安排答辩前证据压力测试",
        evidenceGap: "学生有观点，但缺少能现场引用的材料编号、页面和数据。",
        teacherMove: "让每个关键结论绑定一页 PPT 或一条访谈证据。",
        questions: [
          "这个结论对应哪一页材料？评委追问时你能不能马上指向证据？",
          "有没有修改前后对比，能证明 AI 不是只生成漂亮文本？",
          "学校为什么相信这个试点有效？8 周后看哪三个指标？",
        ],
        reviewFocus: [
          "路演稿是否包含结论、证据、指标、风险应对四句结构。",
          "PPT 是否有访谈、Rubric、试点数据或修改对比。",
          "答辩模拟记录是否覆盖采购、数据安全、教师工作量三类追问。",
        ],
      };
    case "用户画像泛化":
      return {
        priority: "适合回到项目定位节点做一次收窄",
        evidenceGap: "学生没有明确第一批用户，导致功能、渠道和定价都漂。",
        teacherMove: "要求先锁定“一类人、一个场景、一个高频任务”。",
        questions: [
          "第一个愿意试用的人是谁？他在哪个具体场景里遇到这个问题？",
          "这个用户现在用什么替代方案解决？为什么现在愿意换？",
          "如果只能服务 20 个种子用户，你们会选哪一类？",
        ],
        reviewFocus: [
          "用户画像是否区分使用者、付费方和受益者。",
          "痛点是否有触发场景和发生频率，不只是效率低。",
          "功能优先级是否能从第一用户任务反推出来。",
        ],
      };
    case "试点指标缺失":
      return {
        priority: "适合在 BP 与实施计划节点补齐",
        evidenceGap: "学生写了上线动作，但没有写验收口径和复盘节奏。",
        teacherMove: "要求每组补 3 个过程指标、2 个结果指标，并对应第 2/4/8 周。",
        questions: [
          "8 周后老师只看一张表，凭什么判断这个项目值得继续？",
          "哪些指标来自学生端，哪些来自教师端，哪些来自课程管理端？",
          "如果指标没有达标，你们下一轮会改产品、改流程，还是改目标用户？",
        ],
        reviewFocus: [
          "指标是否包含使用频次、提交通过率、教师点评耗时、优秀成果数量。",
          "每个指标是否有来源、记录人和复盘时间。",
          "BP 和 PPT 中的试点口径是否一致。",
        ],
      };
    default:
      return {
        priority: "适合本周课堂集中讲评 15 分钟",
        evidenceGap: "核心缺口是付费方、交付包和验收指标没有闭合。",
        teacherMove: "先讲 B2B2C 校园采购逻辑，再要求学生重写收入模式。",
        questions: [
          "谁付钱？为什么现在付？付完之后学校拿到什么可验收结果？",
          "学生愿意用和学院愿意买之间，还缺哪一个管理价值证明？",
          "试点包、课程包、学院续费分别交付什么，成本边界在哪里？",
        ],
        reviewFocus: [
          "是否拆清付费方、使用者、受益者三类角色。",
          "收入模式是否对应课程试点包、教师培训、成果沉淀等交付物。",
          "成本测算是否包含模型、服务器、教师培训和案例库维护。",
        ],
      };
  }
}

function TeacherView(props: {
  submissions: Submission[];
  allSubmissions: Submission[];
  activeSubmission?: Submission;
  generatedAssets: GeneratedAsset[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  customExperts: CustomExpertRecord[];
  teacherName: string;
  filter: ArtifactType | "ALL";
  statusFilter: SubmissionStatus | "ALL";
  teacherComment: string;
  permissionAccess: PermissionAccess;
  onFilterChange: (filter: ArtifactType | "ALL") => void;
  onStatusFilterChange: (filter: SubmissionStatus | "ALL") => void;
  onSelectSubmission: (submission: Submission) => void;
  onTeacherCommentChange: (value: string) => void;
  onSaveTeacherComment: (submissionId: string, comment: string) => void;
  onReview: (status: SubmissionStatus) => void;
  onToggleExcellent: (submissionId: string) => void;
  onJumpPending: () => void;
  onPreviewPpt: (asset: GeneratedAsset) => void;
  onPreviewVideo: (asset: GeneratedAsset) => void;
  onPreviewWord: (preview: WordPreview) => void;
  onUploadKnowledge: (assets: KnowledgeUpload[]) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;
  onKnowledgeBaseStatesChange: (states: KnowledgeBaseStates) => void;
  onKnowledgeCatalogChange: (catalog: KnowledgeBaseCatalogItem[]) => void;
  onPromptKnowledgeRoutesChange: (routes: PromptKnowledgeRoutes) => void;
  onCustomExpertsChange: (experts: CustomExpertRecord[]) => void;
  onDeleteExpert: (expertId: ExpertId) => boolean;
  onDeleteKnowledgeBase: (category: KnowledgeCategory) => boolean;
}) {
  const pendingCount = props.allSubmissions.filter((item) => item.status === "pending").length;
  const [teacherModule, setTeacherModule] = useState<"review" | "knowledge" | "prompts" | "issues">("review");
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [reviewSearchDraft, setReviewSearchDraft] = useState<TeacherReviewSearch>(() => ({
    ...emptyTeacherReviewSearch,
    artifactType: props.filter,
    status: props.statusFilter,
  }));
  const [reviewSearch, setReviewSearch] = useState<TeacherReviewSearch>(() => ({
    ...emptyTeacherReviewSearch,
    artifactType: props.filter,
    status: props.statusFilter,
  }));
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [knowledgeSearchDraft, setKnowledgeSearchDraft] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [knowledgeSearch, setKnowledgeSearch] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [knowledgePreviewId, setKnowledgePreviewId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<KnowledgeCategory>("教学大纲");
  const [newKnowledgeName, setNewKnowledgeName] = useState("");
  const [knowledgeDirectorySearchDraft, setKnowledgeDirectorySearchDraft] = useState("");
  const [knowledgeDirectorySearch, setKnowledgeDirectorySearch] = useState("");
  const [knowledgeBasePreviewCategory, setKnowledgeBasePreviewCategory] = useState<KnowledgeCategory | null>(null);
  const [knowledgeSaveMessage, setKnowledgeSaveMessage] = useState<string | null>(null);
  const [pendingDeleteExpertId, setPendingDeleteExpertId] = useState<ExpertId | null>(null);
  const [teacherPromptExpertId, setTeacherPromptExpertId] = useState<ExpertId>("brainstorm");
  const [teacherPromptMode, setTeacherPromptMode] = useState<ModelMode>("Auto");
  const [newExpertName, setNewExpertName] = useState("");
  const [newExpertRole, setNewExpertRole] = useState("");
  const [newExpertScenario, setNewExpertScenario] = useState("");
  const initialTeacherPromptParts = buildPromptTemplateParts(
    experts[0],
    "Auto",
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    props.promptKnowledgeRoutes[experts[0].id],
  );
  const [teacherSystemPromptDraft, setTeacherSystemPromptDraft] = useState(initialTeacherPromptParts.system);
  const [teacherUserPromptDraft, setTeacherUserPromptDraft] = useState(initialTeacherPromptParts.user);
  const [isPromptSaveOpen, setIsPromptSaveOpen] = useState(false);
  const [isSkillFolderGuideOpen, setIsSkillFolderGuideOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [selectedIssueMetricLabel, setSelectedIssueMetricLabel] = useState<string | null>(null);
  const [reviewDetailTab, setReviewDetailTab] = useState<TeacherReviewTab>("files");
  const [diagnosingSubmissionId, setDiagnosingSubmissionId] = useState<string | null>(null);
  const [diagnosedSubmissionIds, setDiagnosedSubmissionIds] = useState<string[]>([]);
  const [confirmedRubricSubmissionIds, setConfirmedRubricSubmissionIds] = useState<string[]>([]);
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const [rubricDrafts, setRubricDrafts] = useState<Record<string, RubricScore[]>>({});
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const expertSkillFolderUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectedUpload = props.knowledgeUploads.find((asset) => asset.id === selectedUploadId) || null;
  const knowledgePreviewAsset = knowledgePreviewId ? props.knowledgeUploads.find((asset) => asset.id === knowledgePreviewId) || null : null;
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const knowledgeBasePreviewItem = knowledgeBasePreviewCategory
    ? activeKnowledgeCatalog.find((base) => base.category === knowledgeBasePreviewCategory) || null
    : null;
  const selectedUploadKnowledgeBase = activeKnowledgeCatalog.find((base) => base.category === uploadCategory) || activeKnowledgeCatalog[0];
  const teacherPromptExpert = experts.find((expert) => expert.id === teacherPromptExpertId) || experts[0];
  const pendingDeleteExpert = pendingDeleteExpertId ? experts.find((expert) => expert.id === pendingDeleteExpertId) || null : null;
  const teacherPromptKnowledgeCategories = props.promptKnowledgeRoutes[teacherPromptExpert.id] || getExpertKnowledgeCategories(teacherPromptExpert.id);
  const teacherPromptMeta = buildPromptTemplateParts(
    teacherPromptExpert,
    teacherPromptMode,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    teacherPromptKnowledgeCategories,
  );

  const issueDetails: Record<
    string,
    {
      value: string;
      level: string;
      trend: string;
      affectedGroups: string;
      evidence: string[];
      guidance: string[];
      relatedTypes: ArtifactType[];
      relatedSamples: Array<{ title: string; meta: string; summary: string }>;
    }
  > = {
    商业模式不清: {
      value: "78%",
      level: "高",
      trend: "较上周 +12%",
      affectedGroups: "35 名学生",
      evidence: [
        "BP 中只写“订阅收费”，没有说明学校采购预算来自课程建设、就业质量还是数字化教学项目。",
        "收入来源和交付内容没有对应关系，难以判断试点后如何续费。",
        "缺少 8 周试点中的可量化指标，例如使用频次、成果通过率、教师点评节省时间。",
        "部分学生把“学生愿意用”和“学校愿意买”混在一起，导致付费方、使用者和受益者没有拆开。",
        "成本测算只写服务器和模型调用，没有估算教师培训、模板初始化和案例库维护投入。",
      ],
      guidance: [
        "要求学生补一张“付费方-采购理由-交付包-验收指标”四列表。",
        "课堂集中讲解 B2B2C 校园场景，不要把学生用户和学校付费方混在一起。",
        "批改时优先追问：谁付钱、为什么现在付、交付什么、如何证明有效。",
        "让学生把收入模式写成“试点包-课程包-学院续费”三层，不要只写单一订阅制。",
        "要求每个收费项都对应一个可验收结果，例如通过率、修改轮次、教师点评耗时或优秀案例数量。",
      ],
      relatedTypes: ["BP", "POSITIONING"],
      relatedSamples: [
        {
          title: "AI 就业教练 - BP 收入模式修订稿",
          meta: "陈思源 / 第 3 组 / 商业计划书 BP",
          summary: "已补充学院采购理由、课程试点包、教师培训和 8 周验收指标，但续费逻辑还需要量化。",
        },
        {
          title: "校园低碳积分平台 - 付费方拆解",
          meta: "李若涵 / 第 4 组 / 项目定位",
          summary: "把使用者、赞助企业和学校管理方分开写，仍需说明企业为什么持续投入。",
        },
        {
          title: "商科案例共创库 - 交付包清单",
          meta: "王泽宇 / 第 6 组 / 商业计划书 BP",
          summary: "已形成课程包、案例库初始化和教师工作坊三类交付物，缺少成本边界。",
        },
      ],
    },
    竞品维度不足: {
      value: "64%",
      level: "中高",
      trend: "较上周 +8%",
      affectedGroups: "31 名学生",
      evidence: [
        "只罗列竞品名称，没有按教学闭环、教师审核、成果沉淀、数据看板等维度比较。",
        "通用 AI、招聘平台和高校管理系统被放在同一层级，比较对象不够清楚。",
        "缺少差异化结论，无法支撑后续 PPT 中的竞争定位页。",
        "竞品结论常写成“我们更智能”，但没有落到课程流程、老师审核和成果复用上。",
      ],
      guidance: [
        "统一使用四维竞品矩阵：目标用户、核心场景、教师参与度、成果沉淀能力。",
        "要求每组至少对比 3 类替代方案，并写出“我们不做什么”。",
        "教师点评重点放在比较维度是否服务商业判断，而不是功能清单是否完整。",
        "优秀案例可展示“通用 AI vs 校园就业系统 vs 本项目”的三类替代方案，不再横向堆产品名称。",
      ],
      relatedTypes: ["MARKET", "POSITIONING", "PPT"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 竞品矩阵页",
          meta: "陈思源 / 第 3 组 / 市场竞品",
          summary: "已按教学适配、教师参与、成果沉淀、就业数据闭环四个维度重做对比。",
        },
        {
          title: "校园低碳积分平台 - 替代方案比较",
          meta: "李若涵 / 第 4 组 / 路演 PPT",
          summary: "将校园小程序、企业 ESG 平台、学生社团活动三类方案分层比较，差异化更清楚。",
        },
        {
          title: "智能简历诊所 - 竞争定位说明",
          meta: "赵一鸣 / 第 2 组 / 项目定位",
          summary: "已说明不做招聘平台，而是聚焦课程内简历训练和老师反馈闭环。",
        },
      ],
    },
    答辩证据薄弱: {
      value: "52%",
      level: "中",
      trend: "较上周 +5%",
      affectedGroups: "26 名学生",
      evidence: [
        "答辩回答多为价值宣称，缺少访谈、试点、评分 Rubric 或修改前后对比证据。",
        "被追问数据安全、教师工作量、学校采购理由时，回答停留在原则层面。",
        "路演 PPT 中图表和案例支撑不足，导致答辩时难以引用具体页面。",
        "学生能说出功能价值，但不能把结论指回具体材料，现场容易被追问打断。",
      ],
      guidance: [
        "要求学生把每个关键结论绑定一个证据来源：访谈原话、试点数据、模板标准或教师反馈。",
        "答辩前增加 10 分钟压力测试，固定追问商业可行性、教学价值、数据安全三类问题。",
        "教师审核 PPT 时同步检查“这页能回答哪个评委问题”。",
        "把答辩回答统一改成“结论-证据-试点指标-风险应对”四句结构，便于现场表达。",
      ],
      relatedTypes: ["DEFENSE", "PPT", "BP"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 答辩压力测试记录",
          meta: "陈思源 / 第 3 组 / 答辩模拟",
          summary: "学校采购价值回答较完整，数据安全和教师工作量两题还需要补证据。",
        },
        {
          title: "商科案例共创库 - 评委追问清单",
          meta: "王泽宇 / 第 6 组 / 答辩模拟",
          summary: "已整理 8 个高频追问，缺少每个回答对应的页面和材料来源。",
        },
        {
          title: "智能简历诊所 - PPT 证据页",
          meta: "赵一鸣 / 第 2 组 / 路演 PPT",
          summary: "补充了修改前后简历对比图，仍需增加访谈原话和样本数量说明。",
        },
      ],
    },
    用户画像泛化: {
      value: "47%",
      level: "中",
      trend: "较上周 -3%",
      affectedGroups: "22 名学生",
      evidence: [
        "目标用户写成“所有大学生”或“所有创业者”，没有区分第一批试点用户。",
        "痛点描述停留在“效率低、信息多”，缺少具体触发场景和使用频率。",
        "用户画像和后续产品功能之间缺少对应关系，导致功能优先级不清楚。",
        "部分成果没有说明用户现在的替代做法，导致评委难判断是否真的需要新方案。",
      ],
      guidance: [
        "要求学生用“一类人 + 一个场景 + 一个高频任务”重写第一用户。",
        "课堂示范把泛化用户拆成采购方、使用者、受益者三类，不要混写。",
        "点评时优先追问：这个人现在怎么解决、为什么现在愿意换、先服务哪一小群。",
        "让学生补一张“第一用户的一天”场景卡，把触发点、任务、阻碍和愿意尝试的理由写清楚。",
      ],
      relatedTypes: ["BRAINSTORM", "POSITIONING", "BP"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 第一用户画像卡",
          meta: "陈思源 / 第 3 组 / 项目定位",
          summary: "已从所有大学生收窄到大三大四商学院求职学生，仍需补充使用频率。",
        },
        {
          title: "校园低碳积分平台 - 种子用户访谈",
          meta: "李若涵 / 第 4 组 / 头脑风暴",
          summary: "已有学生社团和宿舍楼层长两类种子用户，需要进一步选定第一批。",
        },
        {
          title: "跨境案例助教 - 用户任务拆解",
          meta: "周明轩 / 第 8 组 / 项目定位",
          summary: "把用户任务拆成找案例、改分析框架、准备课堂汇报三步，定位更清楚。",
        },
      ],
    },
    试点指标缺失: {
      value: "41%",
      level: "中",
      trend: "较上周 +4%",
      affectedGroups: "19 名学生",
      evidence: [
        "行动计划里只有“上线、推广、优化”，没有 8 周内可验收的数据口径。",
        "缺少使用频次、提交通过率、老师点评耗时、学生满意度等教学指标。",
        "试点结束后如何判断继续投入没有写清楚，影响 BP 的可执行性。",
        "部分学生写了目标值，但没有说明数据从哪里来、谁记录、多久复盘一次。",
      ],
      guidance: [
        "统一要求每组补 3 个过程指标和 2 个结果指标，绑定到第 2、4、8 周。",
        "把指标和教师审核动作连起来，例如退回次数、修改完成率、优秀成果数量。",
        "路演前集中检查“如果 8 周后只看一张表，老师能否判断项目有效”。",
        "要求指标必须同时包含学生侧、教师侧和课程侧，避免只写访问量或注册数。",
      ],
      relatedTypes: ["BP", "PPT", "SCRIPT"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 8 周试点指标表",
          meta: "陈思源 / 第 3 组 / 商业计划书 BP",
          summary: "已补过程指标和结果指标，建议增加每周教师点评耗时对比。",
        },
        {
          title: "校园低碳积分平台 - 试点复盘口径",
          meta: "李若涵 / 第 4 组 / 商业计划书 BP",
          summary: "有参与人数和任务完成率，但还缺企业赞助转化和校园管理价值指标。",
        },
        {
          title: "跨境案例助教 - 路演试点页",
          meta: "周明轩 / 第 8 组 / 路演 PPT",
          summary: "把第 2、4、8 周里程碑放进 PPT，演讲稿还需补判断标准。",
        },
      ],
    },
  };
  const issueEntries = Object.entries(issueDetails);
  const focusedIssueLabel = selectedIssue || issueEntries[0]?.[0] || null;
  const activeIssue = focusedIssueLabel ? issueDetails[focusedIssueLabel] : null;
  const activeIssuePlaybook = getIssuePlaybook(focusedIssueLabel);
  const issueOverviewCards: IssueOverviewMetric[] = [
    {
      value: "5 类",
      label: "高频共性问题",
      note: "覆盖定位、BP、PPT、答辩",
      detailTitle: "高频共性问题分布",
      summary: "系统从学生提交成果、答辩模拟记录和教师反馈中提取共性卡点，用于判断下一节课要集中讲什么。",
      items: [
        "商业模式不清：集中在 BP 和路演 PPT，主要缺少付费方、交付包、验收指标。",
        "竞品维度不足：集中在市场竞品和项目定位，问题不是竞品少，而是维度不能支撑商业判断。",
        "答辩证据薄弱：集中在答辩模拟和 PPT，学生容易讲价值但指不出证据。",
        "用户画像泛化：集中在头脑风暴和项目定位，第一用户不清会影响后续定价、渠道和功能优先级。",
        "试点指标缺失：集中在 BP 和实施计划，缺少 8 周内可验收的数据口径。",
      ],
      action: "建议教师先处理商业模式和答辩证据两个高风险问题，再把用户画像和试点指标作为小组回改任务。",
    },
    {
      value: "45",
      label: "名学生出现过卡点",
      note: "商业模式和证据链最集中",
      detailTitle: "学生卡点覆盖情况",
      summary: "45 名学生并非都出现同一问题，而是在不同阶段暴露出类似表达和材料缺口。",
      items: [
        "35 名学生在商业模式表述中没有拆清使用者、付费方和受益者。",
        "31 名学生的竞品分析只写竞品名称，没有形成可比较维度。",
        "26 名学生在答辩模拟中无法把关键结论指向具体材料。",
        "22 名学生的第一用户仍写得过宽，影响项目定位和试点设计。",
      ],
      action: "建议以小组为单位布置回改，要求每组只改当前最高风险节点，避免所有问题同时改导致效率下降。",
    },
    {
      value: "18 条",
      label: "可追踪证据",
      note: "来自阶段成果、答辩和教师反馈",
      detailTitle: "证据来源追踪",
      summary: "证据主要来自阶段成果文本、答辩问答、教师退回意见和学生修改后的版本对比。",
      items: [
        "阶段成果：BP、PPT、定位说明中可直接看到概念混用、指标缺失和证据不足。",
        "答辩记录：评委追问后，学生回答是否能引用页面、访谈或数据。",
        "教师反馈：退回修改意见中高频出现的关键词会进入课堂问题统计。",
        "版本对比：同一成果修改前后是否补齐用户、竞品、商业模式和试点指标。",
      ],
      action: "建议教师在审核详情里优先查看“提交材料”和“AI 项目诊断”，用证据定位问题，不只凭印象判断。",
    },
    {
      value: "15 分钟",
      label: "建议集中讲评",
      note: "优先处理付费方和试点指标",
      detailTitle: "课堂集中讲评建议",
      summary: "当前问题适合做短讲评，不建议展开成长课。目标是让学生带着模板回到自己的 BP 和 PPT 里修改。",
      items: [
        "前 5 分钟：用一张表讲清付费方、采购理由、交付包、验收指标。",
        "中间 5 分钟：展示一个优秀组如何把商业模式写成试点包、课程包、学院续费。",
        "后 3 分钟：要求每组补一条可验证证据，绑定到 PPT 页码或访谈材料。",
        "最后 2 分钟：明确下一轮提交标准和老师审核重点。",
      ],
      action: "建议课堂结束前让每组提交一版“商业模式修订说明”，教师端可直接按 BP 类型筛选审核。",
    },
  ];
  const selectedIssueMetric = selectedIssueMetricLabel
    ? issueOverviewCards.find((card) => card.label === selectedIssueMetricLabel) || null
    : null;
  const reviewDetailSubmission = reviewDetailId ? props.allSubmissions.find((item) => item.id === reviewDetailId) || null : null;
  const canUseReview = props.permissionAccess.can("提交审核中心");
  const reviewFilteredSubmissions = props.allSubmissions.filter(
    (submission) => submission.status !== "withdrawn" && matchesTeacherReviewSearch(submission, reviewSearch),
  );
  const knowledgeFilteredUploads = props.knowledgeUploads.filter((asset) => matchesKnowledgeUploadSearch(asset, knowledgeSearch));
  const knowledgeDirectoryRows = activeKnowledgeCatalog.filter((base) => {
    const keyword = knowledgeDirectorySearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${base.category} ${base.description} ${base.usedBy}`.toLowerCase().includes(keyword);
  });
  const teacherModuleTabs = [
    { id: "review", label: "审核", icon: ClipboardCheck },
    { id: "knowledge", label: "教学资源库", icon: Upload },
    { id: "prompts", label: "专家提示词管理", icon: Sparkles },
    { id: "issues", label: "课堂问题监测", icon: BarChart3 },
  ] as const;

  function applyReviewSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewSearch(reviewSearchDraft);
    props.onFilterChange(reviewSearchDraft.artifactType);
    props.onStatusFilterChange(reviewSearchDraft.status);
  }

  function resetReviewSearch() {
    setReviewSearchDraft(emptyTeacherReviewSearch);
    setReviewSearch(emptyTeacherReviewSearch);
    props.onFilterChange("ALL");
    props.onStatusFilterChange("ALL");
  }

  function applyKnowledgeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKnowledgeSearch(knowledgeSearchDraft);
  }

  function resetKnowledgeSearch() {
    setKnowledgeSearchDraft(emptyKnowledgeUploadSearch);
    setKnowledgeSearch(emptyKnowledgeUploadSearch);
  }

  function applyKnowledgeDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKnowledgeDirectorySearch(knowledgeDirectorySearchDraft);
  }

  function handleToggleKnowledgeBaseState(category: KnowledgeCategory) {
    const nextEnabled = !props.knowledgeBaseStates[category];
    props.onKnowledgeBaseStatesChange({ ...props.knowledgeBaseStates, [category]: nextEnabled });
    setKnowledgeSaveMessage(`已${nextEnabled ? "启用" : "停用"}「${category}知识库」，学生端和专家提示词会同步更新。`);
  }

  function confirmTeacherDeleteExpert() {
    if (!pendingDeleteExpert) return;
    const expertId = pendingDeleteExpert.id;
    if (props.onDeleteExpert(expertId)) {
      const nextExpert = experts.find((expert) => expert.id !== expertId) || experts[0];
      const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
      const nextParts = buildPromptTemplateParts(nextExpert, teacherPromptMode, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
      setTeacherPromptExpertId(nextExpert.id);
      setTeacherSystemPromptDraft(nextParts.system);
      setTeacherUserPromptDraft(nextParts.user);
      setKnowledgeSaveMessage("专家已删除，并同步到学生端专家列表。");
    }
    setPendingDeleteExpertId(null);
  }

  function getPptAsset(submission: Submission) {
    return (
      props.generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === submission.sourceMessageId) ||
      props.generatedAssets.find((asset) => asset.type === "PPT" && asset.ideaId === submission.ideaId) || {
        id: `PPT-${submission.id}`,
        ideaId: submission.ideaId,
        type: "PPT" as const,
        title: `${submission.artifactTitle} - PPT 文件`,
        sourceMessageId: submission.sourceMessageId,
        createdAt: submission.submittedAt,
      }
    );
  }

  function getVideoAsset(submission: Submission) {
    return (
      props.generatedAssets.find((asset) => asset.type === "VIDEO" && asset.sourceMessageId === submission.sourceMessageId) ||
      props.generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === submission.ideaId) ||
      buildMediaAsset(
        {
          id: submission.ideaId,
          title: submission.artifactTitle.replace(/\s*-\s*多媒体物料$/, ""),
          description: submission.artifactSummary,
          stage: artifactLabels[submission.artifactType],
          updatedAt: submission.submittedAt,
        },
        undefined,
      )
    );
  }

  function downloadSubmission(submission: Submission) {
    downloadSubmissionArtifact(submission, props.generatedAssets);
  }

  function previewSubmission(submission: Submission) {
    if (submission.artifactType === "PPT") {
      props.onPreviewPpt(getPptAsset(submission));
      return;
    }
    if (submission.artifactType === "MEDIA") {
      props.onPreviewVideo(getVideoAsset(submission));
      return;
    }
    props.onPreviewWord({
      title: getDownloadTitle(submission, submission.artifactTitle),
      blocks: submission.artifactType === "BRAINSTORM" ? getBrainstormTaskBlocks(submission.blocks) : submission.blocks,
    });
  }

  function openReviewDetail(submission: Submission, tab: TeacherReviewTab = "files") {
    props.onSelectSubmission(submission);
    setReviewDetailId(submission.id);
    setReviewDetailTab(tab);
    setRubricDrafts((current) => (current[submission.id] ? current : { ...current, [submission.id]: buildRubricScores(submission) }));
  }

  function openReviewTab(submission: Submission, tab: TeacherReviewTab) {
    if (tab === "rubric" && !diagnosedSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先完成 AI 诊断，再进行评分。");
      setReviewDetailTab("diagnosis");
      return;
    }
    if (tab === "feedback" && !confirmedRubricSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先确认评分，再查看教师反馈。");
      setReviewDetailTab("rubric");
      return;
    }
    setReviewDetailTab(tab);
  }

  function startDiagnosis(submission: Submission) {
    setReviewDetailTab("diagnosis");
    setDiagnosingSubmissionId(submission.id);
    window.setTimeout(() => {
      setDiagnosingSubmissionId((current) => (current === submission.id ? null : current));
      setDiagnosedSubmissionIds((current) => (current.includes(submission.id) ? current : [...current, submission.id]));
    }, 2800);
  }

  function updateRubricScore(submission: Submission, index: number, value: string) {
    const numeric = Math.max(0, Number.parseFloat(value) || 0);
    setRubricDrafts((current) => {
      const rows = current[submission.id] || buildRubricScores(submission);
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, teacherScore: Math.min(row.weight, Math.round(numeric * 10) / 10) } : row,
      );
      return { ...current, [submission.id]: nextRows };
    });
  }

  function confirmRubric(submission: Submission) {
    const rows = rubricDrafts[submission.id] || buildRubricScores(submission);
    const total = rows.reduce((sum, row) => sum + row.teacherScore, 0).toFixed(1);
    const weakRows = [...rows].sort((a, b) => a.teacherScore / a.weight - b.teacherScore / b.weight).slice(0, 2);
    const advantageRows = rows.filter((row) => row.teacherScore / row.weight >= 0.8).slice(0, 2);
    props.onTeacherCommentChange(
      `【Rubric 综合评分已确认】综合得分 ${total}/100。优势维度：${advantageRows.map((row) => row.name).join("、") || "结构完整度"}。建议重点修改：${weakRows.map((row) => row.name).join("、")}。请补充对应证据后再提交终稿。`,
    );
    setConfirmedRubricSubmissionIds((current) => (current.includes(submission.id) ? current : [...current, submission.id]));
    setReviewActionMessage(`已确认评分，系统已生成修改建议。`);
    setReviewDetailTab("feedback");
  }

  function handleSubmitRubric(submission: Submission) {
    if (!diagnosedSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先完成 AI 诊断，再提交评分。");
      setReviewDetailTab("diagnosis");
      return;
    }
    if (!confirmedRubricSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先确认评分，再提交。");
      setReviewDetailTab("rubric");
      return;
    }
    props.onSaveTeacherComment(submission.id, props.teacherComment);
    setReviewActionMessage("已提交评分。");
  }

  function handleReviewApproved(submission: Submission) {
    props.onReview("approved");
    setReviewActionMessage(`《${submission.artifactTitle}》已通过审核。`);
  }

  function handleReviewRevision(submission: Submission) {
    props.onReview("revision");
    setReviewActionMessage(`《${submission.artifactTitle}》已退回修改。`);
  }

  function renderSubmissionAssetActions(submission: Submission) {
    return (
      <div className="teacher-file-actions">
        <button type="button" onClick={() => previewSubmission(submission)}>
          <MonitorPlay size={15} />
          {submission.artifactType === "PPT" ? "预览 PPT" : submission.artifactType === "MEDIA" ? "预览视频" : "预览 Word"}
        </button>
        <button type="button" onClick={() => downloadSubmission(submission)}>
          <Download size={15} />
          {getSubmissionDownloadLabel(submission)}
        </button>
      </div>
    );
  }

  function renderIssueRelated(issue: NonNullable<typeof activeIssue>, closeModal = false) {
    const relatedSubmissions = props.allSubmissions
      .filter((item) => issue.relatedTypes.includes(item.artifactType))
      .slice(0, 5);

    if (relatedSubmissions.length > 0) {
      return relatedSubmissions.map((item) => (
        <button
          className="issue-related-real"
          key={item.id}
          type="button"
          onClick={() => {
            props.onSelectSubmission(item);
            if (closeModal) {
              setSelectedIssue(null);
            } else {
              setTeacherModule("review");
            }
          }}
        >
          <FileText size={14} />
          <strong>{item.artifactTitle}</strong>
          <span>{artifactLabels[item.artifactType]} · {item.student}</span>
        </button>
      ));
    }

    return issue.relatedSamples.map((item) => (
      <article className="issue-related-sample" key={item.title}>
        <strong>{item.title}</strong>
        <span>{item.meta}</span>
        <p>{item.summary}</p>
      </article>
    ));
  }

  function handleTeacherPromptKnowledgeToggle(category: KnowledgeCategory) {
    const nextCategories = toggleKnowledgeRouteCategory(teacherPromptKnowledgeCategories, category);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [teacherPromptExpert.id]: nextCategories });
    const nextParts = buildPromptTemplateParts(
      teacherPromptExpert,
      teacherPromptMode,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
  }

  function handleTeacherCreateCustomExpert() {
    const name = newExpertName.trim();
    if (!name) {
      setKnowledgeSaveMessage("请先填写专家名称。");
      return;
    }
    if (experts.some((expert) => expert.name === name)) {
      setKnowledgeSaveMessage("这个专家名称已经存在。");
      return;
    }
    const skillName = "阶段成果生成";
    const nextExpert: CustomExpertRecord = {
      id: `custom-${Date.now()}`,
      name,
      role: newExpertRole.trim() || "根据教师配置的提示词，围绕课程节点生成可提交的阶段成果。",
      scenario: newExpertScenario.trim() || "自定义课程场景、专题指导、阶段成果生成",
      accent: "#0f7b73",
      skills: [
        {
          id: `custom-skill-${Date.now()}`,
          name: skillName,
          stage: "自定义专家",
          description: "根据教师配置的提示词和知识库生成阶段成果。",
        },
      ],
    };
    const defaultCategories = ["教学大纲", "创业案例"] as KnowledgeCategory[];
    props.onCustomExpertsChange([...props.customExperts, nextExpert]);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [nextExpert.id]: defaultCategories });
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(nextExpert),
      "Auto",
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      defaultCategories,
    );
    setTeacherPromptExpertId(nextExpert.id);
    setTeacherPromptMode("Auto");
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
    setNewExpertName("");
    setNewExpertRole("");
    setNewExpertScenario("");
    setKnowledgeSaveMessage("新增专家已同步到学生端专家列表。");
  }

  async function handleTeacherUploadExpertSkillFolder(files: FileList | null) {
    if (!files?.length) return;
    const nextExpert = await buildCustomExpertFromSkillFiles(files, `教师端 · ${props.teacherName || "周老师"}`);
    if (!nextExpert) {
      setKnowledgeSaveMessage("这个文件夹里没有可读取的 .md / .txt / .json 专家 Skill 文件。");
      return;
    }
    nextExpert.name = getUniqueExpertName(nextExpert.name, experts);
    const defaultCategories = ["教学大纲", "创业案例"] as KnowledgeCategory[];
    props.onCustomExpertsChange([...props.customExperts, nextExpert]);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [nextExpert.id]: defaultCategories });
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(nextExpert),
      "Auto",
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      defaultCategories,
    );
    setTeacherPromptExpertId(nextExpert.id);
    setTeacherPromptMode("Auto");
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
    setNewExpertName("");
    setNewExpertRole("");
    setNewExpertScenario("");
    setKnowledgeSaveMessage(`已上传 Skill 文件夹「${nextExpert.sourceSkillName || nextExpert.name}」，并生成专家「${nextExpert.name}」。`);
  }

  function handleCreateKnowledgeBase() {
    const category = newKnowledgeName.trim();
    const usedBy = "学生端专家、教师审核、管理端提示词";
    if (!category) {
      setKnowledgeSaveMessage("请先填写知识库名称。");
      return;
    }
    if (props.knowledgeCatalog.some((item) => item.category === category)) {
      setKnowledgeSaveMessage("这个知识库目录已经存在。");
      return;
    }
    const nextItem: KnowledgeBaseCatalogItem = {
      category,
      description: `${category}：由教师端新增，可用于 ${usedBy}。`,
      usedBy,
    };
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogAddition(
      props.knowledgeCatalog,
      props.knowledgeBaseStates,
      props.promptKnowledgeRoutes,
      nextItem,
    );
    props.onKnowledgeCatalogChange(nextCatalog);
    props.onKnowledgeBaseStatesChange(nextStates);
    props.onPromptKnowledgeRoutesChange(nextRoutes);
    setUploadCategory(category);
    setKnowledgeSearchDraft((current) => ({ ...current, category }));
    setNewKnowledgeName("");
    setKnowledgeSaveMessage(`已新增知识库「${category}」，并同步到学生端和提示词目录。`);
  }

  async function handleLocalUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!props.permissionAccess.can("上传教学资料")) {
      props.permissionAccess.block("上传教学资料");
      return;
    }
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => {
        const canReadText =
          file.size < 250_000 &&
          (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md"));
        let text = "";
        if (canReadText) {
          try {
            text = await file.text();
          } catch {
            text = "";
          }
        }
        const fileDataUrl = await readFileAsDataUrl(file);
        return {
          id: makeId("K"),
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "本地文件",
          fileDataUrl,
          uploadedAt: nowDateTime(),
          uploadedBy: props.teacherName || "周老师",
          preview: buildUploadPreview(file, text, uploadCategory),
          category: uploadCategory,
          enabled: true,
        };
      }),
    );
    props.onUploadKnowledge(uploaded);
    setSelectedUploadId(uploaded[0]?.id || "");
  }

  return (
    <>
    {(props.permissionAccess.accountDisabled || props.permissionAccess.disabledPermissions.length > 0) && (
      <PermissionBanner
        accountDisabled={props.permissionAccess.accountDisabled}
        disabledPermissions={props.permissionAccess.disabledPermissions}
      />
    )}
    <nav className="teacher-module-tabs" aria-label="教师端模块切换">
      {teacherModuleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            className={teacherModule === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setTeacherModule(tab.id)}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </nav>
    <div className="backend-layout teacher-single-layout role-view-shell">
      <section className="backend-main">
        {teacherModule === "review" && (
          <div className="teacher-module-panel teacher-review-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">教师后台</span>
            <h3>提交审核中心</h3>
          </div>
          <button
            className="status-pill pending-jump"
            type="button"
            onClick={() => {
              const nextSearch: TeacherReviewSearch = { ...emptyTeacherReviewSearch, status: "pending" };
              setReviewSearchDraft(nextSearch);
              setReviewSearch(nextSearch);
              props.onJumpPending();
            }}
            disabled={!props.permissionAccess.can("提交审核中心")}
          >
            <Users size={15} />
            待审核 {pendingCount} 项
          </button>
        </div>

        <form className="teacher-review-search" onSubmit={applyReviewSearch}>
          <label className="teacher-review-keyword">
            <span>学生名称 / 小组 / 成果标题</span>
            <input
              type="search"
              placeholder="输入学生名称、小组或成果标题"
              value={reviewSearchDraft.keyword}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
            />
          </label>
          <label>
            <span>成果类型</span>
            <PrettySelect
              value={reviewSearchDraft.artifactType}
              ariaLabel="筛选成果类型"
              options={(["ALL", "BRAINSTORM", "POSITIONING", "MARKET", "BP", "PPT", "SCRIPT", "DEFENSE", "MEDIA"] as const).map((type) => ({
                value: type,
                label: type === "ALL" ? "全部成果类型" : artifactLabels[type],
              }))}
              onChange={(value) => setReviewSearchDraft((current) => ({ ...current, artifactType: value }))}
            />
          </label>
          <label>
            <span>提交状态</span>
            <PrettySelect
              value={reviewSearchDraft.status}
              ariaLabel="筛选提交状态"
              options={(["ALL", "pending", "approved", "revision"] as const).map((status) => ({
                value: status,
                label: status === "ALL" ? "全部状态" : statusLabels[status],
              }))}
              onChange={(value) => setReviewSearchDraft((current) => ({ ...current, status: value }))}
            />
          </label>
          <label>
            <span>开始日期</span>
            <input
              type="date"
              value={reviewSearchDraft.startDate}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, startDate: event.target.value }))}
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              type="date"
              min={reviewSearchDraft.startDate || undefined}
              value={reviewSearchDraft.endDate}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, endDate: event.target.value }))}
            />
          </label>
          <div className="teacher-review-search-actions">
            <button className="primary-button" type="submit">
              <Filter size={15} />
              查询
            </button>
            <button className="ghost-button" type="button" onClick={resetReviewSearch}>
              重置
            </button>
          </div>
        </form>

        <div className="record-table submission-table">
          <div className="table-row table-head">
            <span>学生/小组</span>
            <span>成果类型</span>
            <span>成果标题</span>
            <span>状态</span>
            <span>提交时间</span>
            <span>操作</span>
          </div>
          {reviewFilteredSubmissions.length === 0 && (
            <div className="submission-empty-row">没有匹配的提交，可以调整学生名称、成果类型或日期范围后再查。</div>
          )}
          {reviewFilteredSubmissions.map((submission) => (
            <div
              aria-disabled={!canUseReview}
              className={`table-row ${props.activeSubmission?.id === submission.id ? "selected" : ""} ${canUseReview ? "" : "disabled"}`}
              key={submission.id}
              role="button"
              tabIndex={canUseReview ? 0 : -1}
              onClick={() => {
                if (canUseReview) props.onSelectSubmission(submission);
              }}
              onKeyDown={(event) => {
                if (!canUseReview || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                props.onSelectSubmission(submission);
              }}
            >
              <span title={`${submission.student} / ${getStudentGroupDisplay(submission.group, submission.groupName)}`}>
                <strong>{submission.student}</strong>
                <small>{getStudentGroupDisplay(submission.group, submission.groupName)}</small>
              </span>
              <span>{artifactLabels[submission.artifactType]}</span>
              <span title={submission.artifactTitle}>
                {submission.artifactTitle}
                {submission.isExcellent && <em className="inline-excellent">优秀</em>}
              </span>
              <span className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</span>
              <span>{formatSubmittedAt(submission.submittedAt)}</span>
              <span className="submission-actions">
                <button
                  type="button"
                  disabled={!canUseReview}
                  onClick={(event) => {
                    event.stopPropagation();
                    openReviewDetail(submission);
                  }}
                >
                  <FileText size={14} />
                  查看详情
                </button>
              </span>
            </div>
          ))}
        </div>

          </div>
        )}

        {teacherModule === "knowledge" && (
          <div className="teacher-module-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">资料管理</span>
                <h3>教学资源库</h3>
              </div>
            </div>
            <div className="knowledge-module-layout">
              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">目录管理</span>
                    <h4>知识库目录</h4>
                  </div>
                </div>
                <div className="knowledge-create-panel knowledge-directory-panel">
                  <div className="knowledge-create-form knowledge-create-form--directory">
                    <label>
                      <span>目录名称</span>
                      <input value={newKnowledgeName} onChange={(event) => setNewKnowledgeName(event.target.value)} placeholder="如：就业访谈知识库" />
                    </label>
                    <button className="knowledge-inline-action" type="button" onClick={handleCreateKnowledgeBase}>
                      <Save size={15} />
                      新建目录
                    </button>
                  </div>
                  <form className="knowledge-directory-search-form" onSubmit={applyKnowledgeDirectorySearch}>
                    <label className="knowledge-directory-search">
                      <span>目录查询</span>
                      <input
                        value={knowledgeDirectorySearchDraft}
                        onChange={(event) => setKnowledgeDirectorySearchDraft(event.target.value)}
                        placeholder="输入目录名称或适用模块"
                      />
                    </label>
                    <button className="knowledge-inline-action" type="submit">
                      查询
                    </button>
                  </form>
                </div>
                <div className="knowledge-base-directory-list">
                  {knowledgeDirectoryRows.map((base) => {
                    const fileCount = props.knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === base.category).length;
                    const enabled = props.knowledgeBaseStates[base.category] !== false;
                    return (
                      <article key={base.category}>
                        <div>
                          <strong>{base.category}知识库</strong>
                          <span>{fileCount} 份资料 · {enabled ? "已开放" : "已停用"}</span>
                        </div>
                        <div className="knowledge-directory-actions">
                          <button type="button" onClick={() => setKnowledgeBasePreviewCategory(base.category)}>
                            查看详情
                          </button>
                          <button type="button" onClick={() => handleToggleKnowledgeBaseState(base.category)}>
                            {enabled ? "停用" : "启用"}
                          </button>
                          <button
                            className="danger-text-button"
                            type="button"
                            onClick={() => props.onDeleteKnowledgeBase(base.category)}
                          >
                            删除
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">资料管理</span>
                    <h4>教学资料</h4>
                  </div>
                </div>
                <div className="teacher-upload-toolbar">
                  <label className="knowledge-upload-target" htmlFor="teacher-upload-category">
                    <span>上传到知识库</span>
                    <strong>选择资料归属目录</strong>
                    <PrettySelect
                      value={uploadCategory}
                      ariaLabel="选择上传知识库"
                      options={activeKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` }))}
                      onChange={(value) => setUploadCategory(value)}
                    />
                  </label>
                  <p className="knowledge-base-hint">
                    {selectedUploadKnowledgeBase.description} 适用模块：{selectedUploadKnowledgeBase.usedBy}
                    {props.knowledgeBaseStates[uploadCategory] ? " 当前目录已开放给学生端调用。" : " 当前目录已被管理端停用，学生端暂不可调用。"}
                  </p>
                  <button
                    className="status-pill pending-jump upload-inline-button"
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={!props.permissionAccess.can("上传教学资料")}
                  >
                    <Upload size={15} />
                    {props.permissionAccess.can("上传教学资料") ? "上传资料" : "上传权限已停用"}
                  </button>
                </div>
                <input
                  ref={uploadInputRef}
                  className="visually-hidden-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                  onChange={(event) => {
                    void handleLocalUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <form className="knowledge-search" onSubmit={applyKnowledgeSearch}>
                  <label className="knowledge-search-keyword">
                    <span>资料名称 / 文件类型 / 内容关键词</span>
                    <input
                      type="search"
                      placeholder="输入资料名称、文件类型或关键词"
                      value={knowledgeSearchDraft.keyword}
                      onChange={(event) => setKnowledgeSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>知识库</span>
                    <PrettySelect
                      value={knowledgeSearchDraft.category}
                      ariaLabel="筛选知识库"
                      options={[
                        { value: "ALL" as KnowledgeCategory | "ALL", label: "全部知识库" },
                        ...activeKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` })),
                      ]}
                      onChange={(value) => setKnowledgeSearchDraft((current) => ({ ...current, category: value }))}
                    />
                  </label>
                  <label>
                    <span>是否启用</span>
                    <PrettySelect
                      value={knowledgeSearchDraft.status}
                      ariaLabel="筛选启用状态"
                      options={[
                        { value: "ALL", label: "全部状态" },
                        { value: "enabled", label: "已启用" },
                        { value: "disabled", label: "未启用" },
                      ]}
                      onChange={(value) => setKnowledgeSearchDraft((current) => ({ ...current, status: value }))}
                    />
                  </label>
                  <div className="knowledge-search-actions">
                    <button className="primary-button" type="submit">
                      <Filter size={15} />
                      查询
                    </button>
                    <button className="ghost-button" type="button" onClick={resetKnowledgeSearch}>
                      重置
                    </button>
                  </div>
                </form>
                <div className="record-table knowledge-table">
                  <div className="table-row table-head">
                    <span>资料名称</span>
                    <span>知识库</span>
                    <span>文件信息</span>
                    <span>上传教师</span>
                    <span>上传时间</span>
                    <span>是否启用</span>
                    <span>操作</span>
                  </div>
                  {knowledgeFilteredUploads.length === 0 && (
                    <div className="submission-empty-row">暂无匹配资料，可以调整查询条件或先上传资料。</div>
                  )}
                  {knowledgeFilteredUploads.map((asset) => {
                    const category = asset.category || inferKnowledgeCategory(asset.name);
                    const enabled = asset.enabled !== false;
                    return (
                      <div className={`table-row ${selectedUpload?.id === asset.id ? "selected" : ""}`} key={asset.id}>
                        <span title={`${asset.name}\n${asset.preview}`}>
                          <strong>{asset.name}</strong>
                          <small>{asset.preview}</small>
                        </span>
                        <span title={`${category}知识库`}>{category}</span>
                        <span className="knowledge-file-meta" title={getKnowledgeFileTypeLabel(asset)}>
                          <em>{getKnowledgeFileTypeLabel(asset)}</em>
                          <small>{asset.sizeLabel}</small>
                        </span>
                        <span>{asset.uploadedBy || props.teacherName || "周老师"}</span>
                        <span>{formatSubmittedAt(asset.uploadedAt)}</span>
                        <span>
                          <em className={`knowledge-status ${enabled ? "enabled" : "disabled"}`}>{enabled ? "已启用" : "未启用"}</em>
                        </span>
                        <span className="knowledge-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUploadId(asset.id);
                              setKnowledgePreviewId(asset.id);
                            }}
                          >
                            <FileText size={14} />
                            查看
                          </button>
                          <button type="button" onClick={() => props.onToggleKnowledge(asset.id)}>
                            {enabled ? "停用" : "启用"}
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => {
                              if (knowledgePreviewId === asset.id) setKnowledgePreviewId(null);
                              props.onDeleteKnowledge(asset.id);
                            }}
                          >
                            删除
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {teacherModule === "prompts" && (
          <div className="teacher-module-panel teacher-prompt-manager">
            <div className="panel-title">
              <div>
                <span className="eyebrow">专家配置</span>
                <h3>专家提示词管理</h3>
              </div>
            </div>
            <section className="custom-expert-create-panel">
              <div className="custom-expert-create-copy">
                <span className="eyebrow">新增专家</span>
                <h4>自定义课堂专家</h4>
                <p>新增后会进入学生端专家选择，同时可继续配置知识库目录、系统提示词和用户输入组装规则。</p>
              </div>
              <label>
                <span>专家名称</span>
                <input value={newExpertName} onChange={(event) => setNewExpertName(event.target.value)} placeholder="如：财务测算专家" />
              </label>
              <label>
                <span>专家定位</span>
                <input value={newExpertRole} onChange={(event) => setNewExpertRole(event.target.value)} placeholder="说明这个专家主要解决什么问题" />
              </label>
              <label>
                <span>适用场景</span>
                <input value={newExpertScenario} onChange={(event) => setNewExpertScenario(event.target.value)} placeholder="如：成本测算、收入模型、单元经济性" />
              </label>
              <div className="custom-expert-create-actions">
                <button className="primary-button" type="button" onClick={handleTeacherCreateCustomExpert}>
                  <Sparkles size={16} />
                  新增专家
                </button>
                <button className="ghost-button expert-skill-upload-button" type="button" onClick={() => setIsSkillFolderGuideOpen(true)}>
                  <Upload size={16} />
                  上传 Skill 文件夹
                </button>
              </div>
              <input
                ref={(node) => {
                  expertSkillFolderUploadInputRef.current = node;
                  configureFolderUploadInput(node);
                }}
                className="visually-hidden-input"
                type="file"
                multiple
                onChange={(event) => {
                  void handleTeacherUploadExpertSkillFolder(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </section>
            <div className="prompt-control-panel teacher-prompt-controls">
              <label>
                <span>专家</span>
                <PrettySelect
                  value={teacherPromptExpert.id}
                  ariaLabel="选择提示词专家"
                  options={experts.map((expert) => ({ value: expert.id, label: expert.name }))}
                  onChange={(value) => {
                    const nextExpert = experts.find((expert) => expert.id === value) || experts[0];
                          const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
                    const nextParts = buildPromptTemplateParts(nextExpert, teacherPromptMode, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
                    setTeacherPromptExpertId(nextExpert.id);
                    setTeacherSystemPromptDraft(nextParts.system);
                    setTeacherUserPromptDraft(nextParts.user);
                  }}
                />
              </label>
              <label>
                <span>模式</span>
                <PrettySelect
                  value={teacherPromptMode}
                  ariaLabel="选择提示词模式"
                  options={modelModes.map((mode) => ({ value: mode, label: mode }))}
                  onChange={(nextMode) => {
                    const nextParts = buildPromptTemplateParts(
                      teacherPromptExpert,
                      nextMode,
                      props.knowledgeUploads,
                      props.knowledgeBaseStates,
                      teacherPromptKnowledgeCategories,
                    );
                    setTeacherPromptMode(nextMode);
                    setTeacherSystemPromptDraft(nextParts.system);
                    setTeacherUserPromptDraft(nextParts.user);
                  }}
                />
              </label>
              <div className="prompt-action-group">
                <button className="primary-button prompt-save-button" type="button" onClick={() => setIsPromptSaveOpen(true)}>
                  <Save size={15} />
                  保存提示词
                </button>
                {experts.length > 1 && (
                  <button
                    className="ghost-button danger prompt-delete-expert-button"
                    type="button"
                    onClick={() => setPendingDeleteExpertId(teacherPromptExpert.id)}
                  >
                    <Trash2 size={15} />
                    删除当前专家
                  </button>
                )}
              </div>
            </div>
            <div className="prompt-quick-stats">
              <article>
                <span>当前专家</span>
                <strong>{teacherPromptExpert.name}</strong>
              </article>
              <article>
                <span>生成模式</span>
                <strong>{teacherPromptMode}</strong>
              </article>
              <article>
                <span>知识库目录</span>
                <strong>{teacherPromptKnowledgeCategories.length} 个</strong>
              </article>
              <article>
                <span>启用资料</span>
                <strong>{teacherPromptMeta.enabledKnowledgeCount} 个</strong>
              </article>
            </div>
            <section className="prompt-knowledge-route teacher-prompt-route">
              <div>
                <strong>当前专家调用知识库目录</strong>
                <span>已选择 {teacherPromptKnowledgeCategories.length} 个目录 · 已启用资料 {teacherPromptMeta.enabledKnowledgeCount} 个</span>
              </div>
              <div className="prompt-knowledge-options">
                {activeKnowledgeCatalog.map((base) => {
                  const selected = teacherPromptKnowledgeCategories.includes(base.category);
                  const enabled = props.knowledgeBaseStates[base.category];
                  return (
                    <label className={`${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`} key={base.category}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleTeacherPromptKnowledgeToggle(base.category)}
                      />
                      <span>{base.category}知识库</span>
                      <em>{enabled ? "目录开放" : "目录停用"}</em>
                      <small>{base.usedBy}</small>
                    </label>
                  );
                })}
              </div>
              <p>教师端和管理端共用同一套专家知识库目录配置；至少保留 1 个目录，修改后会同步重算系统提示词和用户输入组装规则。</p>
            </section>
            <section className="prompt-content-grid teacher-prompt-grid">
              <article>
                <span className="eyebrow">System</span>
                <h3>系统提示词</h3>
                <p>定义专家角色、知识库引用规则、模式策略和输出边界。</p>
                <textarea
                  className="teacher-prompt-textarea"
                  value={teacherSystemPromptDraft}
                  onChange={(event) => setTeacherSystemPromptDraft(event.target.value)}
                />
              </article>
              <article>
                <span className="eyebrow">User</span>
                <h3>用户输入组装规则</h3>
                <p>定义学生输入、历史上下文、上传资料和本轮任务如何组装。</p>
                <textarea
                  className="teacher-prompt-textarea"
                  value={teacherUserPromptDraft}
                  onChange={(event) => setTeacherUserPromptDraft(event.target.value)}
                />
              </article>
            </section>
          </div>
        )}

        {teacherModule === "issues" && (
          <div className="teacher-module-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">课堂监控</span>
                <h3>监控学生讨论中的常见问题</h3>
              </div>
            </div>
            <p className="teacher-module-copy">聚合不同小组在定位、商业模式、竞品、答辩中的高频卡点，帮助教师判断课堂共性问题。</p>
            <div className="issue-overview-grid">
              {issueOverviewCards.map((card) => (
                <button
                  className="issue-overview-card"
                  key={card.label}
                  type="button"
                  onClick={() => setSelectedIssueMetricLabel(card.label)}
                >
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                  <p>{card.note}</p>
                  <small>查看详情</small>
                </button>
              ))}
            </div>
            <div className="issue-monitor-layout">
              <section className="issue-panel">
                <div className="issue-section-title">
                  <strong>问题热度排行</strong>
                  <span>点击查看证据和处理建议</span>
                </div>
                <div className="issue-bars teacher-issue-bars">
                  {issueEntries.map(([label, detail]) => (
                    <button
                      className={focusedIssueLabel === label ? "active" : ""}
                      key={label}
                      type="button"
                      onClick={() => setSelectedIssue(label)}
                    >
                      <span>
                        <b>{label}</b>
                        <em>{detail.affectedGroups} · 风险{detail.level}</em>
                      </span>
                      <strong style={{ width: detail.value }}>{detail.value}</strong>
                      <small>{detail.trend}</small>
                    </button>
                  ))}
                </div>
              </section>
              {activeIssue && (
                <section className="issue-panel issue-detail-panel">
                  <div className="issue-detail-heading">
                    <div>
                      <span className="eyebrow">当前关注</span>
                      <h3>{focusedIssueLabel}</h3>
                      <p>{activeIssue.affectedGroups}受影响，{activeIssue.trend}</p>
                    </div>
                    <strong>{activeIssue.value}</strong>
                  </div>
                  <div className="issue-insight-strip">
                    <article>
                      <span>建议优先级</span>
                      <strong>{activeIssuePlaybook.priority}</strong>
                    </article>
                    <article>
                      <span>证据缺口</span>
                      <strong>{activeIssuePlaybook.evidenceGap}</strong>
                    </article>
                    <article>
                      <span>教师介入点</span>
                      <strong>{activeIssuePlaybook.teacherMove}</strong>
                    </article>
                  </div>
                  <div className="issue-detail-grid issue-detail-grid-expanded">
                    <article>
                      <h5>典型表现</h5>
                      <ul>
                        {activeIssue.evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>节点指导建议</h5>
                      <ul>
                        {activeIssue.guidance.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>课堂追问清单</h5>
                      <ul>
                        {activeIssuePlaybook.questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>下一轮审核口径</h5>
                      <ul>
                        {activeIssuePlaybook.reviewFocus.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                  <div className="issue-related-block">
                    <h5>相关成果</h5>
                    <div className="issue-related">
                      {renderIssueRelated(activeIssue)}
                    </div>
                  </div>
                </section>
              )}
            </div>
            {selectedIssueMetric && (
              <IssueMetricDetailModal metric={selectedIssueMetric} onClose={() => setSelectedIssueMetricLabel(null)} />
            )}
          </div>
        )}
      </section>

      {reviewActionMessage && <PromptSaveSuccessModal message={reviewActionMessage} onClose={() => setReviewActionMessage(null)} />}

    </div>
    {reviewDetailSubmission && (
      <div className="modal-backdrop teacher-review-detail-backdrop" role="presentation">
        <section className="media-modal review-detail-modal teacher-review-detail-modal" role="dialog" aria-modal="true" aria-label="成果详情">
          <header>
            <div>
              <span className="eyebrow">当前成果详情</span>
              <h3>{reviewDetailSubmission.artifactTitle}</h3>
              <p>{reviewDetailSubmission.artifactSummary}</p>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setReviewDetailId(null)} aria-label="关闭">
              <X size={18} />
            </button>
          </header>
          <div className="review-detail-body">
            <section className="detail-card review-summary-card">
              <dl>
                <div>
                  <dt>成果类型</dt>
                  <dd>{artifactLabels[reviewDetailSubmission.artifactType]}</dd>
                </div>
                <div>
                  <dt>学生/小组</dt>
                  <dd>{reviewDetailSubmission.student} / {getStudentGroupDisplay(reviewDetailSubmission.group, reviewDetailSubmission.groupName)}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{statusLabels[reviewDetailSubmission.status]}</dd>
                </div>
                <div>
                  <dt>提交时间</dt>
                  <dd>{formatSubmittedAt(reviewDetailSubmission.submittedAt)}</dd>
                </div>
              </dl>
            </section>
            <div className="review-ai-tabs" role="tablist" aria-label="教师审核详情">
              {[
                ["files", "提交材料"],
                ["diagnosis", "AI 项目诊断"],
                ["rubric", "Rubric 综合评分"],
                ["feedback", "教师反馈"],
              ].map(([tab, label]) => (
                  <button
                    className={reviewDetailTab === tab ? "active" : ""}
                    key={tab}
                    type="button"
                    onClick={() => openReviewTab(reviewDetailSubmission, tab as TeacherReviewTab)}
                  >
                    {label}
                  </button>
              ))}
            </div>
            {reviewDetailTab === "files" && (
              <section className="detail-card review-ai-panel">
                <span className="eyebrow">提交材料</span>
                {renderSubmissionAssetActions(reviewDetailSubmission)}
                <div className="review-blocks">
                  {reviewDetailSubmission.blocks.map((block) => (
                    <article key={block.title}>
                      <strong>{block.title}</strong>
                      <ul>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {reviewDetailTab === "diagnosis" && (
              <section className="detail-card review-ai-panel">
                <div className="review-ai-heading">
                  <div>
                    <span className="eyebrow">AI 项目诊断</span>
                    <h4>基于提交材料生成诊断、追问和下一轮任务</h4>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={diagnosingSubmissionId === reviewDetailSubmission.id}
                    onClick={() => {
                      if (diagnosedSubmissionIds.includes(reviewDetailSubmission.id)) {
                        openReviewTab(reviewDetailSubmission, "rubric");
                        return;
                      }
                      startDiagnosis(reviewDetailSubmission);
                    }}
                  >
                    {diagnosedSubmissionIds.includes(reviewDetailSubmission.id) && diagnosingSubmissionId !== reviewDetailSubmission.id ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {diagnosingSubmissionId === reviewDetailSubmission.id
                      ? "诊断中"
                      : diagnosedSubmissionIds.includes(reviewDetailSubmission.id)
                        ? "查看综合评分"
                        : "开始 AI 项目诊断"}
                  </button>
                </div>
                {(diagnosingSubmissionId === reviewDetailSubmission.id || !diagnosedSubmissionIds.includes(reviewDetailSubmission.id)) && (
                  <div className="diagnosis-process">
                    {[
                      ["读取项目材料", "BP/PPT/访谈记录/答辩日志"],
                      ["解析商业模式", "价值主张、客群、收入、成本"],
                      ["对照 Rubric", "6 个评分维度加权评估"],
                      ["生成课堂追问", "问题、风险和下一轮任务"],
                    ].map(([title, detail], index) => (
                      <article className={diagnosingSubmissionId === reviewDetailSubmission.id ? "running" : ""} key={title} style={{ "--delay": `${index * 0.18}s` } as CSSProperties}>
                        <span>{diagnosingSubmissionId === reviewDetailSubmission.id ? "" : index + 1}</span>
                        <div>
                          <strong>{title}</strong>
                          <p>{detail}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {diagnosedSubmissionIds.includes(reviewDetailSubmission.id) && diagnosingSubmissionId !== reviewDetailSubmission.id && (
                  <div className="diagnosis-result-grid">
                    {Object.entries(buildDiagnosisResult(reviewDetailSubmission)).map(([key, items]) => (
                      <article key={key}>
                        <strong>
                          {key === "problems" ? "项目问题" : key === "risks" ? "风险提示" : key === "questions" ? "课堂追问建议" : "下一轮任务建议"}
                        </strong>
                        <ul>
                          {items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {reviewDetailTab === "rubric" && (
              <section className="detail-card review-ai-panel">
                <div className="review-ai-heading">
                  <div>
                    <span className="eyebrow">Rubric 综合评分</span>
                    <h4>系统给出参考分，教师可调整终评</h4>
                  </div>
                  <strong className="rubric-total">
                    {((rubricDrafts[reviewDetailSubmission.id] || buildRubricScores(reviewDetailSubmission)).reduce(
                      (sum, row) => sum + row.teacherScore,
                      0,
                    )).toFixed(1)}
                  </strong>
                </div>
                <div className="rubric-table">
                  {(rubricDrafts[reviewDetailSubmission.id] || buildRubricScores(reviewDetailSubmission)).map((row, index) => (
                    <article key={row.name}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.description} · 权重 {row.weight}</span>
                      </div>
                      <em>{row.aiScore}</em>
                      <input
                        type="number"
                        min="0"
                        max={row.weight}
                        step="0.5"
                        value={row.teacherScore}
                        onChange={(event) => updateRubricScore(reviewDetailSubmission, index, event.target.value)}
                      />
                    </article>
                  ))}
                </div>
                <div className="rubric-confirm-bar">
                  <p>{diagnosedSubmissionIds.includes(reviewDetailSubmission.id) ? "系统参考评分只作为教师审核参考，确认后会写入教师反馈草稿。" : "请先完成项目诊断，再确认评分。"}</p>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!diagnosedSubmissionIds.includes(reviewDetailSubmission.id)}
                    onClick={() => confirmRubric(reviewDetailSubmission)}
                  >
                    <CheckCircle2 size={16} />
                    确认评分并生成反馈
                  </button>
                </div>
              </section>
            )}
            {reviewDetailTab === "feedback" && (
              <section className="detail-card review-ai-panel">
                <span className="eyebrow">节点解答与指导</span>
                <h4>{artifactLabels[reviewDetailSubmission.artifactType]} 审核意见</h4>
                <label className="field-label" htmlFor="teacher-comment-modal">
                  点评意见 / 退回修改建议
                </label>
                <textarea
                  id="teacher-comment-modal"
                  value={props.teacherComment}
                  disabled={!props.permissionAccess.can("节点解答与指导")}
                  onChange={(event) => props.onTeacherCommentChange(event.target.value)}
                />
                <div className="review-detail-actions-bar">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => handleSubmitRubric(reviewDetailSubmission)}
                  >
                    <Sparkles size={17} />
                    提交评分
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={reviewDetailSubmission.status === "withdrawn" || !canUseReview}
                    onClick={() => handleReviewApproved(reviewDetailSubmission)}
                  >
                    <CheckCircle2 size={17} />
                    {canUseReview ? "通过审核" : "审核权限已停用"}
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    disabled={reviewDetailSubmission.status === "withdrawn" || !canUseReview}
                    onClick={() => handleReviewRevision(reviewDetailSubmission)}
                  >
                    <PenLine size={17} />
                    {canUseReview ? "退回修改" : "审核权限已停用"}
                  </button>
                  <button
                    className={`ghost-button excellent-button ${reviewDetailSubmission.isExcellent ? "active" : ""}`}
                    type="button"
                    disabled={!props.permissionAccess.can("优秀成果标记")}
                    onClick={() => props.onToggleExcellent(reviewDetailSubmission.id)}
                  >
                    <Star size={16} />
                    {props.permissionAccess.can("优秀成果标记")
                      ? reviewDetailSubmission.isExcellent
                        ? "取消优秀"
                        : "标为优秀"
                      : "权限已停用"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    )}
    {knowledgePreviewAsset && (
      <div className="modal-backdrop" role="presentation">
        <section className="media-modal knowledge-detail-modal" role="dialog" aria-modal="true" aria-label="资料详情">
          <header>
            <div>
              <span className="eyebrow">资料详情</span>
              <h3>{knowledgePreviewAsset.name}</h3>
              <p>{knowledgePreviewAsset.preview}</p>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setKnowledgePreviewId(null)} aria-label="关闭">
              <X size={18} />
            </button>
          </header>
          <div className="review-detail-body">
            <section className="detail-card review-summary-card">
              <dl>
                <div>
                  <dt>所属知识库</dt>
                  <dd>{knowledgePreviewAsset.category || inferKnowledgeCategory(knowledgePreviewAsset.name)}</dd>
                </div>
                <div>
                  <dt>文件类型</dt>
                  <dd>{getKnowledgeFileTypeLabel(knowledgePreviewAsset)}</dd>
                </div>
                <div>
                  <dt>文件大小</dt>
                  <dd>{knowledgePreviewAsset.sizeLabel}</dd>
                </div>
                <div>
                  <dt>上传教师</dt>
                  <dd>{knowledgePreviewAsset.uploadedBy || props.teacherName || "周老师"}</dd>
                </div>
                <div>
                  <dt>是否启用</dt>
                  <dd>{knowledgePreviewAsset.enabled === false ? "未启用" : "已启用"}</dd>
                </div>
                <div>
                  <dt>上传时间</dt>
                  <dd>{formatSubmittedAt(knowledgePreviewAsset.uploadedAt)}</dd>
                </div>
              </dl>
            </section>
              <section className="detail-card">
                <span className="eyebrow">资料预览</span>
                <p>{knowledgePreviewAsset.preview}</p>
                <div className="teacher-file-actions">
                  <button type="button" onClick={() => previewKnowledgeAsset(knowledgePreviewAsset, props.onPreviewWord)}>
                    <MonitorPlay size={15} />
                    预览资料
                  </button>
                  <button type="button" onClick={() => downloadKnowledgeAsset(knowledgePreviewAsset)}>
                    <Download size={15} />
                    {knowledgePreviewAsset.fileDataUrl ? "下载原文件" : "下载资料说明"}
                  </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    )}
      {knowledgeBasePreviewItem && (
        <KnowledgeBaseDetailModal
          item={knowledgeBasePreviewItem}
          uploads={props.knowledgeUploads}
          enabled={props.knowledgeBaseStates[knowledgeBasePreviewItem.category] !== false}
          actorLabel="教师端维护"
          onClose={() => setKnowledgeBasePreviewCategory(null)}
          onToggle={() => handleToggleKnowledgeBaseState(knowledgeBasePreviewItem.category)}
          onDelete={() => {
            setKnowledgeBasePreviewCategory(null);
            props.onDeleteKnowledgeBase(knowledgeBasePreviewItem.category);
          }}
        />
      )}
      {pendingDeleteExpert && (
        <ExpertDeleteConfirmModal
          expert={pendingDeleteExpert}
          onCancel={() => setPendingDeleteExpertId(null)}
          onConfirm={confirmTeacherDeleteExpert}
        />
      )}
      {isPromptSaveOpen && <PromptSaveSuccessModal onClose={() => setIsPromptSaveOpen(false)} />}
      {isSkillFolderGuideOpen && (
        <SkillFolderUploadGuideModal
          actorLabel="教师端"
          onCancel={() => setIsSkillFolderGuideOpen(false)}
          onConfirm={() => {
            setIsSkillFolderGuideOpen(false);
            expertSkillFolderUploadInputRef.current?.click();
          }}
        />
      )}
      {knowledgeSaveMessage && <PromptSaveSuccessModal message={knowledgeSaveMessage} onClose={() => setKnowledgeSaveMessage(null)} />}
    </>
  );
}

function AdminView(props: {
  accountRecords: AccountRecord[];
  studentGroups: StudentGroup[];
  onAccountRecordsChange: (records: AccountRecord[]) => void;
  onStudentGroupsChange: (groups: StudentGroup[]) => void;
  generatedAssets: GeneratedAsset[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  customExperts: CustomExpertRecord[];
  adminName: string;
  onKnowledgeBaseStatesChange: (states: KnowledgeBaseStates) => void;
  onKnowledgeCatalogChange: (catalog: KnowledgeBaseCatalogItem[]) => void;
  onPromptKnowledgeRoutesChange: (routes: PromptKnowledgeRoutes) => void;
  onCustomExpertsChange: (experts: CustomExpertRecord[]) => void;
  onDeleteExpert: (expertId: ExpertId) => boolean;
  onDeleteKnowledgeBase: (category: KnowledgeCategory) => boolean;
  onUploadKnowledge: (assets: KnowledgeUpload[]) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;
  submissions: Submission[];
}) {
  const { onAccountRecordsChange } = props;
  const [adminTab, setAdminTab] = useState<"resources" | "monitor" | "knowledge" | "prompts" | "evaluation">("resources");
  const [selectedKanbanGroupId, setSelectedKanbanGroupId] = useState<string | null>(null);
  const [selectedGroupDetailId, setSelectedGroupDetailId] = useState<string | null>(null);
  const [promptExpertId, setPromptExpertId] = useState<ExpertId>("brainstorm");
  const [promptMode, setPromptMode] = useState<ModelMode>("Auto");
  const [pendingDeleteExpertId, setPendingDeleteExpertId] = useState<ExpertId | null>(null);
  const [adminNewExpertName, setAdminNewExpertName] = useState("");
  const [adminNewExpertRole, setAdminNewExpertRole] = useState("");
  const [adminNewExpertScenario, setAdminNewExpertScenario] = useState("");
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>(() =>
    normalizeAccountRecords(
      withExtraDemoStudentAccounts(readStored<AccountRecord[]>("sufe-admin-account-records", initialAccountRecords)),
      props.studentGroups,
    ),
  );
  const [selectedAccountId, setSelectedAccountId] = useState(() => accountRecords[0]?.id || "");
  const [accountDetailId, setAccountDetailId] = useState<string | null>(null);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState<string | null>(null);
  const [isAccountCreateOpen, setIsAccountCreateOpen] = useState(false);
  const [newAccountRole, setNewAccountRole] = useState<Role>("student");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountLogin, setNewAccountLogin] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("123456");
  const [newAccountQuota, setNewAccountQuota] = useState("240");
  const [newAccountGroupId, setNewAccountGroupId] = useState(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupProjectName, setNewGroupProjectName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditDraft, setGroupEditDraft] = useState({ label: "", projectName: "" });
  const [accountEditDraft, setAccountEditDraft] = useState({
    name: "",
    account: "",
    password: "",
    quota: "",
    groupId: "",
  });
  const [adminUploadCategory, setAdminUploadCategory] = useState<KnowledgeCategory>("教学大纲");
  const [adminKnowledgeSearchDraft, setAdminKnowledgeSearchDraft] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [adminKnowledgeSearch, setAdminKnowledgeSearch] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [adminKnowledgePreviewId, setAdminKnowledgePreviewId] = useState<string | null>(null);
  const [adminKnowledgeName, setAdminKnowledgeName] = useState("");
  const [adminKnowledgeDirectorySearchDraft, setAdminKnowledgeDirectorySearchDraft] = useState("");
  const [adminKnowledgeDirectorySearch, setAdminKnowledgeDirectorySearch] = useState("");
  const [adminKnowledgeBasePreviewCategory, setAdminKnowledgeBasePreviewCategory] = useState<KnowledgeCategory | null>(null);
  const [knowledgeSaveMessage, setKnowledgeSaveMessage] = useState<string | null>(null);
  const initialAdminPromptParts = buildPromptTemplateParts(
    experts[0],
    "Auto",
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    props.promptKnowledgeRoutes[experts[0].id],
  );
  const [adminSystemPromptDraft, setAdminSystemPromptDraft] = useState(initialAdminPromptParts.system);
  const [adminUserPromptDraft, setAdminUserPromptDraft] = useState(initialAdminPromptParts.user);
  const [isPromptSaveOpen, setIsPromptSaveOpen] = useState(false);
  const [isAdminSkillFolderGuideOpen, setIsAdminSkillFolderGuideOpen] = useState(false);
  const [accountSaveMessage, setAccountSaveMessage] = useState<string | null>(null);
  const adminUploadInputRef = useRef<HTMLInputElement | null>(null);
  const adminExpertSkillFolderUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onAccountRecordsChange(accountRecords);
  }, [accountRecords, onAccountRecordsChange]);

  function openAccountDetail(account: AccountRecord) {
    setAccountEditDraft({
      name: account.name,
      account: account.account,
      password: account.password,
      quota: String(account.quota),
      groupId: account.groupId || "",
    });
    setAccountDetailId(account.id);
  }

  const pendingCount = props.submissions.filter((item) => item.status === "pending").length;
  const approvedCount = props.submissions.filter((item) => item.status === "approved").length;
  const revisionCount = props.submissions.filter((item) => item.status === "revision").length;
  const excellentCount = props.submissions.filter((item) => item.isExcellent).length;
  const generatedVideoCount = props.generatedAssets.filter((asset) => asset.type === "VIDEO").length;
  const generatedPptCount = props.generatedAssets.filter((asset) => asset.type === "PPT").length;
  const processedRate = Math.min(100, Math.round(((approvedCount + revisionCount) / Math.max(1, props.submissions.length)) * 100));
  const passRate = Math.round((approvedCount / Math.max(1, props.submissions.length)) * 100);
  const evaluationSubmissionCount = Math.max(props.submissions.length, 28);
  const evaluationApprovedCount = Math.max(approvedCount, 19);
  const evaluationRevisionCount = Math.max(revisionCount, 6);
  const evaluationExcellentCount = Math.max(excellentCount, 8);
  const evaluationProcessedRate = Math.max(processedRate, 89);
  const evaluationPassRate = Math.max(passRate, 68);
  const tabs = [
    ["resources", "账号与权限管理", Settings2],
    ["monitor", "运行监控中心", BarChart3],
    ["knowledge", "知识库管理", BookOpen],
    ["prompts", "专家提示词管理", Sparkles],
    ["evaluation", "试点运营评估", LineChart],
  ] as const;
  const kanbanProjects = props.studentGroups.map((group, index) => {
    const groupSubmissions = props.submissions.filter(
      (submission) => submission.group === group.label || submission.groupName === group.projectName || submission.group === group.projectName,
    );
    const latestSubmission = [...groupSubmissions].sort((a, b) => getSubmissionStageIndex(b) - getSubmissionStageIndex(a))[0];
    const fallbackStageIndex = Math.min(projectKanbanStages.length - 1, Math.max(0, 1 + (index % 5)));
    const stageIndex = latestSubmission ? getSubmissionStageIndex(latestSubmission) : fallbackStageIndex;
    const pending = groupSubmissions.filter((submission) => submission.status === "pending").length;
    const excellent = groupSubmissions.filter((submission) => submission.isExcellent).length;
    const members = accountRecords.filter((account) => account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === group.id);
    return {
      group,
      stageIndex,
      stageLabel: projectKanbanStages[stageIndex]?.label || projectKanbanStages[0].label,
      progress: Math.min(98, Math.max(8, Math.round(((stageIndex + 1) / projectKanbanStages.length) * 100))),
      latestSubmission,
      pending,
      excellent,
      members,
      submissions: groupSubmissions,
    };
  });
  const selectedKanbanProject = selectedKanbanGroupId ? kanbanProjects.find((project) => project.group.id === selectedKanbanGroupId) || null : null;
  const selectedGroupDetail = selectedGroupDetailId ? kanbanProjects.find((project) => project.group.id === selectedGroupDetailId) || null : null;
  const promptExpert = experts.find((expert) => expert.id === promptExpertId) || experts[0];
  const pendingDeleteExpert = pendingDeleteExpertId ? experts.find((expert) => expert.id === pendingDeleteExpertId) || null : null;
  const adminPromptKnowledgeCategories = props.promptKnowledgeRoutes[promptExpert.id] || getExpertKnowledgeCategories(promptExpert.id);
  const promptKnowledgeBases = getKnowledgeCatalogItems(adminPromptKnowledgeCategories);
  const enabledKnowledgeCount = props.knowledgeUploads.filter(
    (asset) =>
      asset.enabled !== false &&
      props.knowledgeBaseStates[asset.category || inferKnowledgeCategory(asset.name)] &&
      adminPromptKnowledgeCategories.includes(asset.category || inferKnowledgeCategory(asset.name)),
  ).length;
  const modeInstructions: Record<ModelMode, string> = {
    Auto: "自动判断输出深度，优先保证课堂演示节奏和结果完整性。",
    快速生成: "压缩分析过程，优先给出可直接复制的结构化结论。",
    深度分析: "增加商业判断、证据链、风险提示和教师审核口径。",
    多模态增强: "在文本结果之外补充 PPT、视频、海报或视觉素材的生成建议。",
  };
  const expertPromptContent = `角色：${promptExpert.name}
定位：${promptExpert.role}
适用场景：${promptExpert.scenario}

技能匹配方式：系统根据学生提问自动匹配该专家下的技能，不再在学生输入框展示技能下拉。
覆盖技能：${promptExpert.skills.map((skill) => `${skill.stage}/${skill.name}`).join("、")}

知识库引用规则：
${promptKnowledgeBases.map((base) => `- ${base.category}知识库：${base.description}`).join("\n")}
引用方式：优先使用已启用资料；如果某个知识库暂无教师上传资料，则使用 Demo 预置教学口径生成，但需要在结果中保持“知识来源标签”。

模式策略：${promptMode}
${modeInstructions[promptMode]}

输出要求：
1. 结合上海财经大学商学院创业实践课程场景，保持正式、教学导向、可审核。
2. 输出必须包含“生成摘要、关键建议、风险提醒、下一步动作”四类内容。
3. 如涉及阶段成果，需明确该成果可提交教师审核，并说明教师可重点看哪些判断依据。
4. 不出现底层供应商、真实模型名称或 token 信息。`;
  const expertPromptUserTemplate = `学生输入变量：
- 当前创意：项目名称、目标用户、问题场景、已验证/待验证假设
- 历史上下文：同一创意下最近 5 轮对话、已生成的阶段成果、教师反馈意见
- 本轮输入：学生在聊天框提出的问题、上传文件摘要、语音转写摘要
- 当前专家字段：${promptExpert.name} / ${promptExpert.scenario}
- 可引用知识库：${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}
- 已启用资料数量：${enabledKnowledgeCount} 个；如为 0，则使用 Demo 内置教学口径并保留知识来源标签

生成任务：
请基于以上上下文，调用“${promptExpert.name}”，由系统自动匹配技能，并按照“${promptMode}”模式输出结果。

组装规则：
1. 先判断学生当前处于哪个阶段节点，优先读取同一创意下与该节点相关的历史成果。
2. 从${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}中检索已启用资料，并把命中的资料转成“知识来源标签”。
3. ${promptMode === "快速生成" ? "只保留最关键的 3-4 条建议，避免长篇解释。" : promptMode === "深度分析" ? "补充证据链、风险边界、教师审核口径和下一轮修改任务。" : promptMode === "多模态增强" ? "除文本建议外，额外输出 PPT/视频/海报等多媒体承接建议。" : "根据输入完整度自动选择简版或深度版输出。"}
4. 输出必须能被学生直接复制到阶段成果中，并标明是否建议提交老师审核。
5. 如学生输入与当前技能不匹配，需要先温和纠偏，再给出可继续推进的结果。`;
  const accountDetail = accountDetailId ? accountRecords.find((account) => account.id === accountDetailId) || null : null;
  const studentGroupRows = props.studentGroups.map((group) => ({
    ...group,
    studentCount: accountRecords.filter((account) => account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === group.id).length,
  }));
  const pendingDeleteGroup = pendingDeleteGroupId ? studentGroupRows.find((group) => group.id === pendingDeleteGroupId) || null : null;
  const pendingDeleteAccount = pendingDeleteAccountId ? accountRecords.find((account) => account.id === pendingDeleteAccountId) || null : null;
  const adminKnowledgeFilteredUploads = props.knowledgeUploads.filter((asset) => matchesKnowledgeUploadSearch(asset, adminKnowledgeSearch));
  const adminKnowledgePreviewAsset = adminKnowledgePreviewId
    ? props.knowledgeUploads.find((asset) => asset.id === adminKnowledgePreviewId) || null
    : null;
  const adminActiveKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const adminKnowledgeBasePreviewItem = adminKnowledgeBasePreviewCategory
    ? adminActiveKnowledgeCatalog.find((base) => base.category === adminKnowledgeBasePreviewCategory) || null
    : null;
  const adminKnowledgeDirectoryRows = adminActiveKnowledgeCatalog.filter((base) => {
    const keyword = adminKnowledgeDirectorySearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${base.category} ${base.description} ${base.usedBy}`.toLowerCase().includes(keyword);
  });
  const selectedAdminUploadKnowledgeBase =
    adminActiveKnowledgeCatalog.find((base) => base.category === adminUploadCategory) ||
    adminActiveKnowledgeCatalog[0];
  const accountRoleSummary = [
    ["学生账号", accountRecords.filter((account) => account.role === "student").length, "按账号配置可调用专家、答辩模拟、成果提交"],
    ["教师账号", accountRecords.filter((account) => account.role === "teacher").length, "审核、退回修改、优秀成果标记、资料上传"],
    ["管理员账号", accountRecords.filter((account) => account.role === "admin").length, "账号权限、知识库、提示词和看板维护"],
    ["总调用配额", accountRecords.reduce((sum, account) => sum + account.quota, 0), "按账号分配，可人工调整"],
  ] as const;
  const monitorRows = [
    ["模型调用", "1,284 次", "稳定", "Auto 模式占比 61%，深度分析占比 24%"],
    ["系统负载", "37%", "正常", "普通笔记本演示环境运行稳定"],
    ["审核队列", `${pendingCount} 项`, pendingCount > 0 ? "待处理" : "清空", "教师端提交审核中心实时同步"],
    ["生成资产", `${generatedPptCount} 个 PPT / ${generatedVideoCount} 个视频`, "已缓存", "预生成文件已接入演示系统"],
  ];
  const enabledKnowledgeCatalogCount = getActiveKnowledgeCatalog(props.knowledgeCatalog).filter(
    (base) => props.knowledgeBaseStates[base.category] !== false,
  ).length;
  const enabledKnowledgeAssetCount = props.knowledgeUploads.filter((asset) => asset.enabled !== false).length;
  const dashboardStudentCount = accountRecords.filter((account) => account.role === "student").length;
  const dashboardTeacherCount = accountRecords.filter((account) => account.role === "teacher").length;
  const dashboardArtifactCount = props.submissions.length + props.generatedAssets.length;
  const dashboardKpis = [
    ["学生账号", dashboardStudentCount, "人", Users],
    ["项目小组", kanbanProjects.length, "组", Layers3],
    ["待审核成果", pendingCount, "项", ClipboardCheck],
    ["生成成果", dashboardArtifactCount, "份", FileText],
    ["启用知识库", enabledKnowledgeCatalogCount, "类", BookOpen],
    ["审核处理率", processedRate, "%", LineChart],
  ] as const;
  const dashboardModelBaseRows = [
    ["文本专家", Math.max(1, props.submissions.length + dashboardArtifactCount + dashboardTeacherCount * 2)],
    ["知识库检索", Math.max(1, enabledKnowledgeAssetCount + enabledKnowledgeCatalogCount)],
    ["PPT 生成", Math.max(0, generatedPptCount)],
    ["视频生成", Math.max(0, generatedVideoCount)],
  ] as const;
  const dashboardModelTotal = dashboardModelBaseRows.reduce((sum, [, value]) => sum + value, 0) || 1;
  const dashboardModelRows = dashboardModelBaseRows.map(([name, value]) => ({
    name,
    value,
    percent: Math.max(6, Math.round((value / dashboardModelTotal) * 100)),
  }));
  const dashboardExpertRows = experts
    .map((expert) => {
      const typeMap: Partial<Record<ExpertId, ArtifactType[]>> = {
        brainstorm: ["BRAINSTORM"],
        positioning: ["POSITIONING"],
        market: ["MARKET"],
        business: ["BP"],
        pitch: ["PPT"],
        script: ["SCRIPT"],
        defense: ["DEFENSE"],
        media: ["MEDIA"],
      };
      const matchedCount = props.submissions.filter((submission) => typeMap[expert.id]?.includes(submission.artifactType)).length;
      return {
        id: expert.id,
        name: expert.name.replace("专家", ""),
        count: matchedCount * 6 + stableNumber(expert.id, 10, 26),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const dashboardExpertMax = Math.max(...dashboardExpertRows.map((row) => row.count), 1);
  const dashboardStageRows = projectKanbanStages.map((stage, stageIndex) => {
    const count = kanbanProjects.filter((project) => project.stageIndex === stageIndex).length;
    return {
      label: stage.label,
      count,
      percent: Math.round((count / Math.max(1, kanbanProjects.length)) * 100),
    };
  });
  const dashboardLateStageCount = kanbanProjects.filter((project) => project.stageIndex >= 5).length;
  const dashboardAverageProgress = Math.round(
    kanbanProjects.reduce((sum, project) => sum + project.progress, 0) / Math.max(1, kanbanProjects.length),
  );
  const dashboardRunSummary = [
    ["运行小组", `${kanbanProjects.length}`, "组正在推进"],
    ["路演阶段", `${dashboardLateStageCount}`, "组进入 PPT / 答辩"],
    ["待审成果", `${pendingCount}`, "项等待教师处理"],
    ["平均进度", `${dashboardAverageProgress}%`, `${excellentCount} 项优秀沉淀`],
  ] as const;
  const dashboardFeedRows = [
    ...props.submissions.slice(-6).reverse().map((submission) => ({
      id: `submission-${submission.id}`,
      time: formatSubmittedAt(submission.submittedAt),
      group: submission.groupName || submission.group || "未分组项目",
      title: `提交 ${artifactLabels[submission.artifactType]}`,
      detail: `${submission.student} · ${statusLabels[submission.status]} · ${submission.artifactTitle}`,
    })),
    ...props.generatedAssets.slice(-4).reverse().map((asset) => ({
      id: `asset-${asset.id}`,
      time: formatSubmittedAt(asset.createdAt),
      group: asset.type === "PPT" ? "PPT 生成" : "视频生成",
      title: asset.title,
      detail: asset.type === "PPT" ? "已进入成果缓存，可用于预览和下载" : "已进入多媒体成果区，可用于演示渲染",
    })),
    ...props.knowledgeUploads.slice(-3).reverse().map((asset) => ({
      id: `knowledge-${asset.id}`,
      time: formatSubmittedAt(asset.uploadedAt),
      group: asset.category || inferKnowledgeCategory(asset.name),
      title: `更新资料：${asset.name}`,
      detail: `${asset.uploadedBy || "教师/管理员"} · ${asset.enabled === false ? "未启用" : "已启用"}`,
    })),
  ].slice(0, 8);
  const dashboardTeacherQueueRows = props.submissions
    .filter((submission) => submission.status === "pending" || submission.status === "revision")
    .slice(0, 5);
  function openBigscreen() {
    window.open("/bigscreen/index.html", "_blank", "noopener,noreferrer");
  }
  const effectRows = [
    ["任务完成率", "86%", "目标 80%", "10 个项目组中已有 8 组完成 BP 初稿与 PPT 框架"],
    ["成果通过率", `${evaluationPassRate}%`, "目标 60%", `已通过 ${evaluationApprovedCount} 项，主要集中在产品定位、BP 初稿和路演稿`],
    ["退回修改数", `${evaluationRevisionCount} 项`, "本周新增 3 项", "集中在商业模式、证据链、竞品对比和试点指标"],
    ["优秀案例数", `${evaluationExcellentCount} 项`, "目标 10 项", "4 项进入课堂展示，4 项进入后续案例库候选"],
  ];
  const aiEvaluationBlocks = [
    {
      title: "AI 综合评估结论",
      items: [
        `当前试点覆盖 50 名学生、10 个项目组，已累计提交阶段成果 ${evaluationSubmissionCount} 项，审核处理率 ${evaluationProcessedRate}%。`,
        `成果通过率达到 ${evaluationPassRate}%，说明学生端生成链路和教师端审核闭环已经可以支撑课程试点汇报。`,
        `优秀成果沉淀 ${evaluationExcellentCount} 项，其中“AI 就业教练”“银发陪诊助手”“校园二手循环平台”已具备课堂展示和案例库沉淀价值。`,
      ],
    },
    {
      title: "建设成效判断",
      items: [
        "教学价值：教师能在创意、定位、BP、PPT、答辩前看到学生阶段成果，点评从期末结果批改前移到过程指导。",
        "运营价值：管理员可追踪账号使用、知识库命中、成果审核和优秀案例沉淀，便于向学院汇报试点运行情况。",
        "扩展价值：正式版可继续接入真实 AI、知识库 API、数据库和导出服务，当前 Demo 已保留账号、资料、提示词和看板入口。",
      ],
    },
    {
      title: "AI 改进建议",
      items: [
        "优先把产品定位说明、BP、PPT 和答辩模拟结果统一到同一套评分 Rubric，减少教师二次解释成本。",
        "针对商业模式、竞品维度、证据链薄弱的项目组建立专项提示词，让系统先引导学生补材料再生成成果。",
        "管理员端后续可加入班级、教师、项目组和成果类型筛选，支持正式试点按周复盘。",
      ],
    },
  ];
  const evaluationReviewBlocks = [
    {
      title: "阶段进展",
      tag: "第 5 周",
      items: [
        "10 个项目组已完成创意风暴和产品定位，8 组提交 BP 初稿，6 组进入 PPT 和路演稿打磨。",
        "教师端本周完成 25 条批注，其中 11 条聚焦商业模式，8 条聚焦目标用户，6 条聚焦竞品证据。",
        "管理端已能查看账号使用、资料启用、提示词维护、审核队列和试点运营评估。",
      ],
    },
    {
      title: "关键发现",
      tag: "高频问题",
      items: [
        "退回修改主要集中在“谁付费、为什么现在付费、如何验证需求”三类问题。",
        "质量较高的小组通常会引用访谈、竞品截图、问卷结果和课程案例，内容更容易通过审核。",
        "PPT 页面最常缺少证据页，答辩模拟中最常被追问市场规模、转化路径和可持续收入。",
      ],
    },
    {
      title: "风险跟踪",
      tag: "需干预",
      items: [
        "2 个项目组仍停留在功能罗列，缺少真实用户画像和使用场景。",
        "3 份 BP 的收入模型偏弱，需要补充定价、获客成本和试点转化指标。",
        "知识库还需补齐优秀 BP 样例、答辩追问题库、评分 Rubric 和竞品分析模板。",
      ],
    },
    {
      title: "下阶段动作",
      tag: "下周安排",
      items: [
        "组织一次 BP 付费方拆解课，要求每组写清楚购买者、使用者、影响者和决策链。",
        "要求每组补充一页证据页，并在答辩模拟中验证表达是否能回应追问。",
        "从 8 项优秀候选中筛选 3-5 份，沉淀为下一轮班级可复用的案例库样例。",
      ],
    },
  ];
  const evaluationEvidenceRows = [
    ["课堂讨论记录", "183 轮", "创意风暴、商业模式和答辩追问三类对话最多"],
    ["教师有效批注", "25 条", "已同步到学生成果修改建议和优秀案例筛选"],
    ["知识库命中", "76 次", "BP 模板、评分 Rubric、竞品分析资料命中最高"],
    ["待重点跟进", "3 组", "需要补充收入模型、用户证据和试点指标"],
  ];

  useEffect(() => {
    localStorage.setItem("sufe-admin-account-records", JSON.stringify(accountRecords));
  }, [accountRecords]);

  function applyAdminKnowledgeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminKnowledgeSearch(adminKnowledgeSearchDraft);
  }

  function resetAdminKnowledgeSearch() {
    setAdminKnowledgeSearchDraft(emptyKnowledgeUploadSearch);
    setAdminKnowledgeSearch(emptyKnowledgeUploadSearch);
  }

  function applyAdminKnowledgeDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminKnowledgeDirectorySearch(adminKnowledgeDirectorySearchDraft);
  }

  function handleAdminToggleKnowledgeBaseState(category: KnowledgeCategory) {
    const nextEnabled = !props.knowledgeBaseStates[category];
    props.onKnowledgeBaseStatesChange({ ...props.knowledgeBaseStates, [category]: nextEnabled });
    setKnowledgeSaveMessage(`已${nextEnabled ? "启用" : "停用"}「${category}知识库」，学生端、教师端和提示词配置会同步更新。`);
  }

  function confirmAdminDeleteExpert() {
    if (!pendingDeleteExpert) return;
    const expertId = pendingDeleteExpert.id;
    if (props.onDeleteExpert(expertId)) {
      const nextExpert = experts.find((expert) => expert.id !== expertId) || experts[0];
      const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
      const nextParts = buildPromptTemplateParts(nextExpert, promptMode, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
      setPromptExpertId(nextExpert.id);
      setAdminSystemPromptDraft(nextParts.system);
      setAdminUserPromptDraft(nextParts.user);
      setKnowledgeSaveMessage("专家已删除，并同步到教师端和学生端专家列表。");
    }
    setPendingDeleteExpertId(null);
  }

  function handleAdminPromptKnowledgeToggle(category: KnowledgeCategory) {
    const nextCategories = toggleKnowledgeRouteCategory(adminPromptKnowledgeCategories, category);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [promptExpert.id]: nextCategories });
    const nextParts = buildPromptTemplateParts(
      promptExpert,
      promptMode,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
  }

  function handleAdminCreateCustomExpert() {
    const name = adminNewExpertName.trim();
    if (!name) {
      setKnowledgeSaveMessage("请先填写专家名称。");
      return;
    }
    if (experts.some((expert) => expert.name === name)) {
      setKnowledgeSaveMessage("这个专家名称已经存在。");
      return;
    }
    const skillName = "阶段成果生成";
    const nextExpert: CustomExpertRecord = {
      id: `custom-${Date.now()}`,
      name,
      role: adminNewExpertRole.trim() || "根据管理端配置的提示词，生成课堂阶段成果和审核辅助内容。",
      scenario: adminNewExpertScenario.trim() || "自定义专家场景、阶段成果生成、课堂专题指导",
      accent: "#0f7b73",
      skills: [
        {
          id: `custom-skill-${Date.now()}`,
          name: skillName,
          stage: "自定义专家",
          description: "根据管理端配置的提示词和知识库生成阶段成果。",
        },
      ],
    };
    const defaultCategories = ["教学大纲", "创业案例"] as KnowledgeCategory[];
    props.onCustomExpertsChange([...props.customExperts, nextExpert]);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [nextExpert.id]: defaultCategories });
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(nextExpert),
      "Auto",
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      defaultCategories,
    );
    setPromptExpertId(nextExpert.id);
    setPromptMode("Auto");
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
    setAdminNewExpertName("");
    setAdminNewExpertRole("");
    setAdminNewExpertScenario("");
    setKnowledgeSaveMessage("新增专家已同步到学生端专家列表。");
  }

  async function handleAdminUploadExpertSkillFolder(files: FileList | null) {
    if (!files?.length) return;
    const nextExpert = await buildCustomExpertFromSkillFiles(files, `管理端 · ${props.adminName || "平台管理员"}`);
    if (!nextExpert) {
      setKnowledgeSaveMessage("这个文件夹里没有可读取的 .md / .txt / .json 专家 Skill 文件。");
      return;
    }
    nextExpert.name = getUniqueExpertName(nextExpert.name, experts);
    const defaultCategories = ["教学大纲", "创业案例"] as KnowledgeCategory[];
    props.onCustomExpertsChange([...props.customExperts, nextExpert]);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [nextExpert.id]: defaultCategories });
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(nextExpert),
      "Auto",
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      defaultCategories,
    );
    setPromptExpertId(nextExpert.id);
    setPromptMode("Auto");
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
    setAdminNewExpertName("");
    setAdminNewExpertRole("");
    setAdminNewExpertScenario("");
    setKnowledgeSaveMessage(`已上传 Skill 文件夹「${nextExpert.sourceSkillName || nextExpert.name}」，并生成专家「${nextExpert.name}」。`);
  }

  function handleAdminCreateKnowledgeBase() {
    const category = adminKnowledgeName.trim();
    const usedBy = "学生端专家、教师审核、管理端提示词";
    if (!category) {
      setKnowledgeSaveMessage("请先填写知识库名称。");
      return;
    }
    if (props.knowledgeCatalog.some((item) => item.category === category)) {
      setKnowledgeSaveMessage("这个知识库目录已经存在。");
      return;
    }
    const nextItem: KnowledgeBaseCatalogItem = {
      category,
      description: `${category}：由管理端新增，可用于 ${usedBy}。`,
      usedBy,
    };
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogAddition(
      props.knowledgeCatalog,
      props.knowledgeBaseStates,
      props.promptKnowledgeRoutes,
      nextItem,
    );
    props.onKnowledgeCatalogChange(nextCatalog);
    props.onKnowledgeBaseStatesChange(nextStates);
    props.onPromptKnowledgeRoutesChange(nextRoutes);
    setAdminUploadCategory(category);
    setAdminKnowledgeSearchDraft((current) => ({ ...current, category }));
    setAdminKnowledgeName("");
    setKnowledgeSaveMessage(`已新增知识库「${category}」，并同步到学生端和提示词目录。`);
  }

  async function handleAdminLocalUpload(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => {
        const canReadText =
          file.size < 250_000 &&
          (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md"));
        let text = "";
        if (canReadText) {
          try {
            text = await file.text();
          } catch {
            text = "";
          }
        }
        const fileDataUrl = await readFileAsDataUrl(file);
        return {
          id: makeId("K"),
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "本地文件",
          fileDataUrl,
          uploadedAt: nowDateTime(),
          uploadedBy: props.adminName || "平台管理员",
          preview: buildUploadPreview(file, text, adminUploadCategory),
          category: adminUploadCategory,
          enabled: true,
        };
      }),
    );
    props.onUploadKnowledge(uploaded);
  }

  function getDefaultPermissions(role: Role) {
    if (role === "student") return getStudentExpertPermissionNames();
    if (role === "teacher") return ["提交审核中心", "节点解答与指导", "优秀成果标记", "上传教学资料"];
    return ["账号权限管理", "知识库维护", "专家提示词管理", "试点数据看板"];
  }

  function getDefaultQuota(role: Role) {
    if (role === "student") return 240;
    if (role === "teacher") return 520;
    return 1500;
  }

  function getPermissionDescription(permission: string, role: Role) {
    const expert = experts.find((item) => item.name === permission);
    if (role === "student" && expert) {
      return `允许学生在 AI 创意工作台中调用“${expert.name}”，用于${expert.scenario}。停用后学生端专家下拉中不再显示该专家。`;
    }
    const descriptions: Record<string, string> = {
      "AI 创意工作台": "允许学生进入对话式创意空间，选择专家和生成模式，由系统自动匹配技能，生成头脑风暴、定位、BP、PPT、路演稿、多媒体物料等阶段成果。",
      调用课程知识库: "允许学生端专家在生成时读取管理端已开放目录、教师端已启用资料，并把命中的资料作为知识来源标签。",
      答辩模拟: "允许学生基于已生成的 BP、PPT 或路演稿进入答辩模拟，进行语音或文本问答，并保存答辩评价与复盘记录。",
      提交老师审核: "允许学生将阶段成果发送到教师端提交审核中心，教师可查看内容、预览附件、通过或退回修改。",
      下载个人成果: "允许学生下载个人生成的 Word、PPTX、答辩复盘和多媒体物料包，仅限本人当前项目成果。",
      提交审核中心: "允许教师查看学生提交的全部阶段成果，按成果类型和审核状态筛选，并进入详情进行审核。",
      节点解答与指导: "允许教师围绕定位、BP、PPT、答辩等关键节点给出点评意见、退回修改建议和指导话术。",
      优秀成果标记: "允许教师将通过审核的高质量 BP、PPT、答辩记录或多媒体物料标记为优秀成果，进入成果沉淀。",
      上传教学资料: "允许教师从本地上传教学大纲、BP 模板、评分标准、案例库、答辩题库和多媒体模板等资料。",
      账号权限管理: "允许管理员开通、停用、删除学生/教师/管理员账号，查看密码、角色端口、调用配额和权限范围。",
      知识库维护: "允许管理员维护知识库分类、查看教师上传资料、启用/停用资料，并管理资料详情。",
      专家提示词管理: "允许管理员查看各专家、技能、模式对应的提示词组装规则，以及模块引用的知识库范围。",
      试点数据看板: "允许管理员查看提交、审核、调用、优秀成果沉淀等运营指标，并查看 AI 建设成效评估。",
    };
    if (descriptions[permission]) return descriptions[permission];
    if (role === "student") return "学生端演示权限，用于完成个人项目生成、提交、反馈和下载闭环。";
    if (role === "teacher") return "教师端教学管理权限，用于完成成果审核、节点指导和资料上传。";
    return "管理端运营权限，用于完成账号、知识库、提示词和试点数据管理。";
  }

  function getRoleTitle(role: Role) {
    if (role === "student") return "商学院创业实践课学生";
    if (role === "teacher") return "创业实践课程教师";
    return "教学平台运营管理员";
  }

  function getGroupById(groupId: string) {
    return props.studentGroups.find((group) => group.id === groupId) || props.studentGroups[0];
  }

  function buildStudentGroupPatch(groupId: string) {
    const group = getGroupById(groupId);
    if (!group) return {};
    return {
      groupId: group.id,
      groupLabel: group.label,
      groupName: group.projectName,
      groupOrScope: formatGroupScope(group),
    };
  }

  function handleCreateStudentGroup() {
    const label = newGroupLabel.trim();
    const projectName = newGroupProjectName.trim();
    if (!label || !projectName) {
      setAccountSaveMessage("请填写组号和项目名称。");
      return;
    }
    const nextGroup = { id: makeId("G"), label, projectName };
    props.onStudentGroupsChange([nextGroup, ...props.studentGroups]);
    setNewAccountGroupId(nextGroup.id);
    setNewGroupLabel("");
    setNewGroupProjectName("");
    setAccountSaveMessage("学生小组已新增，可在新建学生账号时选择。");
  }

  function handleDeleteStudentGroup(group: StudentGroup, studentCount: number) {
    if (studentCount > 0) {
      setAccountSaveMessage(`“${group.label} / ${group.projectName}”已有 ${studentCount} 名学生，需先在账号详情中调整学生小组后再删除。`);
      return;
    }
    setPendingDeleteGroupId(group.id);
  }

  function handleConfirmDeleteStudentGroup() {
    if (!pendingDeleteGroup) return;
    const nextGroups = props.studentGroups.filter((item) => item.id !== pendingDeleteGroup.id);
    props.onStudentGroupsChange(nextGroups);
    if (newAccountGroupId === pendingDeleteGroup.id) {
      setNewAccountGroupId(nextGroups[2]?.id || nextGroups[0]?.id || "");
    }
    setPendingDeleteGroupId(null);
    setAccountSaveMessage("学生小组已删除。");
  }

  function openGroupEditor(group: StudentGroup) {
    setEditingGroupId(group.id);
    setGroupEditDraft({ label: group.label, projectName: group.projectName });
  }

  function handleSaveStudentGroup(groupId: string) {
    const label = groupEditDraft.label.trim();
    const projectName = groupEditDraft.projectName.trim();
    if (!label || !projectName) {
      setAccountSaveMessage("请填写组号和小组名称。");
      return;
    }
    const currentGroup = props.studentGroups.find((group) => group.id === groupId);
    if (!currentGroup) return;
    const nextGroup = { ...currentGroup, label, projectName };
    props.onStudentGroupsChange(props.studentGroups.map((group) => (group.id === groupId ? nextGroup : group)));
    setAccountRecords((current) =>
      current.map((account) =>
        account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === groupId
          ? {
              ...account,
              groupId,
              groupLabel: label,
              groupName: projectName,
              groupOrScope: formatGroupScope(nextGroup),
            }
          : account,
      ),
    );
    setEditingGroupId(null);
    setAccountSaveMessage("小组名称已更新。");
  }

  function handleCreateAccount() {
    const name = newAccountName.trim() || (newAccountRole === "student" ? `学生${accountRecords.length + 1}` : newAccountRole === "teacher" ? `教师${accountRecords.length + 1}` : `管理员${accountRecords.length + 1}`);
    const prefix = newAccountRole === "student" ? "student" : newAccountRole === "teacher" ? "teacher" : "admin";
    const loginAccount = newAccountLogin.trim() || `${prefix}${accountRecords.length + 1}@sufe.demo`;
    const password = newAccountPassword.trim() || "123456";
    const quota = Math.max(0, Number.parseInt(newAccountQuota, 10) || getDefaultQuota(newAccountRole));
    const groupPatch = newAccountRole === "student" ? buildStudentGroupPatch(newAccountGroupId) : {};
    if (newAccountRole === "student" && !("groupId" in groupPatch)) {
      setAccountSaveMessage("请先为学生账号选择所属项目小组。");
      return;
    }
    const next: AccountRecord = {
      id: makeId("A"),
      role: newAccountRole,
      name,
      account: loginAccount,
      password,
      title: getRoleTitle(newAccountRole),
      groupOrScope: newAccountRole === "student" ? "待分配项目小组" : newAccountRole === "teacher" ? "待分配课程班级" : "平台运营范围",
      ...groupPatch,
      permissions: getDefaultPermissions(newAccountRole),
      quota,
      status: "已开通",
    };
    setAccountRecords((current) => [next, ...current]);
    setSelectedAccountId(next.id);
    setNewAccountName("");
    setNewAccountLogin("");
    setNewAccountPassword("123456");
    setNewAccountQuota(String(getDefaultQuota(newAccountRole)));
    setNewAccountGroupId(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
    setIsAccountCreateOpen(false);
  }

  function handleToggleAccountStatus(id: string) {
    setAccountRecords((current) =>
      current.map((account) =>
        account.id === id ? { ...account, status: account.status === "已开通" ? "已停用" : "已开通" } : account,
      ),
    );
  }

  function isPermissionEnabled(account: AccountRecord, permission: string) {
    return !(account.disabledPermissions || []).includes(permission);
  }

  function handleToggleAccountPermission(accountId: string, permission: string) {
    const targetAccount = accountRecords.find((account) => account.id === accountId);
    const targetDisabledPermissions = targetAccount?.disabledPermissions || [];
    const studentExpertPermissions = getStudentExpertPermissionNames();
    if (
      targetAccount?.role === "student" &&
      studentExpertPermissions.includes(permission) &&
      !targetDisabledPermissions.includes(permission) &&
      studentExpertPermissions.filter((item) => !targetDisabledPermissions.includes(item)).length <= 1
    ) {
      setAccountSaveMessage("学生账号至少需要保留 1 个可用专家。");
      return;
    }
    setAccountRecords((current) =>
      current.map((account) => {
        if (account.id !== accountId) return account;
        const disabledPermissions = account.disabledPermissions || [];
        const nextDisabledPermissions = disabledPermissions.includes(permission)
          ? disabledPermissions.filter((item) => item !== permission)
          : [...disabledPermissions, permission];
        return { ...account, disabledPermissions: nextDisabledPermissions };
      }),
    );
  }

  function handleSaveAccountDetail() {
    if (!accountDetail) return;
    const name = accountEditDraft.name.trim();
    const account = accountEditDraft.account.trim();
    const password = accountEditDraft.password.trim();
    const quota = Math.max(0, Number.parseInt(accountEditDraft.quota, 10) || 0);
    if (!name || !account || !password) {
      setAccountSaveMessage("姓名、登录账号和演示密码不能为空。");
      return;
    }
    setAccountRecords((current) =>
      current.map((item) =>
        item.id === accountDetail.id
          ? {
              ...item,
              name,
              account,
              password,
              quota,
              ...(item.role === "student" ? buildStudentGroupPatch(accountEditDraft.groupId) : {}),
            }
          : item,
      ),
    );
    setAccountSaveMessage("账号信息已保存。");
  }

  function handleDeleteAccount(id: string) {
    const account = accountRecords.find((item) => item.id === id);
    if (!account) return;
    setPendingDeleteAccountId(id);
  }

  function handleConfirmDeleteAccount() {
    if (!pendingDeleteAccount) return;
    const id = pendingDeleteAccount.id;
    const remaining = accountRecords.filter((item) => item.id !== id);
    setAccountRecords(remaining);
    if (selectedAccountId === id) setSelectedAccountId(remaining[0]?.id || "");
    if (accountDetailId === id) setAccountDetailId(null);
    setPendingDeleteAccountId(null);
    setAccountSaveMessage("账号已删除。");
  }

  return (
    <section className="admin-shell admin-console-layout role-view-shell">
      <aside className="admin-console-side">
        <nav className="admin-tabs" aria-label="管理端模块切换">
          {tabs.map(([tab, label, Icon]) => (
            <button
              className={adminTab === tab ? "active" : ""}
              key={tab}
              type="button"
              onClick={() => {
                if (tab === "monitor") {
                  openBigscreen();
                  return;
                }
                setAdminTab(tab);
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="admin-console-main">
        <div className="admin-console-topbar">
          <div>
            <h3>{tabs.find(([tab]) => tab === adminTab)?.[1] || "平台运营管理中心"}</h3>
            <span>《创业中国》创业实践试点班 · 第 14 教学周</span>
          </div>
        </div>

      {adminTab === "resources" && (
        <div className="admin-page" key="admin-resources">
          <div className="admin-path-grid">
            <article>
              <Settings2 size={22} />
              <h4>账号与权限管理</h4>
              <p>管理员按学生、教师、管理员三类角色开通账号，查看密码、权限范围和调用配额，并可删除不再使用的账号。</p>
            </article>
          </div>
          <div className="account-summary-grid">
            {accountRoleSummary.map(([label, value, detail]) => (
              <article key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <div className="admin-resource-layout">
            <section className="admin-resource-section student-group-manager">
              <div className="account-table-toolbar admin-resource-toolbar">
                <div>
                  <strong>项目小组管理</strong>
                  <span>维护项目小组及学生归属，新建学生账号时可直接绑定对应小组</span>
                </div>
                <div className="student-group-create">
                  <input value={newGroupLabel} onChange={(event) => setNewGroupLabel(event.target.value)} placeholder="如：第 11 组" />
                  <input value={newGroupProjectName} onChange={(event) => setNewGroupProjectName(event.target.value)} placeholder="项目名称" />
                  <button className="primary-button" type="button" onClick={handleCreateStudentGroup}>
                    新增小组
                  </button>
                </div>
              </div>
              <div className="student-group-grid">
                {studentGroupRows.map((group) => (
                  <article key={group.id}>
                    <div>
                      <span>{group.label}</span>
                      <strong>{group.projectName}</strong>
                      <em>{group.studentCount} 名学生</em>
                    </div>
                    <div className="student-group-actions">
                      <button type="button" onClick={() => setSelectedGroupDetailId(group.id)}>
                        查看详情
                      </button>
                      <button
                        className={`student-group-delete ${group.studentCount > 0 ? "disabled" : ""}`}
                        type="button"
                        onClick={() => handleDeleteStudentGroup(group, group.studentCount)}
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="admin-resource-section account-management-layout">
              <div className="account-table-toolbar admin-resource-toolbar">
                <div>
                  <strong>账号权限管理</strong>
                  <span>查看账号、密码、角色、权限、配额和状态，支持新增、编辑和删除账号</span>
                </div>
                <button className="primary-button" type="button" onClick={() => setIsAccountCreateOpen(true)}>
                  <Save size={16} />
                  新建账号
                </button>
              </div>
              <div className="account-table">
              <div className="table-row table-head">
                <span>姓名</span>
                <span>角色</span>
                <span>登录账号</span>
                <span>演示密码</span>
                <span>调用配额</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {accountRecords.map((account) => (
                <article className="table-row" key={account.id}>
                  <span title={`${account.name} / ${account.groupOrScope}`}>
                    <strong>{account.name}</strong>
                    <small>{account.groupOrScope}</small>
                  </span>
                  <span>{account.role === "student" ? "学生端" : account.role === "teacher" ? "教师端" : "管理端"}</span>
                  <span title={account.account}>{account.account}</span>
                  <span>{account.password}</span>
                  <span>{account.quota} 次</span>
                  <span>
                    <button
                      className={`account-status-toggle ${account.status === "已开通" ? "enabled" : "disabled"}`}
                      type="button"
                      onClick={() => handleToggleAccountStatus(account.id)}
                    >
                      {account.status}
                    </button>
                  </span>
                  <span className="account-row-actions">
                    <button type="button" onClick={() => openAccountDetail(account)}>
                      查看详情
                    </button>
                    <button className="danger" type="button" onClick={() => handleDeleteAccount(account.id)}>
                      删除
                    </button>
                  </span>
                </article>
              ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {adminTab === "monitor" && (
        <div className="admin-page admin-dashboard-page" key="admin-monitor">
          <div className="admin-dashboard-kpis">
            {dashboardKpis.map(([label, value, unit, Icon]) => (
              <article key={label}>
                <Icon size={18} />
                <span>{label}</span>
                <strong>
                  {value}
                  <small>{unit}</small>
                </strong>
              </article>
            ))}
          </div>

          <div className="admin-dashboard-grid">
            <aside className="dashboard-side-column">
              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">LIVE STATUS</span>
                    <h4>运行态势</h4>
                  </div>
                  <em>60s 自动刷新</em>
                </div>
                <div className="dashboard-monitor-list">
                  {monitorRows.map(([name, value, status, detail]) => (
                    <article key={name}>
                      <div>
                        <strong>{name}</strong>
                        <span>{detail}</span>
                      </div>
                      <b>{value}</b>
                      <em>{status}</em>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">MODEL ROUTING</span>
                    <h4>能力调用分布</h4>
                  </div>
                </div>
                <div className="dashboard-bars">
                  {dashboardModelRows.map((row) => (
                    <div key={row.name}>
                      <span>{row.name}</span>
                      <strong style={{ width: `${row.percent}%` }}>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">EXPERT CALLS</span>
                    <h4>专家调用排行</h4>
                  </div>
                </div>
                <div className="dashboard-expert-rank">
                  {dashboardExpertRows.map((row) => (
                    <article key={row.id}>
                      <span>{row.name}</span>
                      <div>
                        <em style={{ width: `${Math.max(8, Math.round((row.count / dashboardExpertMax) * 100))}%` }} />
                      </div>
                      <strong>{row.count}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </aside>

            <main className="dashboard-center-column">
              <section className="dashboard-glass-panel dashboard-stage-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">8 STAGES · {kanbanProjects.length} GROUPS</span>
                    <h4>小组项目阶段推进</h4>
                  </div>
                  <em>{pendingCount} 项待审核 · {excellentCount} 项优秀成果</em>
                </div>
                <div className="dashboard-stage-strip">
                  <div className="dashboard-run-summary">
                    {dashboardRunSummary.map(([label, value, detail]) => (
                      <article key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <em>{detail}</em>
                      </article>
                    ))}
                  </div>
                  {dashboardStageRows.map((row) => (
                    <article key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.count} 组</strong>
                      <div>
                        <em style={{ width: `${Math.max(6, row.percent)}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="admin-kanban-board dashboard-kanban-board">
                  {projectKanbanStages.map((stage, stageIndex) => {
                    const projects = kanbanProjects.filter((project) => project.stageIndex === stageIndex);
                    return (
                      <section className="kanban-column" key={stage.label}>
                        <header>
                          <strong>{stage.label}</strong>
                          <span>{projects.length} 组</span>
                        </header>
                        <div className="kanban-column-list">
                          {projects.length === 0 && <p className="kanban-empty">暂无小组停留在该阶段</p>}
                          {projects.map((project) => (
                            <button className="kanban-card" key={project.group.id} type="button" onClick={() => setSelectedKanbanGroupId(project.group.id)}>
                              <span>{project.group.label}</span>
                              <strong>{project.group.projectName}</strong>
                              <p>{project.latestSubmission?.artifactTitle || "已建立项目档案，等待下一次阶段成果提交。"}</p>
                              <div className="kanban-progress">
                                <em style={{ width: `${project.progress}%` }} />
                              </div>
                              <footer>
                                <small>{project.members.length || stableNumber(project.group.id, 4, 5)} 名学生</small>
                                <small>{project.pending} 待审 · {project.excellent} 优秀</small>
                              </footer>
                              <span className="kanban-card-action">查看详情</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            </main>

            <aside className="dashboard-side-column">
              <section className="dashboard-glass-panel dashboard-feed-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">ACTIVITY TRACE</span>
                    <h4>系统实时流水</h4>
                  </div>
                </div>
                <div className="dashboard-feed-list">
                  {dashboardFeedRows.length === 0 && <p className="dashboard-empty">暂无提交、生成或知识库更新记录</p>}
                  {dashboardFeedRows.map((row, index) => (
                    <article className={index === 0 ? "is-latest" : undefined} key={row.id}>
                      <div className="dashboard-feed-time">
                        <time>{row.time}</time>
                        {index === 0 && <span>LIVE</span>}
                      </div>
                      <div>
                        <strong>{row.title}</strong>
                        <span>{row.group}</span>
                        <p>{row.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel dashboard-queue-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">TEACHER QUEUE</span>
                    <h4>教师审核队列</h4>
                  </div>
                  <em>{pendingCount} 待处理</em>
                </div>
                <div className="dashboard-teacher-queue">
                  {dashboardTeacherQueueRows.length === 0 && <p className="dashboard-empty">当前没有待审核或退回修改成果</p>}
                  {dashboardTeacherQueueRows.map((submission) => (
                    <article key={submission.id}>
                      <div>
                        <strong>{submission.groupName || submission.group}</strong>
                        <span>{artifactLabels[submission.artifactType]} · {submission.student}</span>
                      </div>
                      <em className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</em>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

        {adminTab === "knowledge" && (
          <div className="admin-page" key="admin-knowledge">
            <div className="teacher-module-panel admin-knowledge-manager">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">管理端</span>
                  <h3>知识库管理</h3>
                </div>
            </div>
            <div className="knowledge-module-layout">
              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">目录管理</span>
                    <h4>知识库目录</h4>
                  </div>
                </div>
            <div className="knowledge-create-panel">
              <div className="knowledge-create-form admin-knowledge-create-form">
                <label>
                  <span>目录名称</span>
                  <input value={adminKnowledgeName} onChange={(event) => setAdminKnowledgeName(event.target.value)} placeholder="如：行业调研知识库" />
                </label>
                <button className="knowledge-inline-action" type="button" onClick={handleAdminCreateKnowledgeBase}>
                  <Save size={15} />
                  新建目录
                </button>
              </div>
              <form className="knowledge-directory-search-form" onSubmit={applyAdminKnowledgeDirectorySearch}>
                <label className="knowledge-directory-search">
                  <span>目录查询</span>
                  <input
                    value={adminKnowledgeDirectorySearchDraft}
                    onChange={(event) => setAdminKnowledgeDirectorySearchDraft(event.target.value)}
                    placeholder="输入目录名称或适用模块"
                  />
                </label>
                <button className="knowledge-inline-action" type="submit">
                  查询
                </button>
              </form>
              <div className="knowledge-base-directory-list">
                  {adminKnowledgeDirectoryRows.map((base) => {
                  const fileCount = props.knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === base.category).length;
                  const enabled = props.knowledgeBaseStates[base.category] !== false;
                  return (
                    <article key={base.category}>
                      <div>
                        <strong>{base.category}知识库</strong>
                        <span>{fileCount} 份资料 · {enabled ? "已开放" : "已停用"}</span>
                      </div>
                      <div className="knowledge-directory-actions">
                        <button type="button" onClick={() => setAdminKnowledgeBasePreviewCategory(base.category)}>
                          查看详情
                        </button>
                        <button type="button" onClick={() => handleAdminToggleKnowledgeBaseState(base.category)}>
                          {enabled ? "停用" : "启用"}
                        </button>
                        <button
                          className="danger-text-button"
                          type="button"
                          onClick={() => props.onDeleteKnowledgeBase(base.category)}
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
              </section>

              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">资料管理</span>
                    <h4>知识库资料</h4>
                  </div>
                </div>
            <div className="teacher-upload-toolbar">
              <label className="knowledge-upload-target" htmlFor="admin-upload-category">
                <span>上传到知识库</span>
                <strong>选择资料归属目录</strong>
                <PrettySelect
                  value={adminUploadCategory}
                  ariaLabel="选择上传知识库"
                  options={adminActiveKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` }))}
                  onChange={(value) => setAdminUploadCategory(value)}
                />
              </label>
              <p className="knowledge-base-hint">
                {selectedAdminUploadKnowledgeBase.description} 适用模块：{selectedAdminUploadKnowledgeBase.usedBy}
                {props.knowledgeBaseStates[adminUploadCategory] ? " 当前目录已开放给学生端调用。" : " 当前目录已停用，学生端暂不可调用。"}
              </p>
              <button className="status-pill pending-jump admin-upload-material-button upload-inline-button" type="button" onClick={() => adminUploadInputRef.current?.click()}>
                <Upload size={15} />
                上传资料
              </button>
            </div>
            <input
              ref={adminUploadInputRef}
              className="visually-hidden-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
              onChange={(event) => {
                void handleAdminLocalUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <form className="knowledge-search" onSubmit={applyAdminKnowledgeSearch}>
              <label className="knowledge-search-keyword">
                <span>资料名称 / 文件类型 / 内容关键词</span>
                <input
                  type="search"
                  placeholder="输入资料名称、文件类型或关键词"
                  value={adminKnowledgeSearchDraft.keyword}
                  onChange={(event) => setAdminKnowledgeSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
                />
              </label>
              <label>
                <span>知识库</span>
                <PrettySelect
                  value={adminKnowledgeSearchDraft.category}
                  ariaLabel="筛选知识库"
                  options={[
                    { value: "ALL" as KnowledgeCategory | "ALL", label: "全部知识库" },
                    ...adminActiveKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` })),
                  ]}
                  onChange={(value) => setAdminKnowledgeSearchDraft((current) => ({ ...current, category: value }))}
                />
              </label>
              <label>
                <span>是否启用</span>
                <PrettySelect
                  value={adminKnowledgeSearchDraft.status}
                  ariaLabel="筛选启用状态"
                  options={[
                    { value: "ALL", label: "全部状态" },
                    { value: "enabled", label: "已启用" },
                    { value: "disabled", label: "未启用" },
                  ]}
                  onChange={(value) => setAdminKnowledgeSearchDraft((current) => ({ ...current, status: value }))}
                />
              </label>
              <div className="knowledge-search-actions">
                <button className="primary-button" type="submit">
                  <Filter size={15} />
                  查询
                </button>
                <button className="ghost-button" type="button" onClick={resetAdminKnowledgeSearch}>
                  重置
                </button>
              </div>
            </form>
            <div className="record-table knowledge-table">
              <div className="table-row table-head">
                <span>资料名称</span>
                <span>知识库</span>
                <span>文件信息</span>
                <span>上传教师</span>
                <span>上传时间</span>
                <span>是否启用</span>
                <span>操作</span>
              </div>
              {adminKnowledgeFilteredUploads.length === 0 && (
                <div className="submission-empty-row">暂无匹配资料，可以调整查询条件或先上传资料。</div>
              )}
              {adminKnowledgeFilteredUploads.map((asset) => {
                const category = asset.category || inferKnowledgeCategory(asset.name);
                const enabled = asset.enabled !== false;
                return (
                  <div className="table-row" key={asset.id}>
                    <span title={`${asset.name}\n${asset.preview}`}>
                      <strong>{asset.name}</strong>
                      <small>{asset.preview}</small>
                    </span>
                    <span title={`${category}知识库`}>{category}</span>
                    <span className="knowledge-file-meta" title={getKnowledgeFileTypeLabel(asset)}>
                      <em>{getKnowledgeFileTypeLabel(asset)}</em>
                      <small>{asset.sizeLabel}</small>
                    </span>
                    <span>{asset.uploadedBy || props.adminName || "平台管理员"}</span>
                    <span>{formatSubmittedAt(asset.uploadedAt)}</span>
                    <span>
                      <em className={`knowledge-status ${enabled ? "enabled" : "disabled"}`}>{enabled ? "已启用" : "未启用"}</em>
                    </span>
                    <span className="knowledge-actions">
                      <button type="button" onClick={() => setAdminKnowledgePreviewId(asset.id)}>
                        <FileText size={14} />
                        查看
                      </button>
                      <button type="button" onClick={() => props.onToggleKnowledge(asset.id)}>
                        {enabled ? "停用" : "启用"}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => {
                          if (adminKnowledgePreviewId === asset.id) setAdminKnowledgePreviewId(null);
                          props.onDeleteKnowledge(asset.id);
                        }}
                      >
                        删除
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {adminTab === "prompts" && (
        <div className="admin-page" key="admin-prompts">
          <div className="teacher-module-panel teacher-prompt-manager">
            <div className="panel-title">
              <div>
                <span className="eyebrow">管理端</span>
                <h3>专家提示词管理</h3>
              </div>
            </div>
            <section className="custom-expert-create-panel">
              <div className="custom-expert-create-copy">
                <span className="eyebrow">新增专家</span>
                <h4>自定义专家配置</h4>
                <p>新增后同步到学生端专家选择；管理端负责配置知识库调用范围、系统提示词和组装规则。</p>
              </div>
              <label>
                <span>专家名称</span>
                <input value={adminNewExpertName} onChange={(event) => setAdminNewExpertName(event.target.value)} placeholder="如：财务测算专家" />
              </label>
              <label>
                <span>专家定位</span>
                <input value={adminNewExpertRole} onChange={(event) => setAdminNewExpertRole(event.target.value)} placeholder="说明这个专家主要解决什么问题" />
              </label>
              <label>
                <span>适用场景</span>
                <input value={adminNewExpertScenario} onChange={(event) => setAdminNewExpertScenario(event.target.value)} placeholder="如：成本测算、收入模型、单元经济性" />
              </label>
              <div className="custom-expert-create-actions">
                <button className="primary-button" type="button" onClick={handleAdminCreateCustomExpert}>
                  <Sparkles size={16} />
                  新增专家
                </button>
                <button className="ghost-button expert-skill-upload-button" type="button" onClick={() => setIsAdminSkillFolderGuideOpen(true)}>
                  <Upload size={16} />
                  上传 Skill 文件夹
                </button>
              </div>
              <input
                ref={(node) => {
                  adminExpertSkillFolderUploadInputRef.current = node;
                  configureFolderUploadInput(node);
                }}
                className="visually-hidden-input"
                type="file"
                multiple
                onChange={(event) => {
                  void handleAdminUploadExpertSkillFolder(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </section>
            <div className="prompt-control-panel teacher-prompt-controls">
              <div>
                <label className="field-label" htmlFor="admin-prompt-expert">
                  专家
                </label>
                <PrettySelect
                  value={promptExpert.id}
                  ariaLabel="选择提示词专家"
                  options={experts.map((expert) => ({ value: expert.id, label: expert.name }))}
                  onChange={(value) => {
                    const nextExpert = experts.find((item) => item.id === value) || experts[0];
                          const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
                    const nextParts = buildPromptTemplateParts(nextExpert, promptMode, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
                    setPromptExpertId(nextExpert.id);
                    setAdminSystemPromptDraft(nextParts.system);
                    setAdminUserPromptDraft(nextParts.user);
                  }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="admin-prompt-mode">
                  模式
                </label>
                <PrettySelect
                  value={promptMode}
                  ariaLabel="选择提示词模式"
                  options={modelModes.map((mode) => ({ value: mode, label: mode }))}
                  onChange={(nextMode) => {
                    const nextParts = buildPromptTemplateParts(
                      promptExpert,
                      nextMode,
                      props.knowledgeUploads,
                      props.knowledgeBaseStates,
                      adminPromptKnowledgeCategories,
                    );
                    setPromptMode(nextMode);
                    setAdminSystemPromptDraft(nextParts.system);
                    setAdminUserPromptDraft(nextParts.user);
                  }}
                />
              </div>
              <div className="prompt-action-group">
                <button className="primary-button prompt-save-button" type="button" onClick={() => setIsPromptSaveOpen(true)}>
                  <Save size={15} />
                  保存提示词
                </button>
                {experts.length > 1 && (
                  <button
                    className="ghost-button danger prompt-delete-expert-button"
                    type="button"
                    onClick={() => setPendingDeleteExpertId(promptExpert.id)}
                  >
                    <Trash2 size={15} />
                    删除当前专家
                  </button>
                )}
              </div>
            </div>
            <section className="prompt-knowledge-route teacher-prompt-route">
              <div>
                <strong>当前专家调用知识库目录</strong>
                <span>已选择 {adminPromptKnowledgeCategories.length} 个目录 · 已启用资料 {enabledKnowledgeCount} 个</span>
              </div>
              <div className="prompt-knowledge-options">
                {getActiveKnowledgeCatalog(props.knowledgeCatalog).map((base) => {
                  const selected = adminPromptKnowledgeCategories.includes(base.category);
                  const enabled = props.knowledgeBaseStates[base.category];
                  return (
                    <label className={`${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`} key={base.category}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleAdminPromptKnowledgeToggle(base.category)}
                      />
                      <span>{base.category}知识库</span>
                      <em>{enabled ? "目录开放" : "目录停用"}</em>
                      <small>{base.usedBy}</small>
                    </label>
                  );
                })}
              </div>
              <p>教师端和管理端共用同一套专家知识库目录配置；修改后会同步影响当前专家的系统提示词与用户输入组装规则。</p>
            </section>
            <section className="prompt-content-grid teacher-prompt-grid">
              <article>
                <span className="eyebrow">系统规则</span>
                <h3>系统提示词</h3>
                <p>定义专家角色、知识库引用规则、模式策略和输出边界。</p>
                <textarea
                  className="teacher-prompt-textarea"
                  placeholder={expertPromptContent}
                  value={adminSystemPromptDraft}
                  onChange={(event) => setAdminSystemPromptDraft(event.target.value)}
                />
              </article>
              <article>
                <span className="eyebrow">任务模板</span>
                <h3>用户输入组装规则</h3>
                <p>定义学生输入、历史上下文、上传文件、知识库资料和专家技能如何拼接。</p>
                <textarea
                  className="teacher-prompt-textarea"
                  placeholder={expertPromptUserTemplate}
                  value={adminUserPromptDraft}
                  onChange={(event) => setAdminUserPromptDraft(event.target.value)}
                />
              </article>
            </section>
          </div>
        </div>
      )}

      {adminTab === "evaluation" && (
        <div className="admin-page" key="admin-evaluation">
          <div className="panel-title compact">
            <div>
              <h3>试点运营评估</h3>
            </div>
          </div>
          <div className="effect-grid">
            {effectRows.map(([name, value, target, detail]) => (
              <article key={name}>
                <strong>{value}</strong>
                <span>{name}</span>
                <em>{target}</em>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <div className="ai-evaluation-panel">
            <ResultPanel result={aiEvaluationBlocks} expertId="business" />
          </div>
          <div className="evaluation-review-board">
            <div className="evaluation-review-heading">
              <span className="eyebrow">运营复盘</span>
              <h4>试点运行补充说明</h4>
              <p>围绕学生成果质量、教师审核闭环和正式试点准备度，补充管理端可汇报的过程性内容。</p>
            </div>
            <div className="evaluation-review-grid">
              {evaluationReviewBlocks.map((block) => (
                <section key={block.title} className="evaluation-review-card">
                  <header>
                    <strong>{block.title}</strong>
                    <span>{block.tag}</span>
                  </header>
                  <ul>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="evaluation-evidence-strip">
              {evaluationEvidenceRows.map(([name, value, detail]) => (
                <article key={name}>
                  <strong>{value}</strong>
                  <span>{name}</span>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      {adminKnowledgePreviewAsset && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal knowledge-detail-modal" role="dialog" aria-modal="true" aria-label="资料详情">
            <header>
              <div>
                <span className="eyebrow">资料详情</span>
                <h3>{adminKnowledgePreviewAsset.name}</h3>
                <p>{adminKnowledgePreviewAsset.preview}</p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setAdminKnowledgePreviewId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="review-detail-body">
              <section className="detail-card review-summary-card">
                <dl>
                  <div>
                    <dt>所属知识库</dt>
                    <dd>{adminKnowledgePreviewAsset.category || inferKnowledgeCategory(adminKnowledgePreviewAsset.name)}</dd>
                  </div>
                  <div>
                    <dt>文件类型</dt>
                    <dd>{getKnowledgeFileTypeLabel(adminKnowledgePreviewAsset)}</dd>
                  </div>
                  <div>
                    <dt>文件大小</dt>
                    <dd>{adminKnowledgePreviewAsset.sizeLabel}</dd>
                  </div>
                  <div>
                    <dt>上传人</dt>
                    <dd>{adminKnowledgePreviewAsset.uploadedBy || props.adminName || "平台管理员"}</dd>
                  </div>
                  <div>
                    <dt>是否启用</dt>
                    <dd>{adminKnowledgePreviewAsset.enabled === false ? "未启用" : "已启用"}</dd>
                  </div>
                  <div>
                    <dt>上传时间</dt>
                    <dd>{formatSubmittedAt(adminKnowledgePreviewAsset.uploadedAt)}</dd>
                  </div>
                </dl>
              </section>
              <section className="detail-card">
                <span className="eyebrow">资料预览</span>
                <p>{adminKnowledgePreviewAsset.preview}</p>
                <div className="teacher-file-actions">
                  <button type="button" onClick={() => downloadKnowledgeAsset(adminKnowledgePreviewAsset)}>
                    <Download size={15} />
                    {adminKnowledgePreviewAsset.fileDataUrl ? "下载原文件" : "下载资料说明"}
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {adminKnowledgeBasePreviewItem && (
        <KnowledgeBaseDetailModal
          item={adminKnowledgeBasePreviewItem}
          uploads={props.knowledgeUploads}
          enabled={props.knowledgeBaseStates[adminKnowledgeBasePreviewItem.category] !== false}
          actorLabel="管理端维护"
          onClose={() => setAdminKnowledgeBasePreviewCategory(null)}
          onToggle={() => handleAdminToggleKnowledgeBaseState(adminKnowledgeBasePreviewItem.category)}
          onDelete={() => {
            setAdminKnowledgeBasePreviewCategory(null);
            props.onDeleteKnowledgeBase(adminKnowledgeBasePreviewItem.category);
          }}
        />
      )}
      {knowledgeSaveMessage && <PromptSaveSuccessModal message={knowledgeSaveMessage} onClose={() => setKnowledgeSaveMessage(null)} />}
      </div>
      {pendingDeleteExpert && (
        <ExpertDeleteConfirmModal
          expert={pendingDeleteExpert}
          onCancel={() => setPendingDeleteExpertId(null)}
          onConfirm={confirmAdminDeleteExpert}
        />
      )}
      {isPromptSaveOpen && <PromptSaveSuccessModal onClose={() => setIsPromptSaveOpen(false)} />}
      {isAdminSkillFolderGuideOpen && (
        <SkillFolderUploadGuideModal
          actorLabel="管理端"
          onCancel={() => setIsAdminSkillFolderGuideOpen(false)}
          onConfirm={() => {
            setIsAdminSkillFolderGuideOpen(false);
            adminExpertSkillFolderUploadInputRef.current?.click();
          }}
        />
      )}
      {accountSaveMessage && <PromptSaveSuccessModal message={accountSaveMessage} onClose={() => setAccountSaveMessage(null)} />}
      {selectedKanbanProject && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal kanban-detail-modal" role="dialog" aria-modal="true" aria-label="项目进度详情">
            <header>
              <div>
                <span className="eyebrow">项目进度详情</span>
                <h3>{selectedKanbanProject.group.projectName}</h3>
                <p>
                  {selectedKanbanProject.group.label} · 当前阶段：{selectedKanbanProject.stageLabel} · 进度 {selectedKanbanProject.progress}%
                </p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setSelectedKanbanGroupId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="kanban-detail-body">
              <section className="kanban-detail-summary">
                {[
                  ["成员数", `${selectedKanbanProject.members.length || stableNumber(selectedKanbanProject.group.id, 4, 5)} 人`],
                  ["提交成果", `${selectedKanbanProject.submissions.length} 项`],
                  ["待审核", `${selectedKanbanProject.pending} 项`],
                  ["优秀成果", `${selectedKanbanProject.excellent} 项`],
                ].map(([label, value]) => (
                  <article key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </article>
                ))}
              </section>
              <section className="kanban-stage-timeline">
                {projectKanbanStages.map((stage, index) => (
                  <article className={index <= selectedKanbanProject.stageIndex ? "done" : ""} key={stage.label}>
                    <span>{index + 1}</span>
                    <strong>{stage.label}</strong>
                  </article>
                ))}
              </section>
              <section className="detail-card">
                <span className="eyebrow">阶段成果</span>
                <div className="review-blocks">
                  {selectedKanbanProject.submissions.length === 0 && (
                    <article>
                      <strong>暂无真实提交</strong>
                      <ul>
                        <li>该项目已进入演示看板，但还没有从学生端提交阶段成果。</li>
                        <li>可先在学生端生成 BP/PPT 后提交老师审核，看板会自动更新。</li>
                      </ul>
                    </article>
                  )}
                  {selectedKanbanProject.submissions.map((submission) => (
                    <article key={submission.id}>
                      <strong>{submission.artifactTitle}</strong>
                      <ul>
                        <li>
                          {artifactLabels[submission.artifactType]} · {statusLabels[submission.status]} · {formatSubmittedAt(submission.submittedAt)}
                        </li>
                        <li>{submission.teacherComment || submission.artifactSummary}</li>
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {selectedGroupDetail && (
        <div className="modal-backdrop animated-backdrop" role="presentation">
          <section className="media-modal group-detail-modal" role="dialog" aria-modal="true" aria-label="学生小组详情">
            <header>
              <div className="group-detail-head-copy">
                <span className="eyebrow">学生小组详情</span>
                {editingGroupId === selectedGroupDetail.group.id ? (
                  <input
                    className="group-detail-title-input"
                    value={groupEditDraft.projectName}
                    onChange={(event) => setGroupEditDraft((current) => ({ ...current, projectName: event.target.value }))}
                  />
                ) : (
                  <h3>{selectedGroupDetail.group.projectName}</h3>
                )}
                <p>
                  {selectedGroupDetail.group.label} · 当前阶段：{selectedGroupDetail.stageLabel} · 进度 {selectedGroupDetail.progress}%
                </p>
              </div>
              <div className="group-detail-head-actions">
                {editingGroupId === selectedGroupDetail.group.id ? (
                  <>
                    <button className="ghost-button" type="button" onClick={() => setEditingGroupId(null)}>
                      取消编辑
                    </button>
                    <button className="primary-button" type="button" onClick={() => handleSaveStudentGroup(selectedGroupDetail.group.id)}>
                      保存修改
                    </button>
                  </>
                ) : (
                  <button className="group-edit-trigger" type="button" onClick={() => openGroupEditor(selectedGroupDetail.group)}>
                    <PenLine size={15} />
                    编辑
                  </button>
                )}
                <button
                  className="modal-close-button"
                  type="button"
                  onClick={() => {
                    setEditingGroupId(null);
                    setSelectedGroupDetailId(null);
                  }}
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            {editingGroupId === selectedGroupDetail.group.id && (
              <section className="group-edit-card">
                <div className="group-edit-grid">
                  <label>
                    <span>小组编号</span>
                    <input
                      value={groupEditDraft.label}
                      onChange={(event) => setGroupEditDraft((current) => ({ ...current, label: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>小组名称</span>
                    <input
                      value={groupEditDraft.projectName}
                      onChange={(event) => setGroupEditDraft((current) => ({ ...current, projectName: event.target.value }))}
                    />
                  </label>
                </div>
              </section>
            )}
            <div className="group-detail-body">
              <section className="group-detail-summary">
                {[
                  ["成员数", `${selectedGroupDetail.members.length || stableNumber(selectedGroupDetail.group.id, 4, 5)} 人`],
                  ["提交成果", `${selectedGroupDetail.submissions.length} 项`],
                  ["待审核", `${selectedGroupDetail.pending} 项`],
                  ["优秀成果", `${selectedGroupDetail.excellent} 项`],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">MEMBERS</span>
                    <h4>小组成员</h4>
                  </div>
                </div>
                <div className="group-member-list">
                  {selectedGroupDetail.members.length === 0 && <span>当前还没有绑定学生账号。</span>}
                  {selectedGroupDetail.members.map((member) => (
                    <article key={member.id}>
                      <strong>{member.name}</strong>
                      <span>{member.account}</span>
                      <em>{member.quota} 次调用额度</em>
                    </article>
                  ))}
                </div>
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">PROGRESS</span>
                    <h4>阶段进度</h4>
                  </div>
                </div>
                <div className="kanban-stage-timeline compact">
                  {projectKanbanStages.map((stage, index) => (
                    <article className={index <= selectedGroupDetail.stageIndex ? "done" : ""} key={stage.label}>
                      <span>{index + 1}</span>
                      <strong>{stage.label}</strong>
                    </article>
                  ))}
                </div>
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">SUBMISSIONS</span>
                    <h4>近期成果</h4>
                  </div>
                </div>
                <div className="group-submission-list">
                  {selectedGroupDetail.submissions.length === 0 && <span>当前小组还没有提交审核成果。</span>}
                  {selectedGroupDetail.submissions.slice(0, 5).map((submission) => (
                    <article key={submission.id}>
                      <strong>{submission.artifactTitle}</strong>
                      <span>{artifactLabels[submission.artifactType]} · {statusLabels[submission.status]} · {formatSubmittedAt(submission.submittedAt)}</span>
                      <p>{submission.teacherComment || submission.artifactSummary}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {isAccountCreateOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal account-create-modal" role="dialog" aria-modal="true" aria-label="新建账号">
            <header>
              <div>
                <span className="eyebrow">账号权限管理</span>
                <h3>新建演示账号</h3>
                <p>选择角色后会自动带出默认权限，也可以手动调整账号、密码和配额。</p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setIsAccountCreateOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="account-create-form">
              <label>
                <span>账号角色</span>
                <PrettySelect
                  value={newAccountRole}
                  ariaLabel="选择账号角色"
                  options={[
                    { value: "student", label: "学生端" },
                    { value: "teacher", label: "教师端" },
                    { value: "admin", label: "管理端" },
                  ]}
                  onChange={(nextRole) => {
                    setNewAccountRole(nextRole);
                    setNewAccountQuota(String(getDefaultQuota(nextRole)));
                    if (nextRole === "student" && !newAccountGroupId) {
                      setNewAccountGroupId(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
                    }
                  }}
                />
              </label>
              <label>
                <span>姓名</span>
                <input value={newAccountName} onChange={(event) => setNewAccountName(event.target.value)} placeholder="输入姓名，留空则自动生成" />
              </label>
              <label>
                <span>登录账号</span>
                <input value={newAccountLogin} onChange={(event) => setNewAccountLogin(event.target.value)} placeholder="输入登录账号，留空则自动生成" />
              </label>
              <label>
                <span>演示密码</span>
                <input value={newAccountPassword} onChange={(event) => setNewAccountPassword(event.target.value)} placeholder="默认 123456" />
              </label>
              <label>
                <span>调用配额</span>
                <input
                  min="0"
                  type="number"
                  value={newAccountQuota}
                  onChange={(event) => setNewAccountQuota(event.target.value)}
                  placeholder="输入调用配额"
                />
              </label>
              {newAccountRole === "student" && (
                <label>
                  <span>所属项目小组</span>
                  <PrettySelect
                    value={newAccountGroupId}
                    ariaLabel="选择所属项目小组"
                    options={props.studentGroups.map((group) => ({ value: group.id, label: formatGroupScope(group) }))}
                    onChange={(value) => setNewAccountGroupId(value)}
                  />
                </label>
              )}
              <div className="account-create-permissions">
                <span>{newAccountRole === "student" ? "默认可用专家" : "默认权限"}</span>
                <strong>{getDefaultPermissions(newAccountRole).join("、")}</strong>
              </div>
            </div>
            <footer className="context-actions">
              <button className="ghost-button" type="button" onClick={() => setIsAccountCreateOpen(false)}>
                取消
              </button>
              <button className="primary-button" type="button" onClick={handleCreateAccount}>
                <Save size={16} />
                开通账号
              </button>
            </footer>
          </section>
        </div>
      )}
      {accountDetail && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal account-detail-modal" role="dialog" aria-modal="true" aria-label="账号详情">
            <header>
              <div>
                <span className="eyebrow">账号权限详情</span>
                <h3>{accountDetail.name}</h3>
                <p>
                  {accountDetail.groupOrScope} · {accountDetail.role === "student" ? "学生端" : accountDetail.role === "teacher" ? "教师端" : "管理端"}
                </p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setAccountDetailId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="account-modal-body">
              <section className="account-detail-summary">
                <div className="account-avatar">{accountDetail.name.slice(0, 1)}</div>
                <div>
                  <span>当前账号</span>
                  <strong>{accountDetail.account}</strong>
                  <p>{accountDetail.groupOrScope}</p>
                </div>
                <div className="account-summary-metrics">
                  <article>
                    <span>角色端口</span>
                    <strong>{accountDetail.role === "student" ? "学生端" : accountDetail.role === "teacher" ? "教师端" : "管理端"}</strong>
                  </article>
                  <article>
                    <span>调用配额</span>
                    <strong>{accountEditDraft.quota || accountDetail.quota}</strong>
                  </article>
                  <article>
                    <span>账号状态</span>
                    <strong className={accountDetail.status === "已开通" ? "enabled" : "disabled"}>{accountDetail.status}</strong>
                  </article>
                </div>
              </section>
              <div className="account-edit-grid">
                <label>
                  <span>姓名</span>
                  <input
                    value={accountEditDraft.name}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>登录账号</span>
                  <input
                    value={accountEditDraft.account}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, account: event.target.value }))}
                  />
                </label>
                <label>
                  <span>演示密码</span>
                  <input
                    value={accountEditDraft.password}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <label>
                  <span>调用配额</span>
                  <input
                    min="0"
                    type="number"
                    value={accountEditDraft.quota}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, quota: event.target.value }))}
                  />
                </label>
                {accountDetail.role === "student" && (
                  <label>
                    <span>所属项目小组</span>
                    <PrettySelect
                      value={accountEditDraft.groupId || accountDetail.groupId || ""}
                      ariaLabel="选择所属项目小组"
                      options={props.studentGroups.map((group) => ({ value: group.id, label: formatGroupScope(group) }))}
                      onChange={(value) => setAccountEditDraft((current) => ({ ...current, groupId: value }))}
                    />
                  </label>
                )}
              </div>
              <div className="account-permission-detail">
                <strong className="account-permission-title">{accountDetail.role === "student" ? "可用专家" : "权限范围"}</strong>
                {(accountDetail.role === "student" ? getStudentExpertPermissionNames() : accountDetail.permissions).map((permission) => {
                  const permissionEnabled = isPermissionEnabled(accountDetail, permission);
                  return (
                    <article className={permissionEnabled ? "enabled" : "disabled"} key={permission}>
                      <div>
                        <strong>{permission}</strong>
                        <p>{getPermissionDescription(permission, accountDetail.role)}</p>
                      </div>
                      <button
                        className={`account-status-toggle ${permissionEnabled ? "enabled" : "disabled"}`}
                        type="button"
                        onClick={() => handleToggleAccountPermission(accountDetail.id, permission)}
                      >
                        {permissionEnabled ? "已启用" : "已停用"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
            <footer className="context-actions">
              <button className="primary-button" type="button" onClick={handleSaveAccountDetail}>
                <Save size={16} />
                保存修改
              </button>
              <button
                className={`account-status-toggle ${accountDetail.status === "已开通" ? "enabled" : "disabled"}`}
                type="button"
                onClick={() => handleToggleAccountStatus(accountDetail.id)}
              >
                {accountDetail.status}
              </button>
              <button className="ghost-button danger" type="button" onClick={() => handleDeleteAccount(accountDetail.id)}>
                删除账号
              </button>
            </footer>
          </section>
        </div>
      )}
      {pendingDeleteGroup && (
        <AdminDeleteConfirmModal
          eyebrow="删除项目小组"
          title={`确认删除“${pendingDeleteGroup.label} / ${pendingDeleteGroup.projectName}”？`}
          description="删除后，该项目小组会从管理端小组列表和新建账号的小组选择中移除。"
          primary={pendingDeleteGroup.projectName}
          detail={`${pendingDeleteGroup.label} · 当前 0 名学生`}
          onCancel={() => setPendingDeleteGroupId(null)}
          onConfirm={handleConfirmDeleteStudentGroup}
        />
      )}
      {pendingDeleteAccount && (
        <AdminDeleteConfirmModal
          eyebrow="删除账号"
          title={`确认删除账号“${pendingDeleteAccount.account}”？`}
          description="删除后，该账号会从账号权限管理列表中移除，当前 Demo 不再显示该账号。"
          primary={pendingDeleteAccount.name}
          detail={`${pendingDeleteAccount.role === "student" ? "学生端" : pendingDeleteAccount.role === "teacher" ? "教师端" : "管理端"} · ${pendingDeleteAccount.groupOrScope}`}
          onCancel={() => setPendingDeleteAccountId(null)}
          onConfirm={handleConfirmDeleteAccount}
        />
      )}
    </section>
  );
}

function AdminDeleteConfirmModal(props: {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  detail: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal admin-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title">
        <header>
          <div>
            <span className="eyebrow">{props.eyebrow}</span>
            <h3 id="admin-delete-title">{props.title}</h3>
            <p>{props.description}</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.primary}</strong>
          <p>该操作只影响当前演示数据，正式版会同步写入账号与项目组管理后台。</p>
          <span>{props.detail}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default App;

