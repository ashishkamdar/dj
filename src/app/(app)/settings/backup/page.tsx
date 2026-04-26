import { requireAdmin } from "@/lib/session";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default async function BackupPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Backup & Restore"
        description="Database backup and restore information"
      />

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="flex items-start gap-4">
          <ShieldCheckIcon className="size-8 text-indigo-400 dark:text-indigo-500 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Managed Backups
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Backups are managed by the system administrator. Your data is
              automatically backed up on a regular schedule. Contact support if
              you need a data export or restore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
