import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterValues } from "~/lib/validators/auth";
import { register as registerUser } from "~/lib/auth";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AuthLayout, GoogleButton, OrDivider } from "~/components/auth/auth-layout";
import { PasswordInput } from "~/components/auth/password-input";
import { Spinner } from "~/components/ui/spinner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    try {
      await registerUser(values.email, values.password, values.name);
      toast.success("Account created");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error)?.message ?? "Registration failed");
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with Nvoicely"
      footer={
        <>
          Have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" />
      <OrDivider />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Jane Doe" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="At least 8 characters" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" placeholder="Re-enter password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
