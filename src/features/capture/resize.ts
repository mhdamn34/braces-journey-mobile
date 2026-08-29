import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';

/** ~1600px long edge JPEG keeps uploads well under the server's 10 MB cap
 * without visible loss at the app's display sizes. */
export async function resizeForUpload(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
