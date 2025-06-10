import { Upload } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type FileDropZoneProps = {
  className?: string;
  onFilesSelected?: (files: File[]) => void;
  onFilesDropped?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function FileDropZone({
  className,
  onFilesSelected,
  onFilesDropped,
  accept,
  maxFiles = 10,
  disabled = false,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    (files: File[]) => {
      if (disabled)
        return;

      let filteredFiles = files;

      // Filter by accept type if specified
      if (accept) {
        filteredFiles = files.filter((file) => {
          if (accept.startsWith(".")) {
            return file.name.toLowerCase().endsWith(accept.toLowerCase());
          }
          return file.type.match(accept);
        });
      }

      // Limit number of files
      if (maxFiles && filteredFiles.length > maxFiles) {
        filteredFiles = filteredFiles.slice(0, maxFiles);
      }

      const callback = onFilesSelected || onFilesDropped;
      if (callback) {
        callback(filteredFiles);
      }
    },
    [accept, maxFiles, disabled, onFilesSelected, onFilesDropped],
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled)
        return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled)
        return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [disabled],
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled)
        return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        handleFiles(filesArray);
      }
    },
    [disabled, handleFiles],
  );

  const handleClick = React.useCallback(() => {
    if (disabled)
      return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = maxFiles !== 1;
    if (accept) {
      input.accept = accept;
    }
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const filesArray = Array.from(target.files);
        handleFiles(filesArray);
      }
    };
    input.click();
  }, [disabled, maxFiles, accept, handleFiles]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/50",
        isDragging && !disabled ? "border-primary bg-primary/5" : "border-muted",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {children || (
        <>
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Drop Files</p>
        </>
      )}
    </div>
  );
}
