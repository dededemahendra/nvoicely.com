import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { AuthLayout, GoogleButton, OrDivider } from "~/components/auth/auth-layout";
import { PasswordInput } from "~/components/auth/password-input";
import { login, sendEmailCode, verifyEmailCode } from "~/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Stage = "email" | "code";
type Pending = null | "send" | "verify" | "password";

function LoginPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const busy = pending !== null;

  function resetToEmail() {
    setStage("email");
    setCode("");
    setUserId("");
  }

  async function handleSend() {
    if (!emailValid) return toast.error("Enter a valid email address");
    setPending("send");
    try {
      const id = await sendEmailCode(email);
      setUserId(id);
      setStage("code");
    } catch (err) {
      toast.error((err as Error)?.message ?? "Could not send the sign-in email");
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

  async function handlePassword() {
    setPending("password");
    try {
      await login(email, password);
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error)?.message ?? "Login failed");
      setPending(null);
    }
  }

  function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return toast.error("Enter a valid email address");
    if (showPassword) handlePassword();
    else handleSend();
  }

  return (
    <AuthLayout
      title="Sign in to Ledger"
      subtitle="Continue with email and we'll send you a code or a magic link."
      footer="New here? Just enter your email and we'll create your account."
    >
      <GoogleButton label="Continue with Google" />
      <OrDivider />

      <AnimatePresence mode="wait" initial={false}>
        {stage === "email" ? (
          <motion.form
            key="email"
            onSubmit={onEmailSubmit}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-4"
          >
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

            <AnimatePresence initial={false}>
              {showPassword && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="-mx-1 overflow-hidden"
                >
                  <div className="space-y-2 px-1 py-1">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full" disabled={busy}>
              {pending === "send" || pending === "password" ? (
                <Spinner />
              ) : !showPassword ? (
                <Mail className="h-4 w-4" />
              ) : null}
              {showPassword ? "Sign in" : "Continue with email"}
            </Button>

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="mx-auto block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? "Use a code or magic link instead" : "Sign in with a password"}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="space-y-5"
          >
            <p className="text-sm text-muted-foreground">
              We sent a sign-in code and link to <span className="text-foreground">{email}</span>.
              Enter the code below, or open the link from your inbox.
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
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
