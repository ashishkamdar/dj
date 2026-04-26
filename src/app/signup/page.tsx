"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signupAction } from "@/actions/signup";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function SignupForm() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (isSuccess) {
    return (
      <div className="w-full max-w-md px-6 text-center">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12" />
        </div>
        <div className="rounded-lg bg-green-50 p-6 ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Registration Successful!
          </h2>
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            Your application has been submitted. We will review it and activate
            your account shortly. You will receive an email once your account is
            ready.
          </p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signupAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-md px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 flex justify-center">
          <Logo className="h-12" />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Register your business
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:shadow-none dark:ring-white/10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            name="name"
            label="Business Name"
            required
            placeholder="Your Business Name"
          />
          <Input
            name="slug"
            label="Desired Subdomain"
            required
            placeholder="my-business"
            pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
            title="3-30 chars, lowercase letters, numbers, hyphens"
          />
          <p className="-mt-3 text-xs text-gray-500 dark:text-gray-400">
            Your app will be at{" "}
            <span className="font-medium">your-slug.areakpi.in</span>
          </p>
          <Input
            name="ownerName"
            label="Your Name"
            required
            placeholder="Full Name"
          />
          <Input
            name="ownerEmail"
            label="Email"
            type="email"
            required
            placeholder="you@example.com"
          />
          <Input
            name="ownerPhone"
            label="Phone"
            type="tel"
            placeholder="+91 98765 43210"
          />

          {error && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Submitting..." : "Register"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white py-12 dark:bg-gray-900">
      <Suspense
        fallback={
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
