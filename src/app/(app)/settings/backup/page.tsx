import { requireAdmin } from "@/lib/session";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { BackupRestoreForm } from "@/components/settings/backup-restore-form";

export default async function BackupPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Backup & Restore"
        description="Download a backup of your database or restore from a file"
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

      {/* Restore Upload */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="flex items-start gap-4">
          <CloudArrowUpIcon className="size-8 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Restore from Backup
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a previously downloaded backup file to restore your database.
              This will replace all current data. A backup of the current database
              will be saved automatically before restoring.
            </p>
            <div className="mt-4">
              <BackupRestoreForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
