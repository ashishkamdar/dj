import { getDashboardStats, approveTenant } from "@/actions/super-admin";
import { requireSuperAdmin } from "@/lib/super-admin-session";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SuperAdminDashboard() {
  await requireSuperAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard name="Active Tenants" value={stats.tenants.active} />
        <StatCard name="Pending" value={stats.tenants.pending} />
        <StatCard name="Expired" value={stats.tenants.expired} />
        <StatCard name="Suspended" value={stats.tenants.suspended} />
        <StatCard name="Total Orders" value={stats.totalOrders} />
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pending Approvals
          </h2>
        </CardHeader>
        <CardBody>
          {stats.pendingTenants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No pending tenants.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-white/10">
              {stats.pendingTenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tenant.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tenant.slug} &middot; {tenant.ownerName} &middot;{" "}
                      {tenant.ownerEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color="yellow">Pending</Badge>
                    <form
                      action={async () => {
                        "use server";
                        await approveTenant(tenant.id);
                      }}
                    >
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
