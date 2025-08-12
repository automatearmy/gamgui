import { cn } from "@/lib/utils";

type SessionStatusProps = {
  status: string;
  className?: string;
};

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    dotColor: "bg-yellow-500",
  },
  Running: {
    label: "Running",
    dotColor: "bg-green-500",
  },
  Succeeded: {
    label: "Succeeded",
    dotColor: "bg-blue-500",
  },
  Failed: {
    label: "Failed",
    dotColor: "bg-red-500",
  },
  Unknown: {
    label: "Unknown",
    dotColor: "bg-gray-500",
  },
} as const;

const DEFAULT_CONFIG = {
  label: "Unknown",
  dotColor: "bg-gray-500",
} as const;

export function SessionStatus({ status, className }: SessionStatusProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status,
    dotColor: DEFAULT_CONFIG.dotColor,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-sm text-muted-foreground",
        className,
      )}
    >
      <span className={cn("w-2 h-2 rounded-full mr-2", config.dotColor)} />
      {config.label}
    </span>
  );
}
