import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { activeMuscleColor, inactiveMuscleColor, MuscleGroupSelector } from '@/components/muscle-group-selector';

type Props = {
  groups: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
};

const outline = '#526479';
const fill = (selected: string[], id: string) => selected.includes(id) ? activeMuscleColor : inactiveMuscleColor;

export function MuscleMap({ groups, selected, onToggle }: Props) {
  return <View style={styles.wrapper}>
    <Svg width="100%" height={330} viewBox="0 0 360 330" accessibilityLabel="Front and back muscle map">
      <SvgText x="90" y="20" textAnchor="middle" fill={outline} fontSize="13">Front</SvgText>
      <SvgText x="270" y="20" textAnchor="middle" fill={outline} fontSize="13">Back</SvgText>

      <Circle cx="90" cy="48" r="18" fill="#DCE4EC" stroke={outline} />
      <Rect x="64" y="68" width="52" height="92" rx="20" fill="#E5EBF1" stroke={outline} />
      <Rect x="54" y="72" width="10" height="92" rx="5" fill="#E5EBF1" stroke={outline} />
      <Rect x="116" y="72" width="10" height="92" rx="5" fill="#E5EBF1" stroke={outline} />
      <Rect x="69" y="158" width="17" height="125" rx="8" fill="#E5EBF1" stroke={outline} />
      <Rect x="94" y="158" width="17" height="125" rx="8" fill="#E5EBF1" stroke={outline} />

      <G>
        <Rect x="69" y="78" width="20" height="25" rx="6" fill={fill(selected, 'chest')} />
        <Rect x="91" y="78" width="20" height="25" rx="6" fill={fill(selected, 'chest')} />
      </G>
      <G>
        <Circle cx="62" cy="80" r="9" fill={fill(selected, 'shoulders')} />
        <Circle cx="118" cy="80" r="9" fill={fill(selected, 'shoulders')} />
      </G>
      <G>
        <Rect x="54" y="92" width="10" height="32" rx="5" fill={fill(selected, 'biceps')} />
        <Rect x="116" y="92" width="10" height="32" rx="5" fill={fill(selected, 'biceps')} />
      </G>
      <G>
        <Rect x="76" y="106" width="28" height="45" rx="8" fill={fill(selected, 'core')} />
      </G>
      <G>
        <Rect x="69" y="164" width="17" height="58" rx="8" fill={fill(selected, 'quadriceps')} />
        <Rect x="94" y="164" width="17" height="58" rx="8" fill={fill(selected, 'quadriceps')} />
      </G>

      <Circle cx="270" cy="48" r="18" fill="#DCE4EC" stroke={outline} />
      <Rect x="244" y="68" width="52" height="92" rx="20" fill="#E5EBF1" stroke={outline} />
      <Rect x="234" y="72" width="10" height="92" rx="5" fill="#E5EBF1" stroke={outline} />
      <Rect x="296" y="72" width="10" height="92" rx="5" fill="#E5EBF1" stroke={outline} />
      <Rect x="249" y="158" width="17" height="125" rx="8" fill="#E5EBF1" stroke={outline} />
      <Rect x="274" y="158" width="17" height="125" rx="8" fill="#E5EBF1" stroke={outline} />

      <G>
        <Rect x="250" y="78" width="40" height="48" rx="10" fill={fill(selected, 'back')} />
      </G>
      <G>
        <Circle cx="242" cy="80" r="9" fill={fill(selected, 'shoulders')} />
        <Circle cx="298" cy="80" r="9" fill={fill(selected, 'shoulders')} />
      </G>
      <G>
        <Rect x="234" y="92" width="10" height="32" rx="5" fill={fill(selected, 'triceps')} />
        <Rect x="296" y="92" width="10" height="32" rx="5" fill={fill(selected, 'triceps')} />
      </G>
      <G>
        <Rect x="255" y="127" width="30" height="25" rx="7" fill={fill(selected, 'core')} />
      </G>
      <G>
        <Rect x="248" y="153" width="20" height="24" rx="9" fill={fill(selected, 'glutes')} />
        <Rect x="272" y="153" width="20" height="24" rx="9" fill={fill(selected, 'glutes')} />
      </G>
      <G>
        <Rect x="249" y="179" width="17" height="48" rx="8" fill={fill(selected, 'hamstrings')} />
        <Rect x="274" y="179" width="17" height="48" rx="8" fill={fill(selected, 'hamstrings')} />
      </G>
      <G>
        <Rect x="249" y="231" width="17" height="45" rx="8" fill={fill(selected, 'calves')} />
        <Rect x="274" y="231" width="17" height="45" rx="8" fill={fill(selected, 'calves')} />
      </G>
    </Svg>
    <MuscleGroupSelector groups={groups} selected={selected} onToggle={onToggle} />
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
});
