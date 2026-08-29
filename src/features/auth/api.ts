import Constants from 'expo-constants';

import { clearLocalData } from '@/features/auth/clear-local-data';
import { signedIn } from '@/features/auth/store';
import { profileStore } from '@/features/profile/store';
import { apiRequest } from '@/lib/api/client';
import { saveToken } from '@/lib/api/token';

type AuthResponse = { token: string; user: { id: number; name: string; email: string } };

function deviceName(): string {
  return Constants.deviceName ?? 'Mobile Device';
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const res = await apiRequest<AuthResponse>('POST', '/auth/register', {
    body: { ...input, device_name: deviceName() },
  });
  await saveToken(res.token);
  signedIn();
}

export async function login(input: { email: string; password: string }): Promise<void> {
  const res = await apiRequest<AuthResponse>('POST', '/auth/login', {
    body: { ...input, device_name: deviceName() },
  });
  await saveToken(res.token);
  // An existing account has been through onboarding — never show the pager again.
  profileStore.update((p) => ({ ...p, onboardedAt: p.onboardedAt ?? new Date().toISOString() }));
  signedIn();
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('POST', '/auth/logout');
  } catch {
    // the token may already be dead — local sign-out proceeds regardless
  }
  await clearLocalData();
}
