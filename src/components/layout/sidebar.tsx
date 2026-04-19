"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/actions/auth";

const navItems = [
  { name: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
  { name: "Clients", href: "/clients", icon: UserGroupIcon },
  { name: "Products", href: "/products", icon: CubeIcon },
  { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-64 xl:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-gray-50 px-6 dark:border-white/10 dark:bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            DJ
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            DJ Foods
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex gap-x-3 rounded-md px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "bg-gray-100 text-indigo-600 dark:bg-white/5 dark:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    <item.icon className="size-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-200 py-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {userName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userRole}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Log out"
                >
                  <ArrowRightStartOnRectangleIcon className="size-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
