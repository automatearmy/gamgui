import { Upload } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { FileUploadSection } from "./file-upload-section";

type FileUploadPopoverProps = {
  children?: React.ReactNode;
  sessionId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FileUploadPopover({
  children,
  sessionId,
  open,
  onOpenChange,
}: FileUploadPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children && (
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-96 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Upload Files</h3>
          </div>

          <FileUploadSection sessionId={sessionId} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
