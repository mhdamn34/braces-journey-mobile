import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { login } from '@/features/auth/api';
import { refreshAllApiStores } from '@/lib/store/create-api-store';
import { useAsyncAction } from '@/lib/use-async-action';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function SignInScreen() {
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { run, pending, error } = useAsyncAction(async () => {
    await login({ email: email.trim(), password });
    await refreshAllApiStores();
    router.replace('/');
  });

  const inputStyle = [
    Type.body,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.thumb,
      padding: Space.md,
      backgroundColor: colors.surface,
    },
  ];

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Sign in</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" placeholder="you@example.com"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="password" placeholder="Your password"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label={pending ? 'Signing in…' : 'Sign in'}
        onPress={() => void run()}
        disabled={pending || !email.trim() || !password}
      />
    </Screen>
  );
}
