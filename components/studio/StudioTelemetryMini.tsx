import React from "react";

type StudioTelemetryMiniProps = {
  entropy: number;
  telemetryX: number;
  telemetryY: number;
  useTailorProfile: boolean;
  dollLabel: string;
  authorName: string;
  title: string;
};

export const StudioTelemetryMini: React.FC<StudioTelemetryMiniProps> = ({
  entropy,
  telemetryX,
  telemetryY,
  useTailorProfile,
  dollLabel,
  authorName,
  title,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Entropy", value: entropy.toFixed(2) },
          { label: "Lat", value: `${telemetryX}°` },
          { label: "Long", value: `${telemetryY}°` },
        ].map((item) => (
          <div key={item.label} className="border studio-border p-2 text-center">
            <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted">
              {item.label}
            </p>
            <p className="font-mono text-[11px] studio-text-ink mt-1">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="font-mono text-[8px] uppercase tracking-wider studio-text-muted leading-relaxed space-y-1.5">
        <p>Gateway path · Mimi funded</p>
        <p>Tailor shield · {useTailorProfile ? "secure" : "bypassed"}</p>
        <p>Doll · {dollLabel}</p>
        <p>Author · {authorName}</p>
        <p>Title · {title || "Untitled"}</p>
      </div>
    </div>
  );
};
