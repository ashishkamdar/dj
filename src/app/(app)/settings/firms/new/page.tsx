import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { createFirm } from "@/actions/firms";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function NewFirmPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading title="Add Firm" />

      <form action={createFirm} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Firm Name"
                name="name"
                required
                placeholder="e.g. Kachaa Pakka Catering"
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Address"
                name="address"
                placeholder="Full address"
              />
            </div>

            <Input
              label="Phone"
              name="phone"
              type="tel"
              placeholder="e.g. 9876543210"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="e.g. info@example.com"
            />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            GST Details
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isGstRegistered"
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  GST Registered
                </span>
              </label>
            </div>

            <Input
              label="GST Number"
              name="gstNumber"
              placeholder="e.g. 24AABCU9603R1ZM"
            />

            <Input
              label="State Code"
              name="stateCode"
              placeholder="e.g. 24"
            />

            <Input
              label="CGST Rate (%)"
              name="cgstPercent"
              type="number"
              step="0.01"
              placeholder="e.g., 2.5"
              defaultValue="0"
            />

            <Input
              label="SGST Rate (%)"
              name="sgstPercent"
              type="number"
              step="0.01"
              placeholder="e.g., 2.5"
              defaultValue="0"
            />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Bank Details
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Bank Name"
                name="bankName"
                placeholder="e.g. State Bank of India"
              />
            </div>

            <Input
              label="Account Number"
              name="bankAccount"
              placeholder="Account number"
            />

            <Input
              label="IFSC Code"
              name="bankIfsc"
              placeholder="e.g. SBIN0001234"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/settings/firms">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Save Firm</Button>
        </div>
      </form>
    </div>
  );
}
