import { CheckCircle, Upload } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { Skeleton } from "@/components/ui/skeleton";
import { useUploadAdminSecret, useUploadSecret } from "@/hooks/use-secrets";

type SecretType = "client_secrets" | "oauth2" | "oauth2service";

type SecretConfig = {
  key: SecretType;
  title: string;
  description: string;
  fileName: string;
  fileExtension: string;
};

type CredentialCardProps = {
  config: SecretConfig;
  isUploaded: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;
};

export function CredentialCard({ config, isUploaded, isLoading = false, isAdmin = false }: CredentialCardProps) {
  const uploadSecret = useUploadSecret();
  const uploadAdminSecret = useUploadAdminSecret();
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File, config: SecretConfig): string | null => {
    if (!file.name.endsWith(config.fileExtension)) {
      return `File must be a ${config.fileExtension} file`;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return "File size must be less than 10MB";
    }

    return null;
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0)
      return;

    const file = files[0];
    const validationError = validateFile(file, config);

    if (validationError) {
      console.error(validationError);
      return;
    }

    setIsUploading(true);

    try {
      if (isAdmin) {
        await uploadAdminSecret.mutateAsync({ secretType: config.key, file });
      } else {
        await uploadSecret.mutateAsync({ secretType: config.key, file });
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadSecret, uploadAdminSecret, validateFile, config, isAdmin]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{config.title}</h3>
            <Badge
              variant={isUploaded ? "default" : "outline"}
              className={isUploaded ? "bg-green-100 text-green-800 border-green-200" : ""}
            >
              {isUploaded ? "Uploaded" : "Required"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        <FileDropZone
          onFilesSelected={handleFileUpload}
          accept={config.fileExtension}
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
                      {isUploaded
                        ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )
                        : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">
                        {isUploaded ? "Uploaded" : `${config.fileName}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isUploaded ? "Click to replace" : "Drag & drop or click"}
                      </p>
                    </div>
                  </>
                )}
          </div>
        </FileDropZone>
      </div>
    </div>
  );
}
