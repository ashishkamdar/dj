import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getClient } from "@/actions/clients";
import { createPayment } from "@/actions/payments";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { todayString } from "@/lib/utils";

export default async function PaymentPage({
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

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Record Payment"
        description={`Client: ${client.shopName}`}
      />

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <form
          action={async (formData: FormData) => {
            "use server";
            await createPayment(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clientId" value={client.id} />

          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Enter amount"
          />

          <Input
            label="Date"
            name="date"
            type="date"
            required
            defaultValue={todayString()}
          />

          <Select
            label="Payment Mode"
            name="mode"
            defaultValue="cash"
            options={[
              { value: "cash", label: "Cash" },
              { value: "upi", label: "UPI" },
              { value: "bank", label: "Bank Transfer" },
            ]}
          />

          <div>
            <label
              htmlFor="notes"
              className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200"
            >
              Notes
            </label>
            <div className="mt-2">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Payment</Button>
            <a href={`/clients/${client.id}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
