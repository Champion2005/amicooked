import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

const categoryColors = {
  web: "text-blue-400",
  systems: "text-orange-400",
  general: "text-purple-400",
  enterprise: "text-red-400",
  mobile: "text-green-400",
  data: "text-cyan-400",
  scripting: "text-yellow-400",
  functional: "text-pink-400",
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

function timeAgo(dateString) {
  if (!dateString) return "Unknown";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Active now";
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
}

export default function LanguageBreakdown({
  languageBreakdown = [],
  totalLanguageBytes = 0,
  languageInsight = null,
}) {
  const [showAll, setShowAll] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!languageBreakdown || languageBreakdown.length === 0) {
    return (
      <Card className="bg-[#0d1117] border-[#30363d]">
        <CardContent className="p-6">
          <p className="text-gray-500 text-sm">No language data available</p>
        </CardContent>
      </Card>
    );
  }

  const displayedLanguages = showAll
    ? languageBreakdown
    : languageBreakdown.slice(0, 8);

  return (
    <Card className="bg-[#0d1117] border-[#30363d]">
      <CardContent className="p-6 space-y-3">
        {displayedLanguages.map((lang) => (
          <div key={lang.name} className="space-y-1">
            {/* Language header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="text-sm text-white font-medium">
                  {lang.name}
                </span>
                {lang.category && (
                  <span
                    className={`bg-[#1c2128] border border-[#30363d] text-[10px] px-1.5 py-0.5 rounded-full ${categoryColors[lang.category] || "text-gray-400"}`}
                  >
                    {lang.category}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 tabular-nums">
                {lang.percentage.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[#1f2831] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: lang.color,
                }}
              />
            </div>

            {/* Expanded details */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showDetails
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex items-center gap-4 pt-1 pl-5 text-xs text-gray-500">
                <span>{lang.repoCount} repos</span>
                <span>{timeAgo(lang.lastUsed)}</span>
                <span>{formatBytes(lang.bytes)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Show all toggle */}
        {languageBreakdown.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer pt-1"
          >
            {showAll ? "Show less" : `Show all (${languageBreakdown.length})`}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
            />
          </button>
        )}

        {/* More details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer"
        >
          {showDetails ? "Less Details" : "More Details"}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${showDetails ? "rotate-180" : ""}`}
          />
        </button>

        {/* AI Notes */}
        {languageInsight && (
          <div className="border-t border-[#30363d] pt-3 mt-3">
            <p className="text-xs text-gray-500">
              AI Notes: {languageInsight}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
