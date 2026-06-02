import { account } from "~/lib/appwrite";
import { OAuthProvider } from "appwrite";

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  // Clear any stale session before creating a new one — Appwrite rejects
  // createEmailPasswordSession when a session is already active.
  try {
    await account.deleteSession("current");
  } catch {
    // no active session, ignore
  }
  return await account.createEmailPasswordSession(email, password);
}

export async function register(email: string, password: string, name: string) {
  await account.create("unique()", email, password, name);
  return await login(email, password);
}

export async function logout() {
  return await account.deleteSession("current");
}

// Redirects the browser to Google. Requires the Google OAuth provider to be
// enabled in the Appwrite console; otherwise Appwrite redirects to the failure
// URL (/login) without creating a session.
export function loginWithGoogle() {
  const origin = window.location.origin;
  account.createOAuth2Session(OAuthProvider.Google, `${origin}/`, `${origin}/login`);
}
