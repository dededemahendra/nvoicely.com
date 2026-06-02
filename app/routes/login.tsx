import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { AuthLayout, GoogleButton, OrDivider } from "~/components/auth/auth-layout";
import { PasswordInput } from "~/components/auth/password-input";
import {
  login,
  sendEmailCode,
  sendMagicLink,
  verifyEmailCode,
} from "~/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Method = "passwordless" | "password";
type Stage = "email" | "code" | "magic";
type Pending = null | "code" | "magic" | "verify" | "password";

function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("passwordless");
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const busy = pending !== null;

  function resetToEmail() {
    setStage("email");
    setCode("");
    setUserId("");
  }

  async function handleSendCode() {
    if (!emailValid) return toast.error("Enter a valid email address");
    setPending("code");
    try {
      const id = await sendEmailCode(email);
      setUserId(id);
      setStage("code");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Could not send the code");
    } finally {
      setPending(null);
    }
  }

  async function handleSendMagic() {
    if (!emailValid) return toast.error("Enter a valid email address");
    setPending("magic");
    try {
      await sendMagicLink(email);
      setStage("magic");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Could not send the magic link");
    } finally {
      setPending(null);
    }
  }

  async function handleVerify() {
    if (code.length < 6) return;
    setPending("verify");
    try {
      await verifyEmailCode(userId, code);
      navigate({ to: "/" });
    } catch {
      toast.error("That code is invalid or expired");
      setPending(null);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return toast.error("Enter a valid email address");
    setPending("password");
    try {
      await login(email, password);
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error)?.message ?? "Login failed");
      setPending(null);
    }
  }

  return (
    <AuthLayout
      title="Sign in to Ledger"
      subtitle="Continue with email — we'll send a code or a magic link."
      footer="New here? Just enter your email and we'll create your account."
    >
      <GoogleButton label="Continue with Google" />
      <OrDivider />

      {method === "password" ? (
        <form onSubmit={handlePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {pending === "password" && <Spinner />}
            Sign in
          </Button>
          <button
            type="button"
            onClick={() => {
              setMethod("passwordless");
              resetToEmail();
            }}
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail className="h-4 w-4" />
            Use a code or magic link instead
          </button>
        </form>
      ) : stage === "email" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={handleSendCode}>
            {pending === "code" ? <Spinner /> : <KeyRound className="h-4 w-4" />}
            Email me a code
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={handleSendMagic}
          >
            {pending === "magic" ? <Spinner /> : <Mail className="h-4 w-4" />}
            Send a magic link
          </Button>
          <button
            type="button"
            onClick={() => setMethod("password")}
            className="mx-auto block text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in with a password
          </button>
        </div>
      ) : stage === "code" ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground">{email}</span>.
          </p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={handleVerify}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full" disabled={code.length < 6 || busy} onClick={handleVerify}>
            {pending === "verify" && <Spinner />}
            Verify and sign in
          </Button>
          <button
            type="button"
            onClick={resetToEmail}
            className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Use a different email
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            We sent a magic link to <span className="text-foreground">{email}</span>. Open it on
            this device to sign in.
          </p>
          <Button variant="outline" className="w-full" onClick={resetToEmail}>
            Use a different email
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
