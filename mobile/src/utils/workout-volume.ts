import type { Catalog, PlannedExercise } from '@/api/schema';

export const recommendedSetLimit = 6;

export type VolumeCaution = {
  muscleGroupId: string;
  plannedSets: number;
};

export function getVolumeCautions(
  exercises: Catalog['exercises'],
  plan: PlannedExercise[],
  limit = recommendedSetLimit,
): VolumeCaution[] {
  const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const totals = new Map<string, number>();

  plan.forEach(item => {
    const exercise = byId.get(item.exercise_id);
    if (!exercise) return;
    const trainedGroups = new Set([
      exercise.primary_muscle_group,
      ...exercise.secondary_muscle_groups,
    ]);
    trainedGroups.forEach(groupId => {
      totals.set(groupId, (totals.get(groupId) ?? 0) + item.sets);
    });
  });

  return [...totals.entries()]
    .filter(([, plannedSets]) => plannedSets > limit)
    .map(([muscleGroupId, plannedSets]) => ({ muscleGroupId, plannedSets }))
    .sort((left, right) => right.plannedSets - left.plannedSets || left.muscleGroupId.localeCompare(right.muscleGroupId));
}
