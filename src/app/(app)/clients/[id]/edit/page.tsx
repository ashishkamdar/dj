import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getClient, updateClient } from "@/actions/clients";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const client = await getClient(Number(id));

  if (!client) {
    notFound();
  }

  const updateWithId = updateClient.bind(null, client.id);

  return (
    <div className="space-y-6">
      <SectionHeading title="Edit Client" />

      <form action={updateWithId} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Shop Name"
                name="shopName"
                required
                defaultValue={client.shopName}
              />
            </div>

            <Input
              label="Owner Name"
              name="ownerName"
              defaultValue={client.ownerName ?? ""}
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={client.phone ?? ""}
            />

            <Input
              label="Opening Balance"
              name="openingBalance"
              type="number"
              step="0.01"
              min="0"
              defaultValue={client.openingBalance ?? 0}
            />

            <Input
              label="GSTIN"
              name="gstNumber"
              defaultValue={client.gstNumber ?? ""}
            />

            <div className="sm:col-span-2">
              <Input
                label="Address"
                name="address"
                defaultValue={client.address ?? ""}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isRecurring"
                  defaultChecked={client.isRecurring ?? false}
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
          <Link href={`/clients/${client.id}`}>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Update Client</Button>
        </div>
      </form>
    </div>
  );
}
