import { SettingsTabs } from "@/app/app/settings/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6">
      <SettingsTabs />
      {children}
    </div>
  );
}
