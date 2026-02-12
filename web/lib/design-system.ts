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
    metricLarge: "text-5xl font-black text-indigo-600",
    metricMedium: "text-3xl font-bold text-slate-900",
    metricSmall: "text-2xl font-bold text-slate-700",
};

export const colors = {
    // Primary
    primary: "indigo-600",
    primaryLight: "indigo-50",
    primaryDark: "indigo-700",

    // Success/Safe
    success: "green-600",
    successLight: "green-100",
    successText: "green-700",

    // Error/Unsafe
    error: "red-600",
    errorLight: "red-100",
    errorText: "red-700",

    // Warning
    warning: "amber-500",
    warningLight: "amber-100",
    warningText: "amber-700",

    // Neutral
    textPrimary: "slate-900",
    textSecondary: "slate-600",
    textTertiary: "slate-500",
    bgPrimary: "white",
    bgSecondary: "slate-50",
    border: "slate-200",
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
    buttonPrimary: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm",
    buttonSecondary: "px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm",
};

// Icon sizes (used for lucide-react icons)
export const iconSizes = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
    xlarge: "w-8 h-8",
};
