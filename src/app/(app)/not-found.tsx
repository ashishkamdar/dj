import { EmptyState } from "@/components/ui/empty-state";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-24">
      <EmptyState
        icon={ExclamationTriangleIcon}
        title="Page not found"
        description="Sorry, the page you are looking for does not exist."
        action={
          <Link href="/calendar">
            <Button variant="secondary">Go to Calendar</Button>
          </Link>
        }
      />
    </div>
  );
}
