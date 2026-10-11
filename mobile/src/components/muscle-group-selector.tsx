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
        style={[styles.choice, isSelected && styles.choiceSelected]}
      >
        <View style={[styles.swatch, isSelected && styles.swatchSelected]} />
        <Text style={[styles.label, isSelected && styles.labelSelected]}>{group.name}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFD' },
  choiceSelected: { borderColor: activeMuscleColor, backgroundColor: '#FCECEF' },
  swatch: { width: 12, height: 12, borderRadius: 6, backgroundColor: inactiveMuscleColor },
  swatchSelected: { backgroundColor: activeMuscleColor },
  label: { color: colors.secondary, fontWeight: '600' },
  labelSelected: { color: colors.danger },
});
