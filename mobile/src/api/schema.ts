import { z } from 'zod';

export const exerciseSchema = z.object({
  id: z.string(), name: z.string(), equipment: z.string(), location: z.string(), muscles: z.string(),
  sets: z.number().int().positive(), reps: z.number().int().positive(), rest_seconds: z.number().positive(),
  setup: z.string(), cue: z.string(), mistake: z.string(), alternatives: z.array(z.string()),
});
export const exerciseInstanceSchema = exerciseSchema.extend({ instance_id: z.string(), original_exercise_id: z.string(), completed_sets: z.number().int().nonnegative() });
export const preferencesSchema = z.object({ name: z.string(), mode: z.enum(['strict', 'alternatives']), excluded_exercise_ids: z.array(z.string()), coaching: z.enum(['quiet', 'standard', 'teach']) });
export const snapshotSchema = z.object({
  schema_version: z.literal(1), session_id: z.string(), version: z.number().int().positive(), server_time: z.string().datetime({ offset: true }),
  created_at: z.string(), ended_at: z.string().nullable(), phase: z.enum(['awaiting_equipment', 'awaiting_alternative_confirmation', 'exercising', 'resting', 'blocked', 'completed', 'ended']),
  preferences: preferencesSchema, demo_mode: z.boolean(), current: exerciseInstanceSchema.nullable(), set_index: z.number().int().positive(),
  rest_deadline: z.string().nullable(), queue: z.array(exerciseInstanceSchema), deferred: z.array(exerciseInstanceSchema), completed: z.array(exerciseInstanceSchema), skipped: z.array(exerciseInstanceSchema),
  pending_alternative: exerciseSchema.nullable(), last_decision: z.string(),
});
export const catalogSchema = z.object({
  schema_version: z.literal(1), gym: z.object({ id: z.string(), name: z.string(), description: z.string() }),
  exercises: z.array(exerciseSchema), routines: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), exercise_ids: z.array(z.string()) })), content_status: z.string(),
});
export const actionSchema = z.enum(['equipment_claimed', 'equipment_taken', 'alternative_accepted', 'alternative_declined', 'set_completed', 'skip_exercise', 'retry_deferred', 'end_session']);
export const createResultSchema = z.object({ snapshot: snapshotSchema, access_token: z.string() });
export const eventResultSchema = z.object({ snapshot: snapshotSchema, replayed: z.boolean() });
export const summarySchema = z.object({ session_id: z.string(), phase: z.string(), completed_sets: z.number(), completed_exercises: z.number(), completed: z.array(exerciseInstanceSchema), skipped: z.array(exerciseInstanceSchema), partial: z.array(exerciseInstanceSchema), substituted: z.array(exerciseInstanceSchema) });
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Credentials = { session_id: string; access_token: string };
