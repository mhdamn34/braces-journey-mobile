import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import {
  captureLocalSnapshot,
  runMigration,
  type LocalSnapshot,
  type MigrationProgress,
} from '@/features/migration/engine';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MigrateScreen() {
  const colors = useTheme();
  const snapshotRef = useRef<LocalSnapshot | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(0);
  const [finished, setFinished] = useState(false);

  async function start() {
    if (running) return;
    setRunning(true);
    snapshotRef.current ??= captureLocalSnapshot();
    const result = await runMigration(snapshotRef.current, setProgress);
    setFailed(result.failed);
    setFinished(result.failed === 0);
    setRunning(false);
  }

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const ratio = progress && progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Space.md }}>
        <Text style={[Type.display, { color: colors.textPrimary }]}>Moving your journey</Text>
        <Text style={[Type.body, { color: colors.textSecondary }]}>
          Your months, visits, and payments are being uploaded to your account. Keep the app open.
        </Text>
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
          <View
            style={{
              width: `${ratio * 100}%`,
              height: 6,
              backgroundColor: colors.accent,
              borderRadius: 3,
            }}
          />
        </View>
        {progress ? (
          <Text style={[Type.caption, { color: colors.textTertiary }]}>
            {progress.done} of {progress.total}
            {progress.failed > 0 ? ` · ${progress.failed} failed` : ''} — {progress.label}
          </Text>
        ) : null}
        {failed > 0 && !running ? (
          <Text style={[Type.caption, { color: colors.danger }]}>
            {failed} {failed === 1 ? 'item' : 'items'} could not be uploaded. Retry when you have a
            connection — nothing already uploaded is sent twice.
          </Text>
        ) : null}
      </View>
      {finished ? (
        <Button label="Continue" onPress={() => router.replace('/')} />
      ) : failed > 0 && !running ? (
        <Button label="Retry failed" onPress={() => void start()} />
      ) : null}
    </Screen>
  );
}
