"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getCsrfToken } from "@/lib/web/csrf";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

type AuthMode = "login" | "register";

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { key: "weak", barClassName: "bg-rose-500", textClassName: "text-rose-600", width: "w-1/4" };
  }
  if (score <= 3) {
    return { key: "medium", barClassName: "bg-amber-500", textClassName: "text-amber-600", width: "w-2/4" };
  }
  if (score === 4) {
    return { key: "strong", barClassName: "bg-sky-500", textClassName: "text-sky-600", width: "w-3/4" };
  }

  return { key: "very-strong", barClassName: "bg-emerald-500", textClassName: "text-emerald-600", width: "w-full" };
}

export function AuthForm({
  mode,
  locale,
  redirectTo,
}: {
  mode: AuthMode;
  locale: Locale;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const text = t(locale);
  const isThai = locale === "th";
  const schema = mode === "login" ? loginSchema : registerSchema;

  type FormValues = {
    name?: string;
    email: string;
    password: string;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues:
      mode === "register"
        ? { name: "", email: "", password: "" }
        : { email: "", password: "" },
  });

  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? "";
  const passwordStrength = getPasswordStrength(passwordValue);
  const passwordStrengthLabel =
    passwordStrength.key === "weak"
      ? isThai ? "อ่อน" : "Weak"
      : passwordStrength.key === "medium"
        ? isThai ? "ปานกลาง" : "Medium"
        : passwordStrength.key === "strong"
          ? isThai ? "แข็งแรง" : "Strong"
          : isThai ? "แข็งแรงมาก" : "Very strong";

  const passwordChecks = [
    { label: text.auth.checks.length, passed: passwordValue.length >= 8 },
    { label: text.auth.checks.mixedCase, passed: /[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue) },
    { label: text.auth.checks.number, passed: /\d/.test(passwordValue) },
    { label: text.auth.checks.symbol, passed: /[^A-Za-z0-9]/.test(passwordValue) },
  ];
  const isRegisterPasswordStrongEnough = passwordStrength.key === "strong" || passwordStrength.key === "very-strong";

  const submitHandler = form.handleSubmit(async (values) => {
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();
    if (!response.ok) {
      if (mode === "login" && response.status === 401) {
        toast.error(isThai ? "Username หรือ password ผิด" : "Username or password is incorrect");
        return;
      }

      toast.error(data.issues?.[0] ?? data.message ?? (isThai ? "ทำรายการไม่สำเร็จ" : "Request failed"));
      return;
    }

    if (mode === "register") {
      toast.success(text.auth.createdToast);
      router.push("/login");
      router.refresh();
      return;
    }

    toast.success(text.auth.signedInToast);
    router.push(redirectTo || (data.user.role === "admin" ? "/admin" : "/dashboard"));
    router.refresh();
  });

  return (
    <div
      className="space-y-4"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void submitHandler();
        }
      }}
    >
      {mode === "register" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">{text.auth.name}</label>
            <Input {...form.register("name" as const)} placeholder={text.auth.namePlaceholder} />
            <p className="text-xs text-rose-600">{String(form.formState.errors.name?.message ?? "")}</p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">{text.auth.email}</label>
        <Input {...form.register("email")} type="email" placeholder="name@organization.edu" />
        <p className="text-xs text-rose-600">{String(form.formState.errors.email?.message ?? "")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">{text.auth.password}</label>
        <div className="relative">
          <Input
            {...form.register("password")}
            type={showPassword ? "text" : "password"}
            placeholder={text.auth.passwordPlaceholder}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={showPassword ? (isThai ? "ซ่อนรหัสผ่าน" : "Hide password") : isThai ? "แสดงรหัสผ่าน" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition hover:text-zinc-800"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-rose-600">{String(form.formState.errors.password?.message ?? "")}</p>
        {mode === "register" && passwordValue ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className={`h-full rounded-full transition-all ${passwordStrength.barClassName} ${passwordStrength.width}`} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={passwordStrength.textClassName}>
                {text.auth.security}: {passwordStrengthLabel}
              </span>
              <span className="text-zinc-500">{text.auth.passwordHint}</span>
            </div>
            {!isRegisterPasswordStrongEnough ? (
              <p className="text-xs text-amber-600">
                {isThai ? "ต้องได้ระดับ แข็งแรง หรือ แข็งแรงมาก จึงจะสมัครได้" : "Password must reach Strong or Very strong to register."}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        className="w-full gap-2"
        disabled={form.formState.isSubmitting || (mode === "register" && !isRegisterPasswordStrongEnough)}
        onClick={() => void submitHandler()}
      >
        {form.formState.isSubmitting ? (
          <>
            <Spinner className="text-white" />
            {text.auth.submitting}
          </>
        ) : mode === "login" ? (
          text.auth.submitLogin
        ) : (
          text.auth.submitRegister
        )}
      </Button>

      {mode === "register" ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
          <p className="text-sm font-medium text-zinc-800">{text.auth.checklist}</p>
          <div className="mt-3 space-y-2">
            {passwordChecks.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 text-sm transition-all duration-200",
                  item.passed ? "text-emerald-700" : "text-zinc-500",
                )}
              >
                {item.passed ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0 opacity-70" />}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-center text-sm text-zinc-500">
        {mode === "login" ? text.auth.needAccount : text.auth.haveAccount}{" "}
        <Link className="font-medium text-sky-700" href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? text.auth.registerLink : text.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
