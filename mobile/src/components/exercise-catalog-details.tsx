import { StyleSheet, Text } from 'react-native';
import type { Catalog } from '@/api/schema';
import { colors } from '@/theme';

type Exercise = Catalog['exercises'][number];

export function ExerciseCatalogDetails({ catalog, exercise }: { catalog: Catalog; exercise: Exercise }) {
  const target = catalog.muscle_groups.find(group => group.id === exercise.primary_muscle_group)?.name
    ?? exercise.primary_muscle_group;
  return <Text style={styles.target}>Target muscle: {target}</Text>;
}

const styles = StyleSheet.create({
  target: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
});
