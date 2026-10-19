import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

type Props = {
  groups: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
};

export const activeMuscleColor = '#8B1028';
export const inactiveMuscleColor = '#B8C8DE';

export function MuscleGroupSelector({ groups, selected, onToggle }: Props) {
  return <View accessibilityRole="list" style={styles.checklist}>
    {groups.map(group => {
      const isSelected = selected.includes(group.id);
      return <Pressable
        key={group.id}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${group.name} ${isSelected ? 'from' : 'to'} today's workout`}
        onPress={() => onToggle(group.id)}
        style={({ pressed }) => [styles.choice, isSelected && styles.choiceSelected, pressed && { opacity: 0.72 }]}
      >
        <View style={[styles.swatch, isSelected && styles.swatchSelected]}>{isSelected && <Text style={styles.check}>✓</Text>}</View>
        <Text style={[styles.label, isSelected && styles.labelSelected]}>{group.name}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFD' },
  choiceSelected: { borderColor: activeMuscleColor, backgroundColor: '#FCECEF' },
  swatch: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: inactiveMuscleColor },
  swatchSelected: { backgroundColor: activeMuscleColor },
  check: { color: colors.paper, fontSize: 12, fontWeight: '700' },
  label: { color: colors.secondary, fontWeight: '600' },
  labelSelected: { color: colors.danger },
});
