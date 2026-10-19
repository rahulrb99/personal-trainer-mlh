/* eslint-disable react/no-unknown-property -- React Three Fiber supplies its own JSX intrinsic properties. */
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { Box3, Color, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, Vector3, type Object3D, type Side } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { activeMuscleColor, MuscleGroupSelector } from '@/components/muscle-group-selector';
import { muscleGroupForMesh, type MuscleGroupId } from '@/components/muscle-model-aliases';
import { colors } from '@/theme';

type MuscleMapProps = {
  groups: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
};

const modelUrl = '/models/muscular.glb';
const selectedColor = new Color(activeMuscleColor);
const neutralAnatomyColor = new Color('#D5DCE5');
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

type ColorMaterial = Material & {
  color: Color;
  emissive?: Color;
  emissiveIntensity?: number;
};

type PreparedMaterial = {
  mesh: Mesh;
  material: ColorMaterial;
  originalEmissive: Color | null;
  originalEmissiveIntensity: number | null;
  originalOpacity: number;
  originalTransparent: boolean;
  originalDepthTest: boolean;
  originalDepthWrite: boolean;
  originalRenderOrder: number;
  originalSide: Side;
  muscleGroup: MuscleGroupId | null;
};

type PreparedMesh = {
  mesh: Mesh;
  baseMaterial: Material | Material[];
  highlightMaterial: MeshBasicMaterial | MeshBasicMaterial[];
  muscleGroup: MuscleGroupId;
};

function isColorMaterial(material: Material): material is ColorMaterial {
  return 'color' in material && material.color instanceof Color;
}

function isAnnotationMesh(meshName: string) {
  return meshName.toLowerCase().replaceAll('_', ' ').startsWith('muscular systemg');
}

function AnatomyModel({ selected, onToggle, onHover, onLoaded }: {
  selected: string[];
  onToggle: (id: string) => void;
  onHover: (group: MuscleGroupId | null) => void;
  onLoaded: () => void;
}) {
  const { scene } = useLoader(GLTFLoader, modelUrl, loader => loader.setDRACOLoader(dracoLoader));
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const materials: PreparedMaterial[] = [];
    const meshes: PreparedMesh[] = [];
    const annotations: Object3D[] = [];
    root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (isAnnotationMesh(object.name)) {
        annotations.push(object);
        return;
      }
      const muscleGroup = muscleGroupForMesh(object.name);
      object.userData.workoutMuscleGroup = muscleGroup;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const clones = originals.map(material => material.clone());
      object.material = Array.isArray(object.material) ? clones : clones[0];
      if (muscleGroup) {
        const highlights = originals.map(() => new MeshBasicMaterial({
          color: selectedColor,
          depthTest: false,
          depthWrite: false,
          side: DoubleSide,
          toneMapped: false,
        }));
        meshes.push({
          mesh: object,
          baseMaterial: object.material,
          highlightMaterial: Array.isArray(object.material) ? highlights : highlights[0],
          muscleGroup,
        });
      }
      clones.forEach(material => {
        if (!isColorMaterial(material)) return;
        materials.push({
          mesh: object,
          material,
          originalEmissive: material.emissive?.clone() ?? null,
          originalEmissiveIntensity: material.emissiveIntensity ?? null,
          originalOpacity: material.opacity,
          originalTransparent: material.transparent,
          originalDepthTest: material.depthTest,
          originalDepthWrite: material.depthWrite,
          originalRenderOrder: object.renderOrder,
          originalSide: material.side,
          muscleGroup,
        });
      });
    });
    annotations.forEach(annotation => annotation.removeFromParent());
    const bounds = new Box3().setFromObject(root);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    root.position.copy(center).multiplyScalar(-1);
    const normalized = new Group();
    normalized.scale.setScalar(3.5 / Math.max(size.y, size.x, size.z));
    normalized.add(root);
    return { root: normalized, materials, meshes };
  }, [scene]);

  useEffect(onLoaded, [onLoaded]);

  useEffect(() => {
    const hasSelection = selected.length > 0;
    prepared.materials.forEach(entry => {
      entry.material.color.copy(neutralAnatomyColor);
      if (entry.material.emissive && entry.originalEmissive) {
        entry.material.emissive.copy(entry.originalEmissive);
      }
      if (entry.originalEmissiveIntensity !== null) {
        entry.material.emissiveIntensity = entry.originalEmissiveIntensity;
      }
      entry.material.opacity = hasSelection ? 0.16 : entry.originalOpacity;
      entry.material.transparent = hasSelection ? true : entry.originalTransparent;
      entry.material.depthTest = entry.originalDepthTest;
      entry.material.depthWrite = hasSelection ? false : entry.originalDepthWrite;
      entry.material.side = entry.originalSide;
      entry.mesh.renderOrder = entry.originalRenderOrder;
      entry.material.needsUpdate = true;
    });
    prepared.meshes.forEach(entry => {
      entry.mesh.material = selected.includes(entry.muscleGroup) ? entry.highlightMaterial : entry.baseMaterial;
      entry.mesh.renderOrder = selected.includes(entry.muscleGroup) ? 20 : 0;
    });
  }, [prepared, selected]);

  useEffect(() => () => {
    prepared.materials.forEach(entry => entry.material.dispose());
    prepared.meshes.forEach(entry => {
      const highlights = Array.isArray(entry.highlightMaterial) ? entry.highlightMaterial : [entry.highlightMaterial];
      highlights.forEach(material => material.dispose());
    });
  }, [prepared]);

  function groupFromObject(object: Object3D): MuscleGroupId | null {
    return object.userData.workoutMuscleGroup ?? muscleGroupForMesh(object.name);
  }

  function groupFromIntersections(event: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>): MuscleGroupId | null {
    for (const intersection of event.intersections) {
      const group = groupFromObject(intersection.object);
      if (group) return group;
    }
    return null;
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    const group = groupFromIntersections(event);
    if (!group) return;
    event.stopPropagation();
    onToggle(group);
  }

  function handlePointer(event: ThreeEvent<PointerEvent>, entering: boolean) {
    const group = entering ? groupFromIntersections(event) : null;
    if (group) event.stopPropagation();
    onHover(group);
  }

  return <primitive
    object={prepared.root}
    onClick={handleClick}
    onPointerOver={(event: ThreeEvent<PointerEvent>) => handlePointer(event, true)}
    onPointerOut={(event: ThreeEvent<PointerEvent>) => handlePointer(event, false)}
  />;
}

function ModelProgress({ loaded }: { loaded: boolean }) {
  if (loaded) return null;
  return <View pointerEvents="none" style={styles.loading}>
    <Text style={styles.loadingText}>Loading anatomy…</Text>
  </View>;
}

const webglOptions: WebGLContextAttributes = {
  antialias: false,
  alpha: false,
  depth: true,
  powerPreference: 'low-power',
  stencil: false,
  preserveDrawingBuffer: false,
};

function probeWebGL() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 520;
    const context = canvas.getContext('webgl2', webglOptions);
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = 0;
    canvas.height = 0;
    return true;
  } catch {
    return false;
  }
}

function RotatingControls() {
  const { camera, gl } = useThree();
  const controls = useMemo(() => {
    const next = new OrbitControls(camera, gl.domElement);
    next.autoRotate = true;
    next.autoRotateSpeed = 0.85;
    next.enableDamping = true;
    next.dampingFactor = 0.08;
    next.enablePan = false;
    next.enableZoom = false;
    next.minDistance = 3.5;
    next.maxDistance = 8;
    next.minPolarAngle = Math.PI / 2;
    next.maxPolarAngle = Math.PI / 2;
    next.target.set(0, 0, 0);
    return next;
  }, [camera, gl]);
  useEffect(() => () => controls.dispose(), [controls]);

  useFrame(() => controls.update());
  return null;
}

class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Anatomy model failed to load.', error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function InteractiveModel({ selected, onToggle }: Pick<MuscleMapProps, 'selected' | 'onToggle'>) {
  const [hovered, setHovered] = useState<MuscleGroupId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const handleLoaded = useCallback(() => setLoaded(true), []);
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hovered]);

  return <View style={styles.viewport}>
    <Canvas
      aria-label="Rotating interactive anatomical muscle model"
      camera={{ position: [0, 0, 5.8], fov: 40 }}
      dpr={1}
      fallback={<Text>This browser does not support canvas. Use the muscle buttons below.</Text>}
      gl={webglOptions}
    >
      <color attach="background" args={['#F3F6FA']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -5]} intensity={1.1} />
      <Suspense fallback={null}>
        <AnatomyModel selected={selected} onToggle={onToggle} onHover={setHovered} onLoaded={handleLoaded} />
      </Suspense>
      <RotatingControls />
    </Canvas>
    <ModelProgress loaded={loaded} />
    <View pointerEvents="none" style={styles.hint}>
      <Text style={styles.hintText}>{hovered ? `Click to toggle ${hovered}` : 'Drag left or right · Click a muscle'}</Text>
    </View>
  </View>;
}

export function MuscleMap({ groups, selected, onToggle }: MuscleMapProps) {
  const [retryKey, setRetryKey] = useState(0);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  function retry() {
    // Failed loader results are cached; clear them so Retry makes a fresh request.
    useLoader.clear(GLTFLoader, modelUrl);
    setMessage(null);
    setBusy(true);
  }

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      if (!probeWebGL()) {
        setMessage('3D is unavailable in this browser tab. Close other WebGL tabs and retry. You can still select muscles below.');
      } else {
        setRetryKey(value => value + 1);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [busy]);

  function handleModelFailure() {
    setMessage('The 3D model could not load. Retry, or use the muscle buttons below.');
  }

  const errorNotice = <View style={styles.fallbackNotice}>
    <Text accessibilityRole="alert" style={styles.fallbackTitle}>3D view unavailable</Text>
    <Text style={styles.instructions}>{message ?? 'The 3D model could not load. Retry, or use the muscle buttons below.'}</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={styles.modeButton}>
      <Text style={styles.modeButtonText}>Retry</Text>
    </Pressable>
  </View>;

  return <View style={styles.wrapper}>
    {busy ? <View style={styles.fallbackNotice}>
      <Text style={styles.loadingText}>Starting 3D model…</Text>
    </View> : message ? errorNotice : <ModelErrorBoundary key={retryKey} fallback={errorNotice} onError={handleModelFailure}>
      <InteractiveModel selected={selected} onToggle={onToggle} />
      <Text style={styles.instructions}>Selected muscles turn bright red against neutral anatomy. The rotation axis passes vertically through the body.</Text>
    </ModelErrorBoundary>}
    <MuscleGroupSelector groups={groups} selected={selected} onToggle={onToggle} />
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  viewport: { position: 'relative', width: '100%', height: 520, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F3F6FA' },
  loading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(243, 246, 250, 0.72)' },
  loadingText: { color: colors.secondary, fontWeight: '600' },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center' },
  hintText: { color: colors.ink, fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(255, 255, 255, 0.88)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  instructions: { color: colors.secondary, fontSize: 12, lineHeight: 18 },
  fallbackNotice: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paleBlue },
  fallbackTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  modeButton: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  modeButtonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});
