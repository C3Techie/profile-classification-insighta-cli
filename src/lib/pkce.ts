import crypto from 'crypto';

/**
 * Generate a cryptographically random state string for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a PKCE code_verifier (43–128 chars, URL-safe).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derive the PKCE code_challenge from the verifier using S256 method.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
