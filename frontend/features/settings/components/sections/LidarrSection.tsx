"use client";

import { useState } from "react";
import { SettingsSection, SettingsRow, SettingsInput, SettingsToggle } from "../ui";
import { SystemSettings } from "../../types";
import { InlineStatus, StatusType } from "@/components/ui/InlineStatus";

interface LidarrSectionProps {
    settings: SystemSettings;
    onUpdate: (updates: Partial<SystemSettings>) => void;
    onTest: (service: string) => Promise<{ success: boolean; version?: string; error?: string }>;
    isTesting: boolean;
}

export function LidarrSection({ settings, onUpdate, onTest, isTesting }: LidarrSectionProps) {
    const [testStatus, setTestStatus] = useState<StatusType>("idle");
    const [testMessage, setTestMessage] = useState("");

    const handleTest = async () => {
        setTestStatus("loading");
        setTestMessage("Testing...");
        const result = await onTest("lidarr");
        if (result.success) {
            setTestStatus("success");
            setTestMessage(result.version ? `v${result.version}` : "Connected");
        } else {
            setTestStatus("error");
            setTestMessage(result.error || "Failed");
        }
    };

    return (
        <SettingsSection 
            id="lidarr" 
            title="Download Services"
            description="Automate music downloads and library management"
        >
            <SettingsRow 
                label="Enable Lidarr"
                description="Connect to Lidarr for music automation"
                htmlFor="lidarr-enabled"
            >
                <SettingsToggle
                    id="lidarr-enabled"
                    checked={settings.lidarrEnabled}
                    onChange={(checked) => onUpdate({ lidarrEnabled: checked })}
                />
            </SettingsRow>

            {settings.lidarrEnabled && (
                <>
                    <SettingsRow label="Lidarr URL">
                        <SettingsInput
                            value={settings.lidarrUrl}
                            onChange={(v) => onUpdate({ lidarrUrl: v })}
                            placeholder="http://localhost:8686"
                            className="w-64"
                        />
                    </SettingsRow>

                    <SettingsRow label="API Key">
                        <SettingsInput
                            type="password"
                            value={settings.lidarrApiKey}
                            onChange={(v) => onUpdate({ lidarrApiKey: v })}
                            placeholder="Enter API key"
                            className="w-64"
                        />
                    </SettingsRow>

                    <div className="pt-2">
                        <div className="inline-flex items-center gap-3">
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !settings.lidarrUrl || !settings.lidarrApiKey}
                                className="px-4 py-1.5 text-xs font-mono bg-white/5 border border-white/10 text-white/70 rounded-lg uppercase tracking-wider
                                    hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {testStatus === "loading" ? "Testing..." : "Test Connection"}
                            </button>
                            <InlineStatus 
                                status={testStatus} 
                                message={testMessage}
                                onClear={() => setTestStatus("idle")}
                            />
                        </div>
                    </div>
                </>
            )}
        </SettingsSection>
    );
}
