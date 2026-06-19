import { useState, useCallback, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, Eye, EyeOff, Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"email" | "otp" | "magiclink">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (token) {
      setResetToken(token);
      if (emailParam) setEmail(emailParam);
      setVerified(true);
      setStep("otp");
    }
  }, [searchParams]);

  const validatePassword = useCallback((p: string): string | null => {
    if (p.length < 8) return "Password must be at least 8 characters.";
    if (p.length > 128) return "Password must not exceed 128 characters.";
    let cls = 0;
    if (/[A-Z]/.test(p)) cls++;
    if (/[a-z]/.test(p)) cls++;
    if (/[0-9]/.test(p)) cls++;
    if (/[^A-Za-z0-9]/.test(p)) cls++;
    if (cls < 3) return "Password must include at least 3 of: uppercase, lowercase, digit, special character.";
    return null;
  }, []);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email, method: "otp" });
      setStep("otp");
      setCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyResetOtp({ email, otp });
      setResetToken(res.resetToken);
      setVerified(true);
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { setError(pwdErr); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await api.auth.resetPasswordLink({ token: resetToken, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMagicLink() {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email, method: "magic-link" });
      setStep("magiclink");
      setCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email, method: "otp" });
      setCooldown(60);
    } catch { /* silent */ }
    finally { setLoading(false); }
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
            <h2 className="text-base font-semibold text-foreground mb-1">Password Reset</h2>
            <p className="text-sm text-muted-foreground mb-5">Your password has been updated. Sign in with your new password.</p>
            <Link to="/login" className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors inline-block">
              Sign in
            </Link>
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

          {step === "email" && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-1">Reset password</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose how to reset your password.</p>

              {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">{error}</div>}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <button type="button" disabled={loading} onClick={handleSendOtp}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Sending…" : "Send reset code"}
                </button>
                <button type="button" disabled={loading} onClick={handleSendMagicLink}
                  className="w-full py-2.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </div>
            </>
          )}

          {step === "otp" && !verified && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-1">Enter reset code</h2>
              <p className="text-sm text-muted-foreground mb-5">We sent a 6-digit code to <strong>{email}</strong>.</p>

              {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">{error}</div>}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Verification code</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors tracking-widest text-center font-mono"
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Verifying…" : "Verify code"}
                </button>

                <button type="button" disabled={cooldown > 0 || loading} onClick={handleResend}
                  className="w-full py-2 rounded-lg border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && verified && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-1">Set new password</h2>

              <div className="mb-5 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Code verified</span>
              </div>

              {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">{error}</div>}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 pr-10 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">8+ chars, 3 of 4: uppercase, lowercase, digit, special</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
                  <input
                    type={showPwd ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Resetting…" : "Reset password"}
                </button>
              </form>
            </>
          )}

          {step === "magiclink" && (
            <>
              <h2 className="text-base font-semibold text-foreground mb-1">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-5">
                We sent a reset link to <strong>{email}</strong>. Click the button in the email to reset your password.
              </p>

              {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">{error}</div>}

              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  The link expires in <strong className="text-foreground">24 hours</strong>.<br />
                  Didn't receive it? Check your spam folder.
                </p>
              </div>

              <div className="space-y-3">
                <button type="button" disabled={cooldown > 0 || loading} onClick={handleSendMagicLink}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend reset link"}
                </button>
                <Link to="/login" className="w-full py-2 rounded-lg border text-sm text-muted-foreground hover:text-foreground transition-colors inline-block text-center">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
