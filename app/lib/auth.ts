import { account } from "~/lib/appwrite";

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  return await account.createEmailPasswordSession(email, password);
}

export async function register(email: string, password: string, name: string) {
  await account.create("unique()", email, password, name);
  return await login(email, password);
}

export async function logout() {
  return await account.deleteSession("current");
}
