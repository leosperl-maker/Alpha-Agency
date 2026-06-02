import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

/**
 * FluidHero — fond WebGL interactif : un seul quad plein écran exécutant un shader
 * de bruit fluide (domain-warped fbm) aux couleurs bordeaux/rouge, qui s'illumine
 * et se déforme autour du curseur. Très peu coûteux (1 triangle/quad, pas de géométrie lourde).
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;   // 0..1
  uniform float uAspect;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 asp = vec2(uAspect, 1.0);
    vec2 p = uv * asp * 3.0;
    vec2 m = uMouse * asp * 3.0;

    float t = uTime * 0.07;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    float n = fbm(p + q * 1.6 + t);

    // Influence du curseur : halo + accentuation locale
    float d = distance(p, m);
    float glow = smoothstep(1.1, 0.0, d);
    n += glow * 0.35;

    // Palette bordeaux -> crimson sur noir chaud
    vec3 cBlack = vec3(0.039, 0.020, 0.027);
    vec3 cBordeaux = vec3(0.36, 0.04, 0.11);
    vec3 cCrimson = vec3(0.82, 0.08, 0.18);

    vec3 col = mix(cBlack, cBordeaux, smoothstep(0.15, 0.6, n));
    col = mix(col, cCrimson, smoothstep(0.62, 0.98, n + glow * 0.25));

    // Vignette douce
    col *= 1.0 - 0.55 * length(uv - 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FluidPlane() {
  const matRef = useRef(null);
  const { viewport } = useThree();
  const target = useRef({ x: 0.5, y: 0.5 });
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: 1 },
    }),
    []
  );

  // Suivi de la souris au niveau de la fenêtre (le canvas est en pointer-events:none)
  useEffect(() => {
    const onMove = (e) => {
      target.current.x = e.clientX / window.innerWidth;
      target.current.y = 1 - e.clientY / window.innerHeight; // repère UV (bas-gauche)
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uAspect.value = viewport.width / viewport.height;
    uniforms.uMouse.value.x += (target.current.x - uniforms.uMouse.value.x) * 0.04;
    uniforms.uMouse.value.y += (target.current.y - uniforms.uMouse.value.y) * 0.04;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

const FluidHero = () => (
  <Canvas
    className="!absolute inset-0"
    dpr={[1, 1.5]}
    gl={{ antialias: false, powerPreference: "high-performance" }}
    style={{ pointerEvents: "none" }}
    aria-hidden="true"
  >
    <FluidPlane />
  </Canvas>
);

export default FluidHero;
