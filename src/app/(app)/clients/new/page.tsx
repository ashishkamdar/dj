import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/actions/clients";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading title="Add Client" />

      <form action={createClient} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Shop Name"
                name="shopName"
                required
                placeholder="e.g. Shree Krishna Sweets"
              />
            </div>

            <Input
              label="Owner Name"
              name="ownerName"
              placeholder="e.g. Ramesh Patel"
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              placeholder="e.g. 9876543210"
            />

            <Input
              label="Opening Balance"
              name="openingBalance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />

            <Input
              label="GSTIN"
              name="gstNumber"
              placeholder="e.g. 24XXXXX1234X1Z5"
            />

            <div className="sm:col-span-2">
              <Input
                label="Address"
                name="address"
                placeholder="Full address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isRecurring"
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  Recurring client
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/clients">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Save Client</Button>
        </div>
      </form>
    </div>
  );
}
