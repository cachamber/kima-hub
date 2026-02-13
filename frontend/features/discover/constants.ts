export const tierColors: Record<string, string> = {
    high: "text-green-400",
    medium: "text-yellow-400",
    explore: "text-orange-400",
    wildcard: "text-purple-400",
    // Legacy tier names (kept for backwards compatibility)
    low: "text-orange-400",
    wild: "text-purple-400",
};

export const tierLabels: Record<string, string> = {
    high: "High Match",
    medium: "Medium Match",
    explore: "Explore",
    wildcard: "Wild Card",
    // Legacy tier names (kept for backwards compatibility)
    low: "Explore",
    wild: "Wild Card",
};
