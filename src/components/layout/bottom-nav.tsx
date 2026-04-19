"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon as CalendarOutline,
  UserGroupIcon as UserGroupOutline,
  CubeIcon as CubeOutline,
  Bars3Icon as Bars3Outline,
} from "@heroicons/react/24/outline";
import {
  CalendarDaysIcon as CalendarSolid,
  UserGroupIcon as UserGroupSolid,
  CubeIcon as CubeSolid,
  Bars3Icon as Bars3Solid,
} from "@heroicons/react/24/solid";

const tabs = [
  { name: "Calendar", href: "/calendar", outline: CalendarOutline, solid: CalendarSolid },
  { name: "Clients", href: "/clients", outline: UserGroupOutline, solid: UserGroupSolid },
  { name: "Products", href: "/products", outline: CubeOutline, solid: CubeSolid },
  { name: "More", href: "/settings", outline: Bars3Outline, solid: Bars3Solid },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white xl:hidden dark:border-white/10 dark:bg-gray-900">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = isActive ? tab.solid : tab.outline;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="size-6" />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
