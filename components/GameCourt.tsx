'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useApexStore } from '@/store/apex-store';
import { ATHLETES } from '@/lib/game-engine';
import { GameEngine } from '@/lib/game-engine';

const COURT_W = 9.4, COURT_H = 5.0;  // NBA court proportions (scaled)

export default function GameCourt({ engineRef }: { engineRef: React.MutableRefObject<GameEngine | null> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarsRef  = useRef<Map<string, THREE.Mesh>>(new Map());
  const ballRef     = useRef<THREE.Mesh | null>(null);
  const { athletes, isLive } = useApexStore();

  useEffect(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // ── Scene ───────────────────────────────────────────────
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.Fog(0x050810, 20, 50);

    // ── Camera (Isometric) ──────────────────────────────────
    const aspect  = W / H;
    const frustum = 7;
    const camera  = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 100
    );
    camera.position.set(8, 10, 8);
    camera.lookAt(0, 0, 0);

    // ── Renderer ─────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Lighting ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a2340, 2.5));
    const spotlight = new THREE.SpotLight(0x00d4ff, 3, 30, Math.PI / 4);
    spotlight.position.set(0, 12, 0);
    spotlight.castShadow = true;
    scene.add(spotlight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 8, 5);
    scene.add(fillLight);

    // ── Court Floor ───────────────────────────────────────────
    const floorGeo  = new THREE.BoxGeometry(COURT_W, 0.1, COURT_H);
    const floorMat  = new THREE.MeshLambertMaterial({ color: 0x0d1a2a });
    const floor     = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    // Court lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f });
    const courtOutline = new THREE.EdgesGeometry(new THREE.BoxGeometry(COURT_W - 0.2, 0.01, COURT_H - 0.2));
    scene.add(new THREE.LineSegments(courtOutline, lineMat));

    // Center circle
    const circlePoints = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 1.2, 0.06, Math.sin(a) * 1.2);
    });
    const circleLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(circlePoints),
      new THREE.LineBasicMaterial({ color: 0x00d4ff, opacity: 0.4, transparent: true })
    );
    scene.add(circleLine);

    // Hoops
    [-COURT_W / 2 + 0.8, COURT_W / 2 - 0.8].forEach(hx => {
      const hoopGeo = new THREE.TorusGeometry(0.45, 0.05, 8, 32);
      const hoopMat = new THREE.MeshLambertMaterial({ color: 0xf5a623 });
      const hoop = new THREE.Mesh(hoopGeo, hoopMat);
      hoop.position.set(hx, 1.0, 0);
      hoop.rotation.x = Math.PI / 2;
      scene.add(hoop);

      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3);
      const pole = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
      pole.position.set(hx * 1.12, 0.5, 0);
      scene.add(pole);
    });

    // ── Athlete Avatars ───────────────────────────────────────
    ATHLETES.forEach((config) => {
      const bodyGeo  = new THREE.CapsuleGeometry(0.22, 0.7, 4, 8);
      const bodyMat  = new THREE.MeshLambertMaterial({ color: new THREE.Color(config.color) });
      const avatar   = new THREE.Mesh(bodyGeo, bodyMat);
      avatar.castShadow = true;
      avatar.position.set(
        (config.id === 'jalani' || config.id === 'pharaoh') ? -2 : 2,
        0.65,
        config.id === 'jalani' || config.id === 'kyrie' ? -1.2 : 1.2
      );
      scene.add(avatar);
      avatarsRef.current.set(config.id, avatar);

      // Jersey number text (using a sprite for simplicity)
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = config.color;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${config.jerseyNumber}`, 32, 40);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite  = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.scale.set(0.6, 0.6, 0.6);
      sprite.position.set(0, 1.2, 0);
      avatar.add(sprite);
    });

    // ── Ball ──────────────────────────────────────────────────
    const ballGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xf56a00 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    ball.position.set(-2, 0.85, -1.2);
    scene.add(ball);
    ballRef.current = ball;

    // Grid overlay
    const grid = new THREE.GridHelper(COURT_W, 20, 0x0a1520, 0x0a1520);
    scene.add(grid);

    // ── Animation Loop ────────────────────────────────────────
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Sync avatar positions from game engine
      if (engineRef.current) {
        const playerStates = engineRef.current.getPlayerStates();
        const carrierId    = engineRef.current.getBallCarrierId();

        playerStates.forEach((ps, id) => {
          const mesh = avatarsRef.current.get(id);
          if (!mesh) return;
          // Map normalized court coords (0–1) to Three.js coords
          const tx = (ps.x - 0.5) * COURT_W;
          const tz = (ps.y - 0.5) * COURT_H;
          mesh.position.x += (tx - mesh.position.x) * 0.12;
          mesh.position.z += (tz - mesh.position.z) * 0.12;

          // Celebration bounce
          if (ps.celebrationTimer > 0) {
            mesh.position.y = 0.65 + Math.abs(Math.sin(Date.now() * 0.015)) * 0.4;
            mesh.rotation.y += 0.05;
          } else {
            mesh.position.y += (0.65 - mesh.position.y) * 0.2;
          }

          // Ball follows carrier
          if (id === carrierId && ballRef.current) {
            ballRef.current.position.x = mesh.position.x + 0.3;
            ballRef.current.position.z = mesh.position.z;
            ballRef.current.position.y = mesh.position.y - 0.1;
            ballRef.current.rotation.x += 0.05;
            ballRef.current.rotation.z += 0.05;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const W = mountRef.current.clientWidth;
      const H = mountRef.current.clientHeight;
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {/* Athlete Legend */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
        {ATHLETES.map(a => (
          <div key={a.id} className="flex items-center gap-2 text-xs font-mono">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
            <span style={{ color: a.color }}>{a.ticker}</span>
            <span className="text-terminal-muted">{a.name}</span>
          </div>
        ))}
      </div>
      {/* Isometric label */}
      <div className="absolute top-2 right-2 text-xs text-terminal-muted font-mono">
        ISO VIEW · 3D COURT
      </div>
    </div>
  );
}
