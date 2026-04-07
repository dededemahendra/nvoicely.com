# CLAUDE_AUTH.md — Authentication & Session Management

## Strategy

Authentication uses **Appwrite Auth** with email/password sessions. TanStack Start server functions validate sessions server-side via the Appwrite API key. Protected routes redirect unauthenticated users to `/login`.

---

## Auth Helpers

```ts
// app/lib/auth.ts
import { account } from "~/lib/appwrite";
import { serverClient } from "~/lib/appwrite";
import { Account } from "node-appwrite";

// Client-side: get current session user
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

// Client-side: login
export async function login(email: string, password: string) {
  return await account.createEmailPasswordSession(email, password);
}

// Client-side: register
export async function register(email: string, password: string, name: string) {
  await account.create("unique()", email, password, name);
  return await login(email, password);
}

// Client-side: logout
export async function logout() {
  return await account.deleteSession("current");
}

// Server-side: validate session from cookie
export async function getServerUser(sessionCookie: string) {
  const serverAccount = new Account(serverClient);
  try {
    serverClient.setSession(sessionCookie);
    return await serverAccount.get();
  } catch {
    return null;
  }
}
```

---

## Zod Schemas

```ts
// app/lib/validators/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

---

## Route Protection

```tsx
// app/routes/__root.tsx
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "~/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register"];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isPublic = PUBLIC_ROUTES.some(r => location.pathname.startsWith(r));
    if (isPublic) return;

    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
```

---

## Login Page

```tsx
// app/routes/login.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "~/lib/validators/auth";
import { login } from "~/lib/auth";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "~/components/ui/form";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: { email: string; password: string }) {
    try {
      await login(values.email, values.password);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account? <a href="/register" className="underline">Register</a>
        </p>
      </div>
    </div>
  );
}
```

---

## Auth State Hook

```ts
// app/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, logout, register } from "~/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate({ to: "/" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
  });

  return { user, isLoading, login: loginMutation, logout: logoutMutation };
}
```
