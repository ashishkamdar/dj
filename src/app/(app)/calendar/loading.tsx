import { Spinner } from "@/components/ui/spinner";

export default function CalendarLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="size-8" />
    </div>
  );
}
