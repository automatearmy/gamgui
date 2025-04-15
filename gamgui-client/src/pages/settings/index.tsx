import React, { useState, useEffect } from "react";
import { uploadCredentials, checkCredentials, createImage, deleteCredentials, AuthFiles } from "@/lib/api";
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
import { Info, Trash2, Play } from "lucide-react";


export function SettingsPage() {
  const [authFiles, setAuthFiles] = useState<AuthFiles>({
    clientSecrets: null,
    oauth2: null,
    oauth2service: null,
  });
  const [uploadStatus, setUploadStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
  }>({
    loading: false,
    success: false,
    error: null,
  });
  const [credentialsStatus, setCredentialsStatus] = useState<{
    complete: boolean;
    missingFiles: string[];
  }>({
    complete: false,
    missingFiles: [],
  });
  const [imageStatus, setImageStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
  }>({
    loading: false,
    success: false,
    error: null,
  });
  const [deleteStatus, setDeleteStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
  }>({
    loading: false,
    success: false,
    error: null,
  });

  // Check credentials status on mount
  useEffect(() => {
    const fetchCredentialsStatus = async () => {
      try {
        const status = await checkCredentials();
        setCredentialsStatus(status);
      } catch (error) {
        console.error("Failed to check credentials status:", error);
      }
    };

    fetchCredentialsStatus();
  }, []);

  const handleFileChange = (fileType: keyof AuthFiles) => async (file: File | null) => {
    // Update local state with the new file
    setAuthFiles((prev) => {
      const updatedFiles = {
        ...prev,
        [fileType]: file,
      };
      
      return updatedFiles;
    });

    // Upload file to server
    if (file) {
      try {
        setUploadStatus({ loading: true, success: false, error: null });
        
        // Create a new object with the updated file
        const updatedFiles = {
          ...authFiles,
          [fileType]: file,
        };
        
        // Upload the file
        await uploadCredentials({
          clientSecrets: fileType === 'clientSecrets' ? file : authFiles.clientSecrets,
          oauth2: fileType === 'oauth2' ? file : authFiles.oauth2,
          oauth2service: fileType === 'oauth2service' ? file : authFiles.oauth2service,
        });
        
        // Refresh credentials status
        const status = await checkCredentials();
        setCredentialsStatus(status);
        
        setUploadStatus({ loading: false, success: true, error: null });
        
        // No longer automatically creating the Docker image
      } catch (error) {
        console.error("Failed to upload file:", error);
        
        // Extract error message if available
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Unknown error occurred";
          
        setUploadStatus({ 
          loading: false, 
          success: false, 
          error: `Failed to upload file: ${errorMessage}` 
        });
      }
    }
  };

  const handleCreateImage = async () => {
    try {
      setImageStatus({ loading: true, success: false, error: null });
      
      // Create the Docker image
      const response = await createImage("gam-default-image");
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setImageStatus({ loading: false, success: true, error: null });
    } catch (error) {
      console.error("Failed to create Docker image:", error);
      
      // Extract error message if available
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Unknown error occurred";
        
      setImageStatus({
        loading: false,
        success: false,
        error: `Failed to create Docker image: ${errorMessage}`
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleteStatus({ loading: true, success: false, error: null });
      
      // Call API to delete credentials on server
      await deleteCredentials();
      
      // Reset local state
      setAuthFiles({
        clientSecrets: null,
        oauth2: null,
        oauth2service: null,
      });
      
      // Refresh credentials status
      const status = await checkCredentials();
      setCredentialsStatus(status);
      
      // Reset image status
      setImageStatus({
        loading: false,
        success: false,
        error: null,
      });
      
      setDeleteStatus({ loading: false, success: true, error: null });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setDeleteStatus(prev => ({
          ...prev,
          success: false
        }));
      }, 3000);
    } catch (error) {
      console.error("Failed to delete credentials:", error);
      
      // Extract error message if available
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Unknown error occurred";
        
      setDeleteStatus({
        loading: false,
        success: false,
        error: `Failed to delete credentials: ${errorMessage}`
      });
    }
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

          {/* Status indicators */}
          <div className="space-y-4">
            {uploadStatus.loading && (
              <Alert>
                <AlertTitle>Uploading...</AlertTitle>
                <AlertDescription>
                  Uploading credentials to server.
                </AlertDescription>
              </Alert>
            )}
            
            {uploadStatus.error && (
              <Alert variant="destructive">
                <AlertTitle>Upload Error</AlertTitle>
                <AlertDescription>
                  {uploadStatus.error}
                </AlertDescription>
              </Alert>
            )}
            
            {imageStatus.loading && (
              <Alert>
                <AlertTitle>Creating Docker Image</AlertTitle>
                <AlertDescription>
                  Creating Docker image with your credentials. This may take a moment.
                </AlertDescription>
              </Alert>
            )}
            
            {imageStatus.success && (
              <Alert>
                <AlertTitle>Docker Image Created</AlertTitle>
                <AlertDescription>
                  Docker image has been successfully created with your credentials.
                </AlertDescription>
              </Alert>
            )}
            
            {imageStatus.error && (
              <Alert variant="destructive">
                <AlertTitle>Image Creation Error</AlertTitle>
                <AlertDescription>
                  {imageStatus.error}
                </AlertDescription>
              </Alert>
            )}
            
            {deleteStatus.loading && (
              <Alert>
                <AlertTitle>Deleting...</AlertTitle>
                <AlertDescription>
                  Deleting credentials from server.
                </AlertDescription>
              </Alert>
            )}
            
            {deleteStatus.success && (
              <Alert>
                <AlertTitle>Credentials Deleted</AlertTitle>
                <AlertDescription>
                  All credentials have been successfully deleted.
                </AlertDescription>
              </Alert>
            )}
            
            {deleteStatus.error && (
              <Alert variant="destructive">
                <AlertTitle>Delete Error</AlertTitle>
                <AlertDescription>
                  {deleteStatus.error}
                </AlertDescription>
              </Alert>
            )}
            
            {credentialsStatus.complete ? (
              <Alert>
                <AlertTitle>Credentials Status</AlertTitle>
                <AlertDescription>
                  All required credential files are present.
                </AlertDescription>
              </Alert>
            ) : credentialsStatus.missingFiles.length > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>Missing Credentials</AlertTitle>
                <AlertDescription>
                  The following credential files are missing: {credentialsStatus.missingFiles.join(', ')}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-4 mt-4">
            {/* Create Docker Image button - only shown when all credentials are present */}
            {credentialsStatus.complete && (
              <Button 
                onClick={handleCreateImage}
                className="flex items-center gap-2"
                disabled={imageStatus.loading}
              >
                <Play className="h-4 w-4" />
                {imageStatus.loading ? "Creating..." : "Create Docker Image"}
              </Button>
            )}

            {/* Delete Credentials button */}
            {(authFiles.clientSecrets || authFiles.oauth2 || authFiles.oauth2service || credentialsStatus.complete) && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteAll}
                className="flex items-center gap-2"
                disabled={deleteStatus.loading}
              >
                <Trash2 className="h-4 w-4" />
                Delete All Credentials
              </Button>
            )}
          </div>
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
