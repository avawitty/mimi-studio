
export interface FontSuggestion {
  name: string;
  type: 'Serif' | 'Sans' | 'Mono';
}

export const getFontSuggestions = (report: any): FontSuggestion[] => {
  const text = (report.conceptualThroughline || report.designBrief || "").toLowerCase();
  
  if (text.includes("minimal") || text.includes("clean") || text.includes("modern")) {
    return [
      { name: "Space Grotesk", type: "Sans" },
      { name: "Inter", type: "Sans" },
      { name: "JetBrains Mono", type: "Mono" },
      { name: "Outfit", type: "Sans" },
      { name: "EB Garamond", type: "Serif" }
    ];
  }
  if (text.includes("editorial") || text.includes("classic") || text.includes("serif")) {
    return [
      { name: "Cormorant Garamond", type: "Serif" },
      { name: "Playfair Display", type: "Serif" },
      { name: "Inter", type: "Sans" },
      { name: "Courier New", type: "Mono" },
      { name: "Montserrat", type: "Sans" }
    ];
  }
  if (text.includes("brutalist") || text.includes("raw") || text.includes("bold")) {
    return [
      { name: "Space Grotesk", type: "Sans" },
      { name: "Anton", type: "Sans" },
      { name: "Fira Code", type: "Mono" },
      { name: "Inter", type: "Sans" },
      { name: "Courier New", type: "Mono" }
    ];
  }
  return [
    { name: "Cormorant Garamond", type: "Serif" },
    { name: "Inter", type: "Sans" },
    { name: "JetBrains Mono", type: "Mono" },
    { name: "Space Grotesk", type: "Sans" },
    { name: "Playfair Display", type: "Serif" }
  ];
};
