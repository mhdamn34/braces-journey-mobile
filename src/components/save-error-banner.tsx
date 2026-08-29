import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { onRefreshError } from '@/lib/store/create-api-store';
import { onPersistError } from '@/lib/store/create-json-store';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function SaveErrorBanner() {
  const colors = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () =>
      onPersistError(() =>
        setMessage("Couldn't save your latest change — it's kept in memory. Tap to dismiss."),
      ),
    [],
  );
  useEffect(
    () =>
      onRefreshError(() =>
        setMessage("Couldn't refresh from the server — showing your last synced data. Tap to dismiss."),
      ),
    [],
  );

  if (!message) return null;
  return (
    <Pressable
      onPress={() => setMessage(null)}
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
      <Text style={[Type.label, { color: colors.onAccent, textAlign: 'center' }]}>{message}</Text>
    </Pressable>
  );
}
