/** All durations and timeline offsets are in milliseconds. Rounds are 1-based. */
export type Exercise = Readonly<{
  type: 'TIMED';
  id: string;
  name: string;
  durationMs: number;
}>;

type BaseWorkoutConfig = Readonly<{
  rounds: number;
  preparationMs?: number;
  restBetweenRoundsMs?: number;
}>;

export type WorkoutConfig =
  | (BaseWorkoutConfig & Readonly<{ mode: 'FREE'; roundDurationMs: number }>)
  | (BaseWorkoutConfig & Readonly<{
      mode: 'GUIDED';
      exercises: readonly Exercise[];
      restBetweenExercisesMs?: number;
    }>);

type PhaseTiming = Readonly<{
  durationMs: number;
  startMs: number;
  endMs: number;
}>;

export type WorkoutPhase = PhaseTiming & (
  | Readonly<{ type: 'PREPARATION' }>
  | Readonly<{ type: 'FREE'; round: number }>
  | Readonly<{ type: 'EXERCISE'; round: number; exerciseId: string; exerciseName: string }>
  | Readonly<{ type: 'REST_BETWEEN_EXERCISES'; round: number; afterExerciseId: string }>
  | Readonly<{ type: 'REST_BETWEEN_ROUNDS'; round: number }>
);

export type WorkoutTimeline = Readonly<{
  phases: readonly WorkoutPhase[];
  totalDurationMs: number;
}>;
