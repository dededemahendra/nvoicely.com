import { account } from "~/lib/appwrite";
import { ID, OAuthProvider } from "appwrite";

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

async function clearStaleSession() {
  // Appwrite rejects creating a session when one is already active.
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, ignore
  }
}

// ----- Passwordless: email code (OTP) -----
// Creates the user if they don't exist yet; returns the userId needed to verify.
export async function sendEmailCode(email: string): Promise<string> {
  const token = await account.createEmailToken(ID.unique(), email);
  return token.userId;
}

export async function verifyEmailCode(userId: string, code: string) {
  await clearStaleSession();
  return account.createSession(userId, code);
}

// ----- Passwordless: magic link -----
export async function sendMagicLink(email: string) {
  const url = `${window.location.origin}/auth/verify`;
  await account.createMagicURLToken(ID.unique(), email, url);
}

// Used by the magic-link callback route.
export async function createSessionFromToken(userId: string, secret: string) {
  await clearStaleSession();
  return account.createSession(userId, secret);
}

// ----- Password (secondary) -----
export async function login(email: string, password: string) {
  await clearStaleSession();
  return account.createEmailPasswordSession(email, password);
}

export async function logout() {
  return account.deleteSession("current");
}

// ----- Google OAuth -----
// Requires the Google provider enabled in the Appwrite console.
export function loginWithGoogle() {
  const origin = window.location.origin;
  account.createOAuth2Session(OAuthProvider.Google, `${origin}/`, `${origin}/login`);
}
