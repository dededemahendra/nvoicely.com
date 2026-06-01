import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "~/components/app-shell";
import { getCurrentUser } from "~/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  // Disable SSR for the entire authenticated subtree. Appwrite's browser SDK
  // has no cookie context on the server, so any auth check during SSR would
  // 401 and bounce the user to /login on every full reload. Auth-gated pages
  // are per-user anyway, so server rendering provides no SEO/perf benefit.
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={{ id: user.$id, name: user.name, email: user.email }}>
      <Outlet />
    </AppShell>
  );
}
