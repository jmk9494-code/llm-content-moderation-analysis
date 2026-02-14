// Typography and Design System Constants
// Use these constants throughout the application for consistency

export const typography = {
    // Page Titles
    pageTitle: "text-2xl font-bold text-slate-900",

    // Section Headings
    sectionHeading: "text-lg font-bold text-slate-900",
    subsectionHeading: "text-base font-semibold text-slate-700",

    // Body Text
    bodyText: "text-sm text-slate-700",
    bodyTextSecondary: "text-sm text-slate-500",
    bodyTextSmall: "text-xs text-slate-600",

    // Labels
    label: "text-xs font-semibold text-slate-500 uppercase tracking-wide",
    labelLarge: "text-sm font-semibold text-slate-600 uppercase tracking-wide",

    // Metrics/Numbers
    metricLarge: "text-5xl font-black text-primary",
    metricMedium: "text-3xl font-bold text-slate-900",
    metricSmall: "text-2xl font-bold text-slate-700",
};

export const colors = {
    // Primary
    primary: "primary",
    primaryLight: "primary/10",
    primaryDark: "primary/90",

    // Success/Safe
    success: "[#275D38]", // Forest
    successLight: "[#275D38]/10",
    successText: "[#275D38]",

    // Error/Unsafe
    error: "[#A4343A]", // Brick
    errorLight: "[#A4343A]/10",
    errorText: "[#A4343A]",

    // Warning
    warning: "[#EAAA00]", // Goldenrod
    warningLight: "[#EAAA00]/10",
    warningText: "[#CC8A00]", // Darker Goldenrod

    // Neutral
    textPrimary: "foreground",
    textSecondary: "muted-foreground",
    textTertiary: "muted-foreground",
    bgPrimary: "background",
    bgSecondary: "muted",
    border: "border",
};

export const spacing = {
    cardPadding: "p-6",
    sectionGap: "space-y-6",
    itemGap: "gap-4",
};

export const components = {
    // Cards
    card: "bg-white p-6 rounded-2xl shadow-sm border border-slate-200",
    cardHover: "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow",

    // Info Box (used in AnalysisOverview)
    infoBox: "bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm",

    // Buttons
    buttonPrimary: "px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm",
    buttonSecondary: "px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm",
};

// Icon sizes (used for lucide-react icons)
export const iconSizes = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
    xlarge: "w-8 h-8",
};
