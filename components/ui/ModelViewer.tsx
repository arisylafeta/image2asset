'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  url: string;
  autoRotate?: boolean;
}

function Model({ url, autoRotate = true }: ModelProps) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (autoRotate && ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <Center>
      <group ref={ref}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#444" wireframe />
    </mesh>
  );
}

interface ModelViewerProps {
  url: string;
  className?: string;
  autoRotate?: boolean;
}

export function ModelViewer({
  url,
  className = '',
  autoRotate = true,
}: ModelViewerProps) {
  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Suspense fallback={<LoadingFallback />}>
          <Model url={url} autoRotate={autoRotate} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        Drag to rotate | Scroll to zoom
      </div>
    </div>
  );
}
