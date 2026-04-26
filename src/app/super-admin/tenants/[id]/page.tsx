import {
  getTenant,
  getTenantUsageStats,
  getTenantDomains,
  getSubscriptionPayments,
  approveTenant,
  suspendTenant,
  reactivateTenant,
  updateTenantSubscription,
  recordSubscriptionPayment,
} from "@/actions/super-admin";
import { requireSuperAdmin } from "@/lib/super-admin-session";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusColors = {
  active: "green",
  pending: "yellow",
  expired: "red",
  suspended: "gray",
} as const;

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const tenantId = Number(id);

  const [tenant, usage, domains, payments] = await Promise.all([
    getTenant(tenantId),
    getTenantUsageStats(tenantId),
    getTenantDomains(tenantId),
    getSubscriptionPayments(tenantId),
  ]);

  if (!tenant) return notFound();

  return (
    <div className="space-y-8">
      {/* Back link + title */}
      <div>
        <Link
          href="/super-admin/tenants"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          &larr; Back to Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {tenant.name}
        </h1>
      </div>

      {/* Owner Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Owner Info
          </h2>
        </CardHeader>
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {tenant.ownerName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {tenant.ownerEmail || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {tenant.ownerPhone || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </dt>
              <dd className="mt-1">
                <Badge
                  color={
                    statusColors[
                      tenant.status as keyof typeof statusColors
                    ] ?? "gray"
                  }
                >
                  {tenant.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* Usage Stats */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Usage Stats
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard name="Products" value={usage.products} />
          <StatCard name="Clients" value={usage.clients} />
          <StatCard name="Orders" value={usage.orders} />
          <StatCard name="Invoices" value={usage.invoices} />
        </div>
      </div>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subscription
          </h2>
        </CardHeader>
        <CardBody>
          <form
            action={async (formData: FormData) => {
              "use server";
              await updateTenantSubscription(tenantId, formData);
            }}
            className="grid gap-4 sm:grid-cols-3"
          >
            <Select
              name="plan"
              label="Plan"
              defaultValue={tenant.subscriptionPlan ?? "free"}
              options={[
                { value: "free", label: "Free" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <Input
              name="expiresAt"
              label="Expiry Date"
              type="date"
              defaultValue={
                tenant.subscriptionExpiresAt
                  ? new Date(tenant.subscriptionExpiresAt)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
            />
            <div className="flex items-end">
              <Button type="submit" size="md">
                Save
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Domains
          </h2>
        </CardHeader>
        <CardBody>
          {domains.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No custom domains configured.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-white/10">
              {domains.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    {d.domain}
                  </span>
                  <Badge color={d.isPrimary ? "green" : "gray"}>
                    {d.isPrimary ? "Primary" : "Secondary"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Payment History + Record Payment */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment History
          </h2>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Record new payment form */}
          <form
            action={async (formData: FormData) => {
              "use server";
              await recordSubscriptionPayment(tenantId, formData);
            }}
            className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-5 dark:border-white/10"
          >
            <Input
              name="amount"
              label="Amount"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
            />
            <Input name="date" label="Date" type="date" required />
            <Select
              name="mode"
              label="Mode"
              options={[
                { value: "cash", label: "Cash" },
                { value: "upi", label: "UPI" },
                { value: "bank", label: "Bank" },
              ]}
            />
            <Input name="notes" label="Notes" placeholder="Optional notes" />
            <div className="flex items-end">
              <Button type="submit" size="md">
                Record Payment
              </Button>
            </div>
          </form>

          {/* Payment table */}
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No payments recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Mode
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {p.amount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {p.mode}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {p.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Actions
          </h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {tenant.status === "pending" && (
              <form
                action={async () => {
                  "use server";
                  await approveTenant(tenantId);
                }}
              >
                <Button type="submit">Approve</Button>
              </form>
            )}

            {tenant.status === "active" && (
              <form
                action={async () => {
                  "use server";
                  await suspendTenant(tenantId);
                }}
              >
                <Button type="submit" variant="danger">
                  Suspend
                </Button>
              </form>
            )}

            {tenant.status === "suspended" && (
              <form
                action={async () => {
                  "use server";
                  await reactivateTenant(tenantId);
                }}
              >
                <Button type="submit">Reactivate</Button>
              </form>
            )}

            <Link href={`/super-admin/tenants/${tenant.id}/impersonate`}>
              <Button variant="secondary">Impersonate</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
