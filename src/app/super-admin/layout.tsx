import { getSuperAdminSession } from "@/lib/super-admin-session";
import { superAdminLogoutAction } from "@/actions/super-admin";
import { LogoIcon } from "@/components/ui/logo";
import Link from "next/link";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSuperAdminSession();

  // If not authenticated, render children directly (login page)
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/super-admin" className="flex items-center gap-3">
              <LogoIcon className="size-8" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Kachaa Pakka Admin
              </span>
            </Link>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/super-admin"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/super-admin/tenants"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Tenants
            </Link>
            <form action={superAdminLogoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
