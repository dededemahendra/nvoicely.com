import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "~/components/shared/AppLayout";
import { Skeleton } from "~/components/ui/skeleton";
import { getCurrentUser } from "~/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Appwrite's browser SDK has no cookie context during SSR — checking
    // here would always 401 and bounce the user to /login on every reload.
    // Defer to the client-side guard in the component.
    if (typeof document === "undefined") {
      return { user: null as any };
    }
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const ctx = Route.useRouteContext();
  const navigate = useNavigate();
  const [user, setUser] = useState(ctx.user);
  const [checking, setChecking] = useState(!ctx.user);

  useEffect(() => {
    if (ctx.user) return;
    let cancelled = false;
    getCurrentUser().then((u) => {
      if (cancelled) return;
      if (!u) {
        navigate({ to: "/login" });
      } else {
        setUser(u);
        // Patch the route context so child routes that read `user` work
        (ctx as any).user = u;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx, navigate]);

  if (checking || !user) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
