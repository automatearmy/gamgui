import { useSecretsStatus } from "@/hooks/use-secrets";

import { CredentialCard } from "./credential-card";

type SecretType = "client_secrets" | "oauth2" | "oauth2service";

type SecretConfig = {
  key: SecretType;
  title: string;
  description: string;
  fileName: string;
  fileExtension: string;
};

const secrets: SecretConfig[] = [
  {
    key: "client_secrets",
    title: "Client Secrets",
    description: "OAuth 2.0 client configuration file from Google Cloud Console",
    fileName: "client_secrets.json",
    fileExtension: ".json",
  },
  {
    key: "oauth2",
    title: "OAuth2 Token",
    description: "User authorization token for Google Workspace API access",
    fileName: "oauth2.txt",
    fileExtension: ".txt",
  },
  {
    key: "oauth2service",
    title: "Service Account",
    description: "Service account credentials for server-to-server authentication",
    fileName: "oauth2service.json",
    fileExtension: ".json",
  },
];

export function CredentialsSection() {
  const { data: secretsStatus, isLoading } = useSecretsStatus();

  const getSecretStatus = (key: SecretType) => {
    if (!secretsStatus)
      return false;

    switch (key) {
      case "client_secrets":
        return secretsStatus.client_secrets_exists;
      case "oauth2":
        return secretsStatus.oauth2_exists;
      case "oauth2service":
        return secretsStatus.oauth2service_exists;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Credentials</h2>
        <p className="text-sm text-muted-foreground">
          Upload your Google Workspace authentication credentials.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {secrets.map((config) => {
          const isUploaded = getSecretStatus(config.key);

          return (
            <CredentialCard
              key={config.key}
              config={config}
              isUploaded={isUploaded}
              isLoading={isLoading}
            />
          );
        })}
      </div>
    </div>
  );
}
