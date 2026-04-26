import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { logoutAction } from "@/actions/auth";
import { SectionHeading } from "@/components/ui/section-heading";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import {
  BuildingOfficeIcon,
  UsersIcon,
  CloudArrowDownIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const settingsLinks = [
  {
    name: "Firms",
    description: "Manage your business firms and GST details",
    href: "/settings/firms",
    icon: BuildingOfficeIcon,
  },
  {
    name: "Users",
    description: "Manage users and PIN access",
    href: "/settings/users",
    icon: UsersIcon,
  },
  {
    name: "Backup & Restore",
    description: "Download database backup or restore from file",
    href: "/settings/backup",
    icon: CloudArrowDownIcon,
  },
];

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Settings"
        description="Manage your application settings"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 dark:bg-gray-800/50 dark:ring-white/10 dark:hover:bg-white/5"
          >
            <div className="flex items-center gap-4">
              <item.icon className="size-8 text-gray-400 dark:text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* Logout */}
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-4 rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-red-50 dark:bg-gray-800/50 dark:ring-white/10 dark:hover:bg-red-900/20"
        >
          <ArrowRightStartOnRectangleIcon className="size-8 text-red-500" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Logout
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sign out of your account
            </p>
          </div>
        </button>
      </form>
    </div>
  );
}
