/**
 * crypto.ts — Secure client-side hashing utility using the Web Cryptography API.
 */

/**
 * Hashes a password using SHA-256 with a static salt to prevent raw plaintext exposure in localStorage.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = "strata_salt_5289_"; // Static salt for offline hashing consistency
  const data = encoder.encode(salt + password);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
