import { requireAuth } from "@/lib/session";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ImpersonationBanner } from "@/components/super-admin/impersonation-banner";
import { RecurringPendingBanner } from "@/components/recurring/pending-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <ImpersonationBanner />
      <Sidebar userName={user.name} userRole={user.role} />
      {/*
        overflow-x-clip on the inner content wrapper acts as a durable
        guard: even if a future change inside any app page produces
        content wider than the viewport, the page won't sprout a
        horizontal scrollbar. Tables and other elements that need to
        scroll horizontally manage their own overflow internally
        (e.g. <div class="overflow-x-auto"> wrappers).
      */}
      <main className="pb-20 xl:pl-64 xl:pb-0 overflow-x-clip">
        <RecurringPendingBanner />
        <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 overflow-x-clip">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
