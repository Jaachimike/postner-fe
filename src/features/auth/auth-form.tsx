"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/feedback";
import { toMessage } from "@/lib/api/errors";
import { useLogin, useRegister } from "@/features/auth/hooks";
import {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from "@/features/auth/schema";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/review";
  const login = useLogin(next);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => login.mutate(values))}
      noValidate
    >
      <header className="mb-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to pick up your queue.</p>
      </header>

      <ErrorNote message={login.isError ? toMessage(login.error) : null} />

      <Field label="Email" htmlFor="login_email" error={errors.email?.message}>
        <Input
          id="login_email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field label="Password" htmlFor="login_password" error={errors.password?.message}>
        <Input
          id="login_password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Button type="submit" size="lg" loading={login.isPending} className="mt-1">
        Sign in
      </Button>

      <p className="text-center text-sm text-ink-muted">
        No account?{" "}
        <Link href="/register" className="font-medium text-ink underline underline-offset-4">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const next = useSearchParams().get("next") ?? "/brands";
  const signUp = useRegister(next);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        signUp.mutate({ ...values, name: values.name || "" }),
      )}
      noValidate
    >
      <header className="mb-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One account, one workspace. Brands come next.
        </p>
      </header>

      <ErrorNote message={signUp.isError ? toMessage(signUp.error) : null} />

      <Field label="Email" htmlFor="reg_email" error={errors.email?.message}>
        <Input
          id="reg_email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="reg_password"
        error={errors.password?.message}
        hint="At least 8 characters."
      >
        <Input
          id="reg_password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Field label="Name" htmlFor="reg_name" optional error={errors.name?.message}>
        <Input
          id="reg_name"
          autoComplete="name"
          placeholder="Your name"
          {...register("name")}
        />
      </Field>

      <Button type="submit" size="lg" loading={signUp.isPending} className="mt-1">
        Create account
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
