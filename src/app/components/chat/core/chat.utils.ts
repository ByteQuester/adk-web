export function fixBase64String(base64: string): string {
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return base64;
}

export function formatBase64Data(data: string, mimeType: string) {
  const fixed = fixBase64String(data);
  return `data:${mimeType};base64,${fixed}`;
}

export function createDefaultArtifactName(mimeType: string): string {
  if (!mimeType || !mimeType.includes('/')) {
    return '';
  }
  return mimeType.replace('/', '.');
}

export function processThoughtText(text: string) {
  const withoutMarkers = (text || '')
    .replace('/*PLANNING*/', '')
    .replace('/*ACTION*/', '');
  return sanitizeContentText(withoutMarkers);
}

export function sanitizeContentText(text: string) {
  const pattern = /^\s*(?:[\w\- ]+\s+)?(?:tool|agent)\s+reported:?\s*/i;
  return (text || '').replace(pattern, '');
}

export function updateRedirectUri(urlString: string, newRedirectUri: string): string {
  try {
    const url = new URL(urlString);
    const searchParams = url.searchParams;
    searchParams.set('redirect_uri', newRedirectUri);
    return url.toString();
  } catch (error) {
    console.warn('Failed to update redirect URI: ', error);
    return urlString;
  }
}


