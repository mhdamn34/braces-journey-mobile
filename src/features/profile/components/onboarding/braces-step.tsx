import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { addMonthsIso, isValidIsoDate, todayIso } from '@/lib/dates';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export type BracesSituation = 'new' | 'existing';

type Props = {
  situation: BracesSituation;
  startDate: string;
  plannedMonths: number;
  onChange: (patch: {
    situation?: BracesSituation;
    startDate?: string;
    plannedMonths?: number;
  }) => void;
  onNext: () => void;
};

const QUICK_STARTS: { label: string; monthsAgo: number }[] = [
  { label: 'Today', monthsAgo: 0 },
  { label: '3 months ago', monthsAgo: 3 },
  { label: '6 months ago', monthsAgo: 6 },
  { label: 'A year ago', monthsAgo: 12 },
];

export function BracesStep({ situation, startDate, plannedMonths, onChange, onNext }: Props) {
  const colors = useTheme();
  const dateValid = isValidIsoDate(startDate);

  return (
    <View style={{ flex: 1, gap: Space.lg, justifyContent: 'center' }}>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Your braces</Text>
      <View style={{ flexDirection: 'row', gap: Space.md }}>
        <View style={{ flex: 1 }}>
          <Card style={{ borderColor: situation === 'new' ? colors.accent : colors.border }}>
            <Text
              onPress={() => onChange({ situation: 'new', startDate: todayIso() })}
              style={[Type.body, { color: colors.textPrimary, fontWeight: '600' }]}
            >
              Just getting started
            </Text>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card style={{ borderColor: situation === 'existing' ? colors.accent : colors.border }}>
            <Text
              onPress={() => onChange({ situation: 'existing' })}
              style={[Type.body, { color: colors.textPrimary, fontWeight: '600' }]}
            >
              Already wearing braces
            </Text>
          </Card>
        </View>
      </View>

      <Text style={[Type.label, { color: colors.textSecondary }]}>
        {situation === 'new' ? 'When are they fitted?' : 'When were they fitted?'}
      </Text>
      <TextInput
        value={startDate}
        onChangeText={(startDate) => onChange({ startDate })}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        style={[
          Type.body,
          {
            color: colors.textPrimary,
            borderColor: dateValid ? colors.border : colors.danger,
            borderWidth: 1,
            borderRadius: Radii.thumb,
            padding: Space.md,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {QUICK_STARTS.map((q) => (
          <Chip
            key={q.label}
            label={q.label}
            onPress={() => onChange({ startDate: addMonthsIso(todayIso(), -q.monthsAgo) })}
          />
        ))}
      </View>

      <Text style={[Type.label, { color: colors.textSecondary }]}>Planned duration</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {[12, 18, 24, 30, 36].map((months) => (
          <Chip
            key={months}
            label={`${months} months`}
            selected={plannedMonths === months}
            onPress={() => onChange({ plannedMonths: months })}
          />
        ))}
      </View>

      <Button label="Continue" onPress={onNext} disabled={!dateValid} />
    </View>
  );
}
