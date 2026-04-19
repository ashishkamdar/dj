import { requireAdmin } from "@/lib/session";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import {
  CloudArrowDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export default async function BackupPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Backup & Restore"
        description="Download a backup of your database"
      />

      {/* Backup Download */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="flex items-start gap-4">
          <CloudArrowDownIcon className="size-8 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Download Backup
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Download a copy of your entire database. Keep this file safe — it
              contains all your orders, invoices, clients, and settings.
            </p>
            <div className="mt-4">
              <a href="/api/backup/download">
                <Button>
                  <CloudArrowDownIcon className="size-4 mr-2" />
                  Backup Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Notice */}
      <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="size-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Restore
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              Database restore functionality is coming soon. For now, you can
              manually replace the database file on the server to restore from a
              backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
