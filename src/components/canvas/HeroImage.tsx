"use client";

/// <reference types="@react-three/fiber" />
import * as THREE from "three";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";

const ImageShaderMaterial = {
  uniforms: {
    uTexture: { value: null as THREE.Texture | null },
    uDepthMap: { value: null as THREE.Texture | null },
    uAlphaMap: { value: null as THREE.Texture | null }, // NEW: Dedicated Alpha Map
    uMouse: { value: new THREE.Vector2(0, 0) },
    uThreshold: { value: new THREE.Vector2(0.1, 0.1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uDepthMap;
    uniform sampler2D uAlphaMap;
    uniform vec2 uMouse;
    uniform vec2 uThreshold;

    // how much UV margin to preserve so we never sample outside the texture
    uniform float uUvPadding; // e.g. 0.06

    void main() {
      // 1. THE OVERSCAN FIX: Zoom into the UVs slightly (1.1 = 10% zoom)
      // This pulls the edges of your headshot away from the edges of the plane,
      // creating a "safe zone" for the displacement to move into.
      float zoom = 1.1;
      vec2 pannedUv = (vUv - 0.5) / zoom + 0.5;

      // 2. Sample the color from the "zoomed" UVs
      vec4 texColor = texture2D(uTexture, pannedUv);
      
      // 3. DISCARD transparency BEFORE displacement
      if (texColor.a < 0.1) discard;

      // 4. Calculate depth and displacement
      float depth = texture2D(uDepthMap, pannedUv).r;
      vec2 displacement = uMouse * depth * uThreshold;
      
      // 5. Apply displacement to the already-panned UVs
      vec2 finalUv = pannedUv + displacement;

      // 6. Re-sample the texture for the final output
      gl_FragColor = texture2D(uTexture, finalUv);
    }

  `,
};

function Scene() {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  // Update these filenames to match your local public folder
  const [tex, depth, alpha] = useLoader(THREE.TextureLoader, [
    "/headshot.png", 
    "/headshot-depth-map.png",
    "/headshot-alpha-map.png" 
  ]);

  const uniforms = useMemo(() => {
    const u = THREE.UniformsUtils.clone(ImageShaderMaterial.uniforms);
    u.uTexture.value = tex;
    u.uDepthMap.value = depth;
    u.uAlphaMap.value = alpha;
    return u;
  }, [tex, depth, alpha]);

  useFrame((state) => {
    // Standardize mouse influence
    const targetX = state.mouse.x * 0.25;
    const targetY = state.mouse.y * 0.25;
    
    uniforms.uMouse.value.x = THREE.MathUtils.lerp(uniforms.uMouse.value.x, targetX, 0.1);
    uniforms.uMouse.value.y = THREE.MathUtils.lerp(uniforms.uMouse.value.y, targetY, 0.1);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial 
        attach="material"
        args={[ImageShaderMaterial]} 
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function HeroCanvas() {
  return (
    <div className="w-full h-screen bg-transparent overflow-hidden">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}