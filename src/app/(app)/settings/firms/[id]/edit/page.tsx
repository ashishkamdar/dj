import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getFirm, updateFirm } from "@/actions/firms";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function EditFirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const firm = await getFirm(Number(id));

  if (!firm) {
    notFound();
  }

  const updateWithId = updateFirm.bind(null, firm.id);

  return (
    <div className="space-y-6">
      <SectionHeading title="Edit Firm" />

      <form action={updateWithId} className="space-y-6">
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
                defaultValue={firm.name}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Address"
                name="address"
                defaultValue={firm.address ?? ""}
              />
            </div>

            <Input
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={firm.phone ?? ""}
            />

            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={firm.email ?? ""}
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
                  defaultChecked={firm.isGstRegistered ?? false}
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
              defaultValue={firm.gstNumber ?? ""}
            />

            <Input
              label="State Code"
              name="stateCode"
              defaultValue={firm.stateCode ?? ""}
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
                defaultValue={firm.bankName ?? ""}
              />
            </div>

            <Input
              label="Account Number"
              name="bankAccount"
              defaultValue={firm.bankAccount ?? ""}
            />

            <Input
              label="IFSC Code"
              name="bankIfsc"
              defaultValue={firm.bankIfsc ?? ""}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/settings/firms">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Update Firm</Button>
        </div>
      </form>
    </div>
  );
}
