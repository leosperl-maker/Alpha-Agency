import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Icosahedron } from "@react-three/drei";

// Forme organique animée aux couleurs de la marque.
// Volontairement légère : 1 mesh, pas d'environnement HDR, DPR plafonné.
function Blob() {
  return (
    <Float speed={1.3} rotationIntensity={1.1} floatIntensity={1.2}>
      <Icosahedron args={[1.4, 12]}>
        <MeshDistortMaterial
          color="#CE0202"
          distort={0.38}
          speed={1.5}
          roughness={0.25}
          metalness={0.15}
        />
      </Icosahedron>
    </Float>
  );
}

const HeroScene = () => (
  <Canvas
    dpr={[1, 1.5]}
    camera={{ position: [0, 0, 4.2], fov: 45 }}
    gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    style={{ pointerEvents: "none" }}
    aria-hidden="true"
  >
    <ambientLight intensity={0.7} />
    <directionalLight position={[3, 3, 4]} intensity={1.4} />
    <directionalLight position={[-4, -2, -2]} intensity={0.4} color="#ffffff" />
    <Blob />
  </Canvas>
);

export default HeroScene;
