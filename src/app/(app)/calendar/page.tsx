import { requireAuth } from "@/lib/session";

export default async function CalendarPage() {
  const user = await requireAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Welcome, {user.name}! Calendar view coming next.
      </p>
    </div>
  );
}
