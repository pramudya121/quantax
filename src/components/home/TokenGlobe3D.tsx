import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useChainId } from 'wagmi';
import { getTokenList } from '@/config/contracts';

/**
 * 3D Token Globe
 * Central glowing sphere with multiple crossing orbit rings.
 * Each orbit carries a token logo (HTML billboard) that travels along it.
 */

interface OrbitDef {
  radius: number;
  /** Euler tilt in radians for the orbit plane */
  tilt: [number, number, number];
  color: string;
  speed: number;
  phase: number;
  symbols: string[]; // tokens that ride this orbit
}

const ORBITS: OrbitDef[] = [
  { radius: 2.2, tilt: [0, 0, 0],                        color: '#ff3b3b', speed: 0.45, phase: 0,       symbols: ['QMS', 'QTX'] },
  { radius: 2.6, tilt: [Math.PI / 3, 0, Math.PI / 6],    color: '#ff7a45', speed: 0.32, phase: 1.1,     symbols: ['ETH'] },
  { radius: 3.0, tilt: [-Math.PI / 4, Math.PI / 5, 0],   color: '#a855f7', speed: 0.28, phase: 2.3,     symbols: ['BNB', 'MON'] },
  { radius: 3.4, tilt: [Math.PI / 2.2, Math.PI / 3, 0],  color: '#22d3ee', speed: 0.22, phase: 0.6,     symbols: ['HYPE'] },
  { radius: 3.8, tilt: [Math.PI / 2.8, -Math.PI / 4, Math.PI / 2], color: '#facc15', speed: 0.18, phase: 1.7, symbols: ['WQMS'] },
];

function OrbitRing({ radius, tilt, color }: Pick<OrbitDef, 'radius' | 'tilt' | 'color'>) {
  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.012, 16, 200]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {/* soft glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.04, 12, 160]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function TokenOnOrbit({
  radius,
  tilt,
  speed,
  phase,
  logoURI,
  symbol,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  phase: number;
  logoURI: string;
  symbol: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // Build rotation matrix once
  const matrix = useMemo(() => {
    const e = new THREE.Euler(tilt[0], tilt[1], tilt[2]);
    return new THREE.Matrix4().makeRotationFromEuler(e);
  }, [tilt]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    tmp.set(Math.cos(t) * radius, 0, Math.sin(t) * radius);
    tmp.applyMatrix4(matrix);
    if (groupRef.current) {
      groupRef.current.position.copy(tmp);
    }
  });

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={8} zIndexRange={[10, 0]}>
        <div
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shadow-[0_0_18px_rgba(255,255,255,0.35)] bg-black/60 backdrop-blur-sm"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <img
            src={logoURI}
            alt={symbol}
            className="w-full h-full object-cover"
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </div>
      </Html>
    </group>
  );
}

function GlobeCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.08;
      wireRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
      {/* Inner glowing core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.3, 64, 64]} />
        <meshStandardMaterial
          color="#1a0303"
          emissive="#ff1f1f"
          emissiveIntensity={0.6}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>
      {/* Wireframe shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.55, 2]} />
        <meshBasicMaterial color="#ff4d4d" wireframe transparent opacity={0.35} />
      </mesh>
      {/* Outer atmosphere */}
      <mesh>
        <sphereGeometry args={[1.75, 32, 32]} />
        <meshBasicMaterial color="#ff1f1f" transparent opacity={0.06} />
      </mesh>
    </Float>
  );
}

function GlobeScene() {
  const tokenList = getTokenList(useChainId());
  const systemRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (systemRef.current) systemRef.current.rotation.y += delta * 0.06;
  });

  const orbiters = useMemo(() => {
    const items: Array<{
      key: string;
      radius: number;
      tilt: [number, number, number];
      speed: number;
      phase: number;
      logoURI: string;
      symbol: string;
    }> = [];
    ORBITS.forEach((o, oi) => {
      o.symbols.forEach((sym, si) => {
        const tok = tokenList.find((t) => t.symbol === sym);
        if (!tok) return;
        items.push({
          key: `${sym}-${oi}-${si}`,
          radius: o.radius,
          tilt: o.tilt,
          speed: o.speed,
          phase: o.phase + (si * (Math.PI * 2)) / Math.max(1, o.symbols.length),
          logoURI: tok.logoURI,
          symbol: sym,
        });
      });
    });
    return items;
  }, [tokenList]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[8, 6, 8]} intensity={2.2} color="#ff5050" />
      <pointLight position={[-6, -4, -6]} intensity={1.4} color="#7a3bff" />

      {/* Stars removed — page background already provides starfield */}

      <group ref={systemRef}>
        <GlobeCore />
        {ORBITS.map((o, i) => (
          <OrbitRing key={`ring-${i}`} radius={o.radius} tilt={o.tilt} color={o.color} />
        ))}
        {orbiters.map((o) => (
          <TokenOnOrbit
            key={o.key}
            radius={o.radius}
            tilt={o.tilt}
            speed={o.speed}
            phase={o.phase}
            logoURI={o.logoURI}
            symbol={o.symbol}
          />
        ))}
      </group>
    </>
  );
}

export function TokenGlobe3D({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full ${className}`} style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 1.5, 8.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ background: 'transparent', display: 'block' }}
      >
        <Suspense fallback={null}>
          <GlobeScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
