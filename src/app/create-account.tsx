import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { register } from '@/features/auth/api';
import { useAsyncAction } from '@/lib/use-async-action';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function CreateAccountScreen() {
  const colors = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { run, pending, error } = useAsyncAction(async () => {
    await register({ name: name.trim(), email: email.trim(), password });
    router.replace('/onboarding');
  });

  const valid = name.trim().length > 0 && email.includes('@') && password.length >= 8;

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
      <Text style={[Type.display, { color: colors.textPrimary }]}>Create account</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" placeholder="you@example.com"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="password-new" placeholder="At least 8 characters"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label={pending ? 'Creating…' : 'Create account'}
        onPress={() => void run()}
        disabled={pending || !valid}
      />
    </Screen>
  );
}
