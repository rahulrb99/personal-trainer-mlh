import { Pressable, Text } from 'react-native';
import { colors } from '@/theme';

export function ActionButton({ title, onPress, disabled = false, secondary = false, danger = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => ({
    minHeight: 48, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12,
    backgroundColor: secondary ? colors.paleBlue : danger ? colors.danger : colors.blue,
    opacity: disabled ? 0.45 : pressed ? 0.75 : 1, alignItems: 'center', justifyContent: 'center',
  })}><Text style={{ fontSize: 15, fontWeight: '600', color: secondary ? colors.blue : '#FFFFFF' }}>{title}</Text></Pressable>;
}
