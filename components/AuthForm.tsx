"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AuthFormProps {
  redirectPath?: string;
}

export function AuthForm({ redirectPath }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!hasAccepted) {
      toast.error("Please accept the Terms and Privacy Policy to continue");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirect: redirectPath ?? "dashboard",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to send login link");
      }

      toast.success("Code sent! Check your email or enter the code below.");
      setShowOtpInput(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to send login link"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!otp) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);

    try {
      // Redirect to the callback URL with email and code
      const redirectTo = redirectPath ?? "dashboard";
      const callbackUrl = `/auth/callback?email=${encodeURIComponent(email)}&code=${otp}&redirect=${encodeURIComponent(redirectTo)}`;
      window.location.href = callbackUrl;
    } catch (error) {
      console.error(error);
      toast.error("Unable to verify code");
      setIsSubmitting(false);
    }
  };

  if (showOtpInput) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            We sent a 6-digit code to <span className="text-accent-cyan">{email}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowOtpInput(false)}
            className="text-xs text-gray-400 hover:text-accent-cyan underline"
          >
            Use a different email
          </button>
        </div>
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm font-medium text-accent-cyan">
              Enter 6-digit code
            </label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              required
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify code"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-accent-cyan">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@mmoguild.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-3">
        <label className="flex items-start gap-3 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={hasAccepted}
            onChange={(event) => setHasAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-accent-cyan/40 bg-transparent accent-accent-cyan"
          />
          <span>
            I agree to the
            <Link href="/terms-of-use" className="mx-1 text-accent-cyan hover:text-accent-purple">
              Terms of Use
            </Link>
            and
            <Link href="/privacy-policy" className="ml-1 text-accent-cyan hover:text-accent-purple">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <Button type="submit" className="w-full" disabled={isSubmitting || !hasAccepted}>
          {isSubmitting ? "Sending code..." : "Send login code"}
        </Button>
      </div>
    </form>
  );
}
