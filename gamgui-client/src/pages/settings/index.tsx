import { CredentialsSection } from "@/components/settings/credentials-section";
import { GeneralSection } from "@/components/settings/general-section";

export function SettingsPage() {
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Google Workspace credentials and view system information.
        </p>
      </div>

      <GeneralSection />
      <CredentialsSection />
    </div>
  );
}
