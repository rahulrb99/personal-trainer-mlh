import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  selected?: boolean;
};

export function ActionButton({ title, onPress, disabled = false, secondary = false, danger = false, selected }: Props) {
  const [focused, setFocused] = useState(false);
  const foreground = disabled ? colors.secondary : secondary ? (danger ? colors.danger : colors.blue) : colors.paper;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }}
    disabled={disabled}
    onPress={onPress}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, {
      backgroundColor: disabled ? colors.background : secondary ? colors.paper : danger ? colors.danger : colors.blue,
      borderColor: focused ? colors.ink : secondary || disabled ? colors.border : 'transparent',
      opacity: pressed ? 0.78 : 1,
      boxShadow: focused ? `0 0 0 3px ${colors.paleBlue}` : 'none',
    }]}
  ><Text style={[styles.label, { color: foreground }]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
});
