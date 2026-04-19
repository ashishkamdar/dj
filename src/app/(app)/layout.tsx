import { requireAuth } from "@/lib/session";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="pb-20 xl:pl-64 xl:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
