"use client";

import { useState, useTransition } from "react";
import { createTenantManually } from "@/actions/super-admin";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import Link from "next/link";

export default function NewTenantPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createTenantManually(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/super-admin/tenants"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          &larr; Back to Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Add Tenant
        </h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tenant Details
          </h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
            <Input
              name="slug"
              label="Subdomain Slug"
              required
              placeholder="my-business"
              pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
              title="3-30 chars, lowercase letters, numbers, hyphens"
            />
            <Input
              name="name"
              label="Business Name"
              required
              placeholder="My Business"
            />
            <Input
              name="ownerName"
              label="Owner Name"
              required
              placeholder="John Doe"
            />
            <Input
              name="ownerEmail"
              label="Email"
              type="email"
              placeholder="owner@example.com"
            />
            <Input
              name="ownerPhone"
              label="Phone"
              type="tel"
              placeholder="+91 98765 43210"
            />
            <Select
              name="plan"
              label="Plan"
              defaultValue="free"
              options={[
                { value: "free", label: "Free" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <Input name="expiresAt" label="Expiry Date (optional)" type="date" />

            {error && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
