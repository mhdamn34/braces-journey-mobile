import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { onPersistError } from '@/lib/store/create-json-store';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function SaveErrorBanner() {
  const colors = useTheme();
  const [failedFile, setFailedFile] = useState<string | null>(null);

  useEffect(() => onPersistError((fileName) => setFailedFile(fileName)), []);

  if (!failedFile) return null;
  return (
    <Pressable
      onPress={() => setFailedFile(null)}
      style={{
        position: 'absolute',
        left: Space.lg,
        right: Space.lg,
        bottom: Space.xxxl,
        backgroundColor: colors.danger,
        borderRadius: Radii.card,
        padding: Space.md,
      }}
    >
      <Text style={[Type.label, { color: colors.onAccent, textAlign: 'center' }]}>
        Couldn&apos;t save your latest change — it&apos;s kept in memory. Tap to dismiss.
      </Text>
    </Pressable>
  );
}
