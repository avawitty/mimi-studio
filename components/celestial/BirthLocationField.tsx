import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type {
  PlaceResolution,
  PlaceSuggestion,
} from "../../schemas/celestialCalibrationContracts";

type BirthLocationFieldProps = {
  value: string;
  geocodeStatus?: "unset" | "resolved" | "manual" | "failed";
  geocodeLabel?: string;
  birthTimezone?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  resolvingPlace: boolean;
  onValueChange: (value: string) => void;
  onResolved: (place: PlaceResolution) => void;
  onResolveFailed: () => void;
  onResolveError: (message: string) => void;
  onResolveStart: () => void;
  onResolveEnd: () => void;
};

async function fetchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const res = await fetch("/api/celestial/geocode-suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load place suggestions.");
  }
  return Array.isArray(data?.suggestions) ? data.suggestions : [];
}

async function resolvePlaceRequest(
  body: { query: string } | PlaceSuggestion,
): Promise<PlaceResolution> {
  const res = await fetch("/api/celestial/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to resolve place.");
  }
  return data as PlaceResolution;
}

export const BirthLocationField: React.FC<BirthLocationFieldProps> = ({
  value,
  geocodeStatus,
  geocodeLabel,
  birthTimezone,
  birthLatitude,
  birthLongitude,
  resolvingPlace,
  onValueChange,
  onResolved,
  onResolveFailed,
  onResolveError,
  onResolveStart,
  onResolveEnd,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipSuggestRef = useRef(false);

  const runResolve = useCallback(
    async (body: { query: string } | PlaceSuggestion) => {
      onResolveStart();
      onResolveError("");
      try {
        const place = await resolvePlaceRequest(body);
        onResolved(place);
        setSuggestOpen(false);
        setSuggestions([]);
      } catch (e) {
        onResolveFailed();
        onResolveError(e instanceof Error ? e.message : "Failed to resolve place.");
      } finally {
        onResolveEnd();
      }
    },
    [
      onResolveEnd,
      onResolveError,
      onResolveFailed,
      onResolveStart,
      onResolved,
    ],
  );

  const resolveCurrentQuery = useCallback(() => {
    const query = value.trim();
    if (!query) {
      onResolveError("Enter a birth location before resolving place.");
      return;
    }
    void runResolve({ query });
  }, [onResolveError, runResolve, value]);

  const selectSuggestion = useCallback(
    (suggestion: PlaceSuggestion) => {
      skipSuggestRef.current = true;
      onValueChange(suggestion.label);
      void runResolve(suggestion);
    },
    [onValueChange, runResolve],
  );

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      setSuggestLoading(true);
      void fetchPlaceSuggestions(query)
        .then((next) => {
          setSuggestions(next);
          setSuggestOpen(next.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setSuggestOpen(false);
        })
        .finally(() => setSuggestLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <label className="block space-y-1.5 md:col-span-2">
      <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
        Birth location
      </span>
      <div ref={containerRef} className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestOpen && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
                return;
              }
              if (e.key === "ArrowUp" && suggestOpen && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex((i) =>
                  i <= 0 ? suggestions.length - 1 : i - 1,
                );
                return;
              }
              if (e.key === "Enter") {
                if (suggestOpen && activeIndex >= 0 && suggestions[activeIndex]) {
                  e.preventDefault();
                  selectSuggestion(suggestions[activeIndex]);
                  return;
                }
                if (!suggestOpen) {
                  e.preventDefault();
                  resolveCurrentQuery();
                }
              }
              if (e.key === "Escape") {
                setSuggestOpen(false);
              }
            }}
            placeholder="City, region — search or resolve for timezone"
            aria-autocomplete="list"
            aria-expanded={suggestOpen}
            aria-controls="birth-location-suggestions"
            className="w-full bg-transparent border border-nous-border px-3 py-2 font-sans text-sm text-nous-text placeholder:text-nous-subtle/50 focus:outline-none focus:border-nous-text/50"
          />
          {suggestOpen ? (
            <ul
              id="birth-location-suggestions"
              role="listbox"
              className="absolute z-20 left-0 right-0 top-full mt-1 border border-nous-border bg-nous-base shadow-lg max-h-48 overflow-y-auto"
            >
              {suggestLoading ? (
                <li className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-nous-subtle">
                  Searching places…
                </li>
              ) : null}
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.label}-${index}`} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-3 py-2 font-sans text-[12px] text-nous-text hover:bg-nous-text/5 ${
                      index === activeIndex ? "bg-nous-text/5" : ""
                    }`}
                  >
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={resolveCurrentQuery}
          disabled={resolvingPlace || !value.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-nous-border font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text disabled:opacity-40 shrink-0"
        >
          <MapPin size={10} />
          {resolvingPlace ? "Resolving…" : "Resolve place"}
        </button>
      </div>
      {geocodeStatus === "resolved" && birthTimezone ? (
        <p className="font-mono text-[9px] uppercase tracking-wider text-nous-text pt-1">
          {geocodeLabel || value}
          {" · "}
          {birthTimezone}
          {typeof birthLatitude === "number" && typeof birthLongitude === "number"
            ? ` · ${birthLatitude.toFixed(3)}°, ${birthLongitude.toFixed(3)}°`
            : ""}
        </p>
      ) : null}
    </label>
  );
};
