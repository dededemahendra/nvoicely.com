import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Spinner } from "~/components/ui/spinner";
import { Button } from "~/components/ui/button";
import { createSessionFromToken } from "~/lib/auth";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    userId: typeof search.userId === "string" ? search.userId : "",
    secret: typeof search.secret === "string" ? search.secret : "",
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { userId, secret } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId || !secret) {
        setError(true);
        return;
      }
      try {
        await createSessionFromToken(userId, secret);
        if (active) navigate({ to: "/" });
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, secret, navigate]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      {error ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            This sign-in link is invalid or has expired.
          </p>
          <Button asChild>
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Signing you in...
        </div>
      )}
    </div>
  );
}
