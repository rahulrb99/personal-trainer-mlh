export const muscleGroupIds = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;

export type MuscleGroupId = typeof muscleGroupIds[number];

// These aliases are intentionally tied to node names inspected in the pinned
// muscular.glb. Connective tissue, bursae, tendons, and unrelated muscles stay
// visible but are not selectable.
const meshAliases: readonly (readonly [MuscleGroupId, readonly string[]])[] = [
  ['chest', [
    'pectoralis major muscle',
    'pectoralis minor muscle',
    'external intercostal muscles',
    'internal intercostal muscles',
    'innermost intercostal muscles',
    'serratus anterior muscle',
    'subclavius muscle',
    'transversus thoracis muscle',
  ]],
  ['back', [
    'trapezius muscle',
    'rhomboid major muscle',
    'rhomboid minor muscle',
    'latissimus dorsi muscle',
    'quadratus lumborum muscle',
  ]],
  ['shoulders', ['part of deltoid muscle']],
  ['biceps', ['head of biceps brachii']],
  ['triceps', ['head of triceps brachii']],
  ['quadriceps', [
    'rectus femoris muscle',
    'vastus lateralis muscle',
    'vastus medialis muscle',
    'vastus intermedius muscle',
  ]],
  ['hamstrings', [
    'head of biceps femoris',
    'semimembranosus muscle',
    'semitendinosus muscle',
  ]],
  ['glutes', [
    'gluteus maximus muscle',
    'gluteus medius muscle',
    'gluteus minimus muscle',
  ]],
  ['calves', [
    'head of gastrocnemius',
    'soleus muscle',
    'plantaris muscle',
  ]],
  ['core', [
    'rectus abdominis muscle',
    'external abdominal oblique muscle',
    'internal abdominal oblique muscle',
    'transversus abdominis muscle',
  ]],
];

export function muscleGroupForMesh(meshName: string): MuscleGroupId | null {
  // GLTFLoader sanitizes node names for animation bindings by replacing spaces
  // with underscores; normalize both the source and runtime forms.
  const normalized = meshName.toLowerCase().replaceAll('_', ' ');
  if (normalized.includes('bursa') || normalized.includes('fascia') || normalized.includes('tendon')) return null;
  for (const [group, aliases] of meshAliases) {
    if (aliases.some(alias => normalized.includes(alias))) return group;
  }
  return null;
}
