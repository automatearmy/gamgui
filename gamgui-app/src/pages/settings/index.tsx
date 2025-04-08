import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from "@/components/ui/alert";
import { Info, Trash2 } from "lucide-react";

interface AuthFiles {
  clientSecrets: File | null;
  oauth2: File | null;
  oauth2service: File | null;
}

export function SettingsPage() {
  const [authFiles, setAuthFiles] = useState<AuthFiles>({
    clientSecrets: null,
    oauth2: null,
    oauth2service: null,
  });

  const handleFileChange = (fileType: keyof AuthFiles) => (file: File | null) => {
    setAuthFiles((prev) => ({
      ...prev,
      [fileType]: file,
    }));
  };

  const handleDeleteAll = () => {
    setAuthFiles({
      clientSecrets: null,
      oauth2: null,
      oauth2service: null,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {/* Auth Files Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Files</CardTitle>
          <CardDescription>
            Upload your Google Workspace authentication files for GAM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col h-full">
              <label className="mb-2 block text-sm font-medium truncate">
                Client Secrets
              </label>
              <FileInput
                value={authFiles.clientSecrets}
                onChange={handleFileChange("clientSecrets")}
                dropzoneText="Upload client_secrets"
                acceptedFileTypes=".json"
                className="h-full"
              />
            </div>
            <div className="flex flex-col h-full">
              <label className="mb-2 block text-sm font-medium truncate">
                OAuth2 Credentials
              </label>
              <FileInput
                value={authFiles.oauth2}
                onChange={handleFileChange("oauth2")}
                dropzoneText="Upload oauth2"
                acceptedFileTypes=".txt"
                className="h-full"
              />
            </div>
            <div className="flex flex-col h-full">
              <label className="mb-2 block text-sm font-medium truncate">
                OAuth2 Service Account
              </label>
              <FileInput
                value={authFiles.oauth2service}
                onChange={handleFileChange("oauth2service")}
                dropzoneText="Upload oauth2service"
                acceptedFileTypes=".json"
                className="h-full"
              />
            </div>
          </div>

          {(authFiles.clientSecrets || authFiles.oauth2 || authFiles.oauth2service) && (
            <div className="flex justify-end">
              <Button 
                variant="destructive" 
                onClick={handleDeleteAll}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Credentials
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GAM Version Section */}
      <Card>
        <CardHeader>
          <CardTitle>GAM Information</CardTitle>
          <CardDescription>
            Details about your GAM installation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="flex items-center">
            <Info className="h-4 w-4" />
            <AlertTitle>GAM Version</AlertTitle>
            <AlertDescription>
              You are running GAM 7.05.20
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
