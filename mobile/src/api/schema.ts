import { z } from 'zod';

export const guidanceSourceSchema = z.object({ title: z.string(), url: z.string().url() });
export const bodyRegionSchema = z.object({
  id: z.string(), name: z.string(), view: z.enum(['front', 'back']), side: z.enum(['left', 'right', 'center']),
  muscle_group_ids: z.array(z.string()), legacy_aliases: z.array(z.string()),
});
export const equipmentSchema = z.object({
  id: z.string(), name: z.string(), equipment_type: z.string(),
  manufacturer: z.string().nullable(), model: z.string().nullable(), image_url: z.string().url().nullable(),
  floor: z.string().nullable(), zone: z.string().nullable(), verification_status: z.literal('fictional_demo_configuration'),
});
export const exerciseMetadataSchema = z.object({
  exercise_id: z.string(), equipment_id: z.string(), equipment_type: z.string(),
  difficulty_level: z.enum(['unknown', 'beginner', 'intermediate', 'advanced']),
  movement_pattern: z.string(), exercise_type: z.string(), weight_unit: z.literal('lb'),
  weight_range_type: z.literal('configured_equipment_capability'),
});
export const exerciseSchema = z.object({
  id: z.string(), name: z.string(), equipment: z.string(), location: z.string(), muscles: z.string(),
  sets: z.number().int().positive(), reps: z.number().int().positive(), rest_seconds: z.number().positive(),
  primary_muscle_group: z.string(), secondary_muscle_groups: z.array(z.string()),
  weight_min_lb: z.number().int().positive(), weight_max_lb: z.number().int().positive(), weight_step_lb: z.number().int().positive(),
  setup: z.string(), cue: z.string(), mistake: z.string(), troubleshooting: z.string(), stop_conditions: z.string(),
  alternatives: z.array(z.string()), sources: z.array(guidanceSourceSchema), review_status: z.literal('professional_review_pending'),
});
export const setRecordSchema = z.object({
  set_index: z.number().int().positive(), started_at: z.string().datetime({ offset: true }).nullable(),
  completed_at: z.string().datetime({ offset: true }), duration_seconds: z.number().nonnegative().nullable(),
  planned_reps: z.number().int().positive(), weight_lb: z.number().int().positive().nullable(),
});
export type WeightChange = { weight_lb: number; weight_increase_lb?: never } | { weight_increase_lb: number; weight_lb?: never };
export const exerciseInstanceSchema = exerciseSchema.extend({ instance_id: z.string(), original_exercise_id: z.string(), completed_sets: z.number().int().nonnegative(), weight_lb: z.number().int().positive().nullable(), set_records: z.array(setRecordSchema).default([]) });
export const trainerPersonaSchema = z.object({
  name: z.string().min(1).max(30).default('Mat'), color: z.enum(['blue', 'mint', 'peach']).default('blue'),
  expression: z.enum(['happy', 'calm', 'bold']).default('happy'), accessory: z.enum(['headband', 'headphones', 'none']).default('headband'),
  motivation: z.string().max(240).default(''), remind: z.boolean().default(true),
  language: z.enum(['en', 'es']).default('en'),
});
export type TrainerPersona = z.infer<typeof trainerPersonaSchema>;
export const defaultTrainer = trainerPersonaSchema.parse({});
export const preferencesSchema = z.object({ name: z.string(), mode: z.enum(['strict', 'alternatives']), excluded_exercise_ids: z.array(z.string()), coaching: z.enum(['quiet', 'standard', 'teach']), trainer: trainerPersonaSchema.default(defaultTrainer) });
export const plannedExerciseSchema = z.object({ exercise_id: z.string(), sets: z.number().int().min(1).max(5), reps: z.number().int().min(1).max(30), weight_lb: z.number().int().positive().nullable() });
export const snapshotSchema = z.object({
  schema_version: z.literal(1), session_id: z.string(), version: z.number().int().positive(), server_time: z.string().datetime({ offset: true }),
  created_at: z.string(), ended_at: z.string().nullable(), phase: z.enum(['awaiting_equipment', 'awaiting_alternative_confirmation', 'exercising', 'resting', 'blocked', 'completed', 'ended']),
  preferences: preferencesSchema, demo_mode: z.boolean(), current: exerciseInstanceSchema.nullable(), set_index: z.number().int().positive(),
  rest_deadline: z.string().nullable(), set_started_at: z.string().datetime({ offset: true }).nullable().default(null), queue: z.array(exerciseInstanceSchema), deferred: z.array(exerciseInstanceSchema), completed: z.array(exerciseInstanceSchema), skipped: z.array(exerciseInstanceSchema),
  pending_alternative: exerciseSchema.nullable(), last_decision: z.string(),
});
export const catalogSchema = z.object({
  schema_version: z.literal(1), gym: z.object({ id: z.string(), name: z.string(), description: z.string() }),
  body_regions: z.array(bodyRegionSchema), equipment_catalog: z.array(equipmentSchema), exercise_metadata: z.array(exerciseMetadataSchema),
  muscle_groups: z.array(z.object({ id: z.string(), name: z.string(), view: z.enum(['front', 'back', 'both']), body_regions: z.array(z.string()) })),
  exercises: z.array(exerciseSchema), routines: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), exercise_ids: z.array(z.string()) })), content_status: z.string(),
}).superRefine((catalog, context) => {
  const regionIds = new Set(catalog.body_regions.map(region => region.id));
  const equipmentIds = new Set(catalog.equipment_catalog.map(equipment => equipment.id));
  const exerciseIds = new Set(catalog.exercises.map(exercise => exercise.id));
  const metadataExerciseIds = new Set(catalog.exercise_metadata.map(metadata => metadata.exercise_id));
  catalog.muscle_groups.forEach((group, groupIndex) => group.body_regions.forEach(regionId => {
    if (!regionIds.has(regionId)) context.addIssue({ code: 'custom', path: ['muscle_groups', groupIndex, 'body_regions'], message: `Unknown body region: ${regionId}` });
  }));
  catalog.exercise_metadata.forEach((metadata, metadataIndex) => {
    if (!exerciseIds.has(metadata.exercise_id)) context.addIssue({ code: 'custom', path: ['exercise_metadata', metadataIndex, 'exercise_id'], message: `Unknown exercise: ${metadata.exercise_id}` });
    if (!equipmentIds.has(metadata.equipment_id)) context.addIssue({ code: 'custom', path: ['exercise_metadata', metadataIndex, 'equipment_id'], message: `Unknown equipment: ${metadata.equipment_id}` });
  });
  catalog.exercises.forEach((exercise, exerciseIndex) => {
    if (!metadataExerciseIds.has(exercise.id)) context.addIssue({ code: 'custom', path: ['exercises', exerciseIndex], message: `Missing metadata for exercise: ${exercise.id}` });
  });
});
export const planPreviewSchema = z.object({ muscle_group_ids: z.array(z.string()), plan: z.array(plannedExerciseSchema) });
export const actionSchema = z.enum(['equipment_claimed', 'equipment_taken', 'alternative_accepted', 'alternative_declined', 'set_completed', 'skip_exercise', 'retry_deferred', 'end_session', 'weight_updated']);
export const createResultSchema = z.object({ snapshot: snapshotSchema, access_token: z.string() });
export const eventResultSchema = z.object({ snapshot: snapshotSchema, replayed: z.boolean() });
export const summarySchema = z.object({ session_id: z.string(), phase: z.string(), completed_sets: z.number(), completed_exercises: z.number(), completed: z.array(exerciseInstanceSchema), skipped: z.array(exerciseInstanceSchema), partial: z.array(exerciseInstanceSchema), substituted: z.array(exerciseInstanceSchema) });
export const weeklyWorkoutSchema = z.object({
  weekday: z.number().int().min(0).max(6), time: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  muscle_group_ids: z.array(z.string()).min(1).max(10), plan: z.array(plannedExerciseSchema).min(1).max(8),
});
export type WeeklyWorkout = z.infer<typeof weeklyWorkoutSchema>;
export const userProfileSchema = z.object({
  user_id: z.string(), email: z.string().email().nullable(), name: z.string(),
  preferences: preferencesSchema, muscle_group_ids: z.array(z.string()), plan: z.array(plannedExerciseSchema).nullable(), schedule: z.array(weeklyWorkoutSchema).max(7).default([]),
});
export const authResultSchema = z.object({ profile: userProfileSchema, access_token: z.string() });
export const healthSchema = z.object({ status: z.string(), schema_version: z.literal(1), voice_configured: z.boolean(), google_auth_configured: z.boolean() });
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type BodyRegion = z.infer<typeof bodyRegionSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type ExerciseMetadata = z.infer<typeof exerciseMetadataSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type PlannedExercise = z.infer<typeof plannedExerciseSchema>;
export type Action = z.infer<typeof actionSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Credentials = { session_id: string; access_token: string };
export type ProfileAuth = { access_token: string };
