import { CredentialsSection } from "@/components/settings/credentials-section";
import { GeneralSection } from "@/components/settings/general-section";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Google Workspace credentials and view system information.
        </p>
      </div>
      <GeneralSection />
      <CredentialsSection />
    </div>
  );
}
