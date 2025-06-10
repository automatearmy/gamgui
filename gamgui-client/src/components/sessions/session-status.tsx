import { cn } from "@/lib/utils";

type SessionStatusProps = {
  status: string;
  className?: string;
};

function getStatusConfig(status: string) {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case "creating":
      return {
        label: "Creating",
        className: "text-blue-700 bg-blue-50 border-blue-200",
      };
    case "running":
      return {
        label: "Running",
        className: "text-green-700 bg-green-50 border-green-200",
      };
    case "stopping":
      return {
        label: "Stopping",
        className: "text-orange-700 bg-orange-50 border-orange-200",
      };
    case "stopped":
      return {
        label: "Stopped", 
        className: "text-gray-700 bg-gray-50 border-gray-200",
      };
    case "error":
      return {
        label: "Error",
        className: "text-red-700 bg-red-50 border-red-200",
      };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
        className: "text-gray-700 bg-gray-50 border-gray-200",
      };
  }
}

export function SessionStatus({ status, className }: SessionStatusProps) {
  const { label, className: statusClassName } = getStatusConfig(status);
  
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusClassName,
        className
      )}
    >
      {label}
    </span>
  );
}
