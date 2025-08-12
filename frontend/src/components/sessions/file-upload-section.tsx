import { Upload } from "lucide-react";
import { useCallback, useState } from "react";

import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useUploadFileToSession } from "@/hooks/use-sessions";

type FileUploadSectionProps = {
  sessionId: string;
};

export function FileUploadSection({ sessionId }: FileUploadSectionProps) {
  const uploadFile = useUploadFileToSession();
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      return "File size must be less than 100MB";
    }

    return null;
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0)
      return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      console.error(validationError);
      return;
    }

    setIsUploading(true);

    try {
      await uploadFile.mutateAsync({ sessionId, file });
    }
    finally {
      setIsUploading(false);
    }
  }, [uploadFile, validateFile, sessionId]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">File Upload</h3>
        <p className="text-sm text-muted-foreground">
          Upload files to the session pod's /uploaded directory (up to 100MB per file).
        </p>
      </div>

      <FileDropZone
        onFilesSelected={handleFileUpload}
        maxFiles={1}
        disabled={isUploading}
        className="border-dashed border-2 rounded-lg p-6 transition-all hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          {isUploading
            ? (
                <>
                  <div className="rounded-full bg-muted/50 p-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Uploading...</p>
                  </div>
                </>
              )
            : (
                <>
                  <div className="rounded-full bg-muted/50 p-3">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Upload file</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop or click to select (up to 100MB)
                    </p>
                  </div>
                </>
              )}
        </div>
      </FileDropZone>
    </div>
  );
}
