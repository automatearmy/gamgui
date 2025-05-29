import { Upload } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type FileDropZoneProps = {
  className?: string;
  onFilesDropped: (files: File[]) => void;
};

export function FileDropZone({ className, onFilesDropped }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesDropped(filesArray);
    }
  }, [onFilesDropped]);

  const handleClick = React.useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const filesArray = Array.from(target.files);
        onFilesDropped(filesArray);
      }
    };
    input.click();
  }, [onFilesDropped]);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-lg font-medium">Drop Files</p>
    </div>
  );
}
