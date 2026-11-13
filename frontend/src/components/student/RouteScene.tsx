import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';

export type RouteSceneVariant = 'splash' | 'hero';

interface RouteSceneProps {
  variant?: RouteSceneVariant;
  className?: string;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

/** Deterministic PRNG keeps the firefly field stable between renders. */
function seeded(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const HILLS: Array<{
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation: [number, number, number];
}> = [
  {
    position: [-4.6, -0.55, -4.8],
    scale: [2.5, 1.45, 1.9],
    color: '#12362d',
    rotation: [0.1, 0.4, -0.05],
  },
  {
    position: [-1.8, -0.65, -5.7],
    scale: [3.1, 1.2, 2.1],
    color: '#153e33',
    rotation: [0, 0.9, 0.1],
  },
  {
    position: [2.3, -0.6, -5.2],
    scale: [2.2, 1.55, 1.7],
    color: '#18473a',
    rotation: [0.2, 0.2, -0.08],
  },
  {
    position: [5.0, -0.7, -3.8],
    scale: [1.8, 1.0, 1.5],
    color: '#143d33',
    rotation: [0, 1.2, 0.06],
  },
  {
    position: [-5.4, -0.78, -1.8],
    scale: [1.5, 0.72, 1.3],
    color: '#1a5344',
    rotation: [0.15, 0.5, 0.02],
  },
  {
    position: [5.8, -0.82, -1.2],
    scale: [1.7, 0.58, 1.4],
    color: '#1d5b4a',
    rotation: [0, 0.8, -0.04],
  },
];

const SHRUBS: Array<[number, number, number, number]> = [
  [-3.2, -0.65, 1.75, 0.28],
  [-2.1, -0.68, 2.0, 0.2],
  [-1.0, -0.66, 1.62, 0.16],
  [0.8, -0.67, 1.9, 0.24],
  [2.0, -0.65, 1.7, 0.18],
  [2.9, -0.66, 2.05, 0.26],
  [-2.7, -0.68, 2.35, 0.14],
];

function RouteGeometry({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const road = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.19, 8, false), [curve]);
  const glow = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.026, 5, false), [curve]);
  const markers = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => ({
        point: curve.getPointAt(0.06 + index * 0.085),
        key: `route-marker-${index}`,
      })),
    [curve],
  );

  return (
    <group>
      <mesh geometry={road}>
        <meshStandardMaterial color="#123D34" roughness={0.86} metalness={0.02} />
      </mesh>
      <mesh geometry={glow}>
        <meshStandardMaterial
          color="#6EE7C7"
          emissive="#6EE7C7"
          emissiveIntensity={2.1}
          toneMapped={false}
        />
      </mesh>
      {markers.map(({ point, key }) => (
        <mesh key={key} position={[point.x, point.y + 0.02, point.z]}>
          <sphereGeometry args={[0.027, 8, 8]} />
          <meshBasicMaterial color="#F5B942" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Bus({ curve, reduced }: { curve: THREE.CatmullRomCurve3; reduced: boolean }) {
  const bus = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!bus.current) return;
    const elapsed = clock.getElapsedTime();
    const t = reduced ? 0.47 : (0.06 + elapsed * 0.032) % 0.9;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const bob = reduced ? 0 : Math.sin(elapsed * 2.4) * 0.014;

    bus.current.position.set(point.x, point.y + 0.012 + bob, point.z);
    bus.current.rotation.y = Math.atan2(-tangent.z, tangent.x);
  });

  return (
    <group ref={bus} scale={1.08}>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[1.02, 0.44, 0.44]} />
        <meshStandardMaterial color="#ECF7EC" roughness={0.36} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.86, 0.05, 0.42]} />
        <meshStandardMaterial color="#D6EFE2" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.025, 0.09, 0.445]} />
        <meshStandardMaterial color="#0F766E" roughness={0.35} metalness={0.12} />
      </mesh>

      <mesh position={[0.02, 0.405, 0.226]}>
        <boxGeometry args={[0.7, 0.16, 0.012]} />
        <meshStandardMaterial
          color="#8FF0D5"
          emissive="#2DD4BF"
          emissiveIntensity={0.52}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[0.02, 0.405, -0.226]}>
        <boxGeometry args={[0.7, 0.16, 0.012]} />
        <meshStandardMaterial
          color="#8FF0D5"
          emissive="#2DD4BF"
          emissiveIntensity={0.52}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[0.513, 0.4, 0]}>
        <boxGeometry args={[0.012, 0.17, 0.31]} />
        <meshStandardMaterial
          color="#B7F7E4"
          emissive="#2DD4BF"
          emissiveIntensity={0.35}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0.523, 0.265, 0.145]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial
          color="#FFE1A3"
          emissive="#F5B942"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.523, 0.265, -0.145]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial
          color="#FFE1A3"
          emissive="#F5B942"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.518, 0.27, 0.15]}>
        <boxGeometry args={[0.012, 0.06, 0.07]} />
        <meshStandardMaterial
          color="#FF7A72"
          emissive="#EF4444"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.518, 0.27, -0.15]}>
        <boxGeometry args={[0.012, 0.06, 0.07]} />
        <meshStandardMaterial
          color="#FF7A72"
          emissive="#EF4444"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[-0.2, 0.545, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial
          color="#F5B942"
          emissive="#F5B942"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </mesh>

      {[-0.31, 0.31].flatMap((x) =>
        [-0.235, 0.235].map((z) => (
          <mesh key={`wheel-${x}-${z}`} position={[x, 0.1, z]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.115, 0.115, 0.075, 14]} />
            <meshStandardMaterial color="#07110F" roughness={0.9} />
          </mesh>
        )),
      )}

      <pointLight position={[0.7, 0.3, 0]} color="#F5B942" intensity={0.8} distance={2.2} />
    </group>
  );
}

function DestinationPin({ reduced }: { reduced: boolean }) {
  const pin = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reduced) return;
    const elapsed = clock.getElapsedTime();
    if (pin.current) {
      pin.current.position.y = 0.06 + Math.sin(elapsed * 1.6) * 0.055;
    }
    if (ring.current) {
      ring.current.scale.setScalar(1 + Math.sin(elapsed * 1.9) * 0.16);
      const material = ring.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.5 + Math.sin(elapsed * 1.9) * 0.2;
    }
  });

  return (
    <group position={[3.05, 0, 0.48]}>
      <group ref={pin}>
        <mesh position={[0, 0.52, 0]}>
          <sphereGeometry args={[0.145, 22, 22]} />
          <meshStandardMaterial
            color="#F5B942"
            emissive="#F5B942"
            emissiveIntensity={1.7}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.325, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.135, 0.32, 18]} />
          <meshStandardMaterial
            color="#F5B942"
            emissive="#F5B942"
            emissiveIntensity={1.7}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ring} position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.25, 0.014, 8, 32]} />
          <meshStandardMaterial
            color="#6EE7C7"
            emissive="#6EE7C7"
            emissiveIntensity={2}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
      </group>
      <pointLight position={[0, 0.45, 0]} color="#F5B942" intensity={1.1} distance={2.4} />
    </group>
  );
}

function Fireflies({ reduced }: { reduced: boolean }) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (seeded(index + 1) - 0.5) * 8.5;
      positions[index * 3 + 1] = seeded(index + 31) * 2.7 - 0.2;
      positions[index * 3 + 2] = (seeded(index + 67) - 0.5) * 5.4 - 0.4;
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useFrame(({ clock }) => {
    if (points.current && !reduced) {
      points.current.rotation.y = clock.getElapsedTime() * 0.012;
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        color="#A7F3D0"
        size={0.034}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CameraRig({ reduced, variant }: { reduced: boolean; variant: RouteSceneVariant }) {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);

  useEffect(() => {
    const portrait = aspect < 0.72;
    const z = variant === 'splash' ? (portrait ? 9 : 6.7) : 6.9;
    const y = variant === 'splash' ? (portrait ? 1.9 : 1.55) : 1.55;
    const lookX = variant === 'splash' && !portrait ? -0.55 : 0;
    camera.position.set(0, y, z);
    camera.lookAt(lookX, 0.16, 0);
  }, [aspect, camera, variant]);

  useFrame(({ camera: activeCamera, clock }) => {
    if (reduced) return;
    const elapsed = clock.getElapsedTime();
    const portrait = aspect < 0.72;
    const baseY = variant === 'splash' ? (portrait ? 1.9 : 1.55) : 1.55;
    const lookX = variant === 'splash' && !portrait ? -0.55 : 0;
    activeCamera.position.x = Math.sin(elapsed * 0.12) * 0.09;
    activeCamera.position.y = baseY + Math.sin(elapsed * 0.16) * 0.035;
    activeCamera.lookAt(lookX, 0.16, 0);
  });

  return null;
}

function World({ reduced, variant }: { reduced: boolean; variant: RouteSceneVariant }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.5, -0.7, 1.0),
        new THREE.Vector3(-2.25, -0.68, 0.55),
        new THREE.Vector3(-0.8, -0.66, 0.18),
        new THREE.Vector3(0.75, -0.66, 0.28),
        new THREE.Vector3(1.9, -0.68, 0.8),
        new THREE.Vector3(2.8, -0.66, 0.55),
      ]),
    [],
  );

  return (
    <>
      <fog attach="fog" args={['#0a2a23', 7.5, 19]} />
      <ambientLight intensity={0.9} color="#cdf7e7" />
      <directionalLight position={[4.5, 6, 4]} intensity={2.9} color="#ffe2b5" />
      <directionalLight position={[-5, 2.5, -2]} intensity={1.45} color="#2ad9b6" />
      <directionalLight position={[0, 3, 6]} intensity={0.55} color="#9ff5dc" />

      <mesh position={[-2.6, 2.15, -6.4]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color="#F5B942" transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <mesh position={[-2.6, 2.15, -6.35]}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color="#FFD37A" transparent opacity={0.88} toneMapped={false} />
      </mesh>

      <mesh position={[0, -0.76, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[34, 24]} />
        <meshStandardMaterial color="#0c3027" roughness={1} />
      </mesh>

      {HILLS.map((hill, index) => (
        <mesh
          key={`hill-${index}`}
          position={hill.position}
          scale={hill.scale}
          rotation={hill.rotation}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={hill.color} roughness={0.95} flatShading />
        </mesh>
      ))}

      {SHRUBS.map(([x, y, z, scale], index) => (
        <mesh key={`shrub-${index}`} position={[x, y, z]} scale={scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1d6250" roughness={0.9} flatShading />
        </mesh>
      ))}

      <RouteGeometry curve={curve} />
      <Bus curve={curve} reduced={reduced} />
      <DestinationPin reduced={reduced} />
      <Fireflies reduced={reduced} />
      <CameraRig reduced={reduced} variant={variant} />
    </>
  );
}

function StaticSceneFallback() {
  return (
    <svg
      className="route-scene__fallback"
      viewBox="0 0 800 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#071D19" />
          <stop offset="1" stopColor="#0B2E26" />
        </linearGradient>
      </defs>
      <rect width="800" height="420" fill="url(#scene-sky)" />
      <circle cx="180" cy="120" r="38" fill="#F5B942" opacity="0.9" />
      <path d="M-50 300 L150 170 L340 300 Z" fill="#0B2E26" />
      <path d="M240 310 L470 140 L720 310 Z" fill="#0A2822" />
      <path d="M540 310 L690 200 L900 310 Z" fill="#0D352C" />
      <path d="M0 316 C180 286 260 330 440 312 C580 298 680 320 800 302 L800 420 L0 420Z" fill="#08261F" />
      <path
        d="M0 356 C160 330 300 350 430 340 C560 330 700 346 800 330"
        fill="none"
        stroke="#123D34"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M0 356 C160 330 300 350 430 340 C560 330 700 346 800 330"
        fill="none"
        stroke="#6EE7C7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 16"
      />
      <g transform="translate(360 315)">
        <rect x="0" y="0" width="74" height="34" rx="8" fill="#ECF7EC" />
        <rect x="2" y="10" width="70" height="8" fill="#0F766E" />
        <rect x="12" y="5" width="40" height="8" rx="2" fill="#8FF0D5" />
        <circle cx="16" cy="36" r="7" fill="#07110F" />
        <circle cx="58" cy="36" r="7" fill="#07110F" />
      </g>
      <g transform="translate(645 250)">
        <circle cx="0" cy="0" r="16" fill="#F5B942" />
        <path d="M-13 12 L0 40 L13 12 Z" fill="#F5B942" />
        <circle cx="0" cy="0" r="5" fill="#07201C" />
      </g>
    </svg>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Decorative three.js valley: a school van follows a glowing route to an amber
 * destination pin. Fully aria-hidden; all meaning is repeated in the HTML.
 */
export function RouteScene({ variant = 'hero', className = '' }: RouteSceneProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className={`route-scene route-scene--${variant} ${className}`.trim()} aria-hidden="true">
      <div className="route-scene__wash" />
      <SceneBoundary fallback={<StaticSceneFallback />}>
        <Suspense fallback={<StaticSceneFallback />}>
          <Canvas
            className="route-scene__canvas"
            dpr={[1, 1.7]}
            frameloop={reduced ? 'demand' : 'always'}
            camera={{ position: [0, 1.75, 7.4], fov: 42, near: 0.1, far: 50 }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          >
            <World reduced={reduced} variant={variant} />
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <div className="route-scene__grain" />
    </div>
  );
}
