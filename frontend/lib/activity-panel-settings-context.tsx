"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ActivityPanelSettingsContextType {
    settingsContent: ReactNode | null;
    setSettingsContent: (content: ReactNode | null) => void;
}

const ActivityPanelSettingsContext = createContext<ActivityPanelSettingsContextType | undefined>(
    undefined
);

export function ActivityPanelSettingsProvider({ children }: { children: ReactNode }) {
    const [settingsContent, setSettingsContent] = useState<ReactNode | null>(null);

    return (
        <ActivityPanelSettingsContext.Provider value={{ settingsContent, setSettingsContent }}>
            {children}
        </ActivityPanelSettingsContext.Provider>
    );
}

export function useActivityPanelSettings() {
    const context = useContext(ActivityPanelSettingsContext);
    if (!context) {
        throw new Error(
            "useActivityPanelSettings must be used within ActivityPanelSettingsProvider"
        );
    }
    return context;
}
