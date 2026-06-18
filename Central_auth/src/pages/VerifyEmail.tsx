import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { saveSession } from "../lib/auth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam === "invalid") {
      setTokenError("This verification link is invalid or has expired. Please request a new one.");
    }
  }, [errorParam]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    if (!tokenParam) return;

    setVerifyingToken(true);
    api.auth.verifyEmailLink(tokenParam)
      .then((res) => {
        saveSession({
          token: res.accessToken,
          expiresAt: res.expiresAt,
          user: res.user,
        });
        setSuccess(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
      })
      .catch((err) => {
        setTokenError(
          err instanceof Error && err.message.includes("400")
            ? "This verification link is invalid or has expired."
            : "Verification failed. Please try again or use the code below."
        );
      })
      .finally(() => setVerifyingToken(false));
  }, [tokenParam]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      await api.auth.sendVerification({ email });
      setCooldown(60);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [email]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyEmail({ email, otp });
      saveSession({
        token: res.accessToken,
        expiresAt: res.expiresAt,
        user: res.user,
      });
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">CentralAuth</h1>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-foreground mb-1">Email Verified</h2>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">CentralAuth</h1>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
            <h2 className="text-base font-semibold text-foreground mb-1">Verifying your email…</h2>
            <p className="text-sm text-muted-foreground">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">CentralAuth</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin Console</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>

          <h2 className="text-base font-semibold text-foreground mb-1">Verify your email</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {email ? <>We sent a verification code to <strong>{email}</strong>.</> : "Enter your email to verify."}
          </p>

          {tokenError && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{tokenError}</span>
            </div>
          )}

          {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleVerify} className="space-y-4">
            {!emailParam && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Verification code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors tracking-widest text-center font-mono"
              />
            </div>

            <button type="submit" disabled={loading || !email}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Verifying…" : "Verify email"}
            </button>

            <button type="button" disabled={cooldown > 0 || loading || !email} onClick={handleResend}
              className="w-full py-2 rounded-lg border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
