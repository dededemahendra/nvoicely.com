import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "~/lib/validators/auth";
import { login } from "~/lib/auth";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password);
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    }
  }

  return (
    <div className="grain min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Decorative concentric arcs */}
        <svg
          className="pointer-events-none absolute -bottom-40 -right-40 h-[640px] w-[640px] opacity-[0.07]"
          viewBox="0 0 400 400"
          fill="none"
        >
          {[60, 110, 160, 210, 260, 310].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} stroke="#f4ede0" strokeWidth="1" />
          ))}
        </svg>

        <div className="relative">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-[#f4ede0]">Ledger</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8aa39a]">·co</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-4xl leading-[1.05] text-[#f4ede0]">
            "The books should tell a story you're proud of."
          </p>
          <div className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8aa39a]">
            <span className="h-px w-8 bg-[#86b89c]" />
            Invoicing, refined
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#6e8a80]">
          <div>
            <div className="text-[#f4ede0] text-base font-display normal-case tracking-normal">∞</div>
            <div className="mt-1">multi-currency</div>
          </div>
          <div>
            <div className="text-[#f4ede0] text-base font-display normal-case tracking-normal">PDF</div>
            <div className="mt-1">native export</div>
          </div>
          <div>
            <div className="text-[#f4ede0] text-base font-display normal-case tracking-normal">cron</div>
            <div className="mt-1">recurring</div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-screen items-center justify-center p-6 lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-10 flex items-baseline gap-2 lg:hidden">
            <span className="font-display text-3xl leading-none">Ledger</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">·co</span>
          </div>

          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Sign in
          </p>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight">
            Welcome<br />back.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Enter your credentials to access your workspace.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Email
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Password
              </Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Continue →"}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            New to Ledger?{" "}
            <Link to="/register" className="text-foreground underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
