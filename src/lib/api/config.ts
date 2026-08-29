/** Build-time env (EXPO_PUBLIC_*) with the Herd dev URL as the fallback.
 * Android emulators cannot resolve .test hosts — override via
 * EXPO_PUBLIC_API_URL (see .env.example). */
export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'https://braces-journey-be.test';
}
