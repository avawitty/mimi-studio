import { useMimi } from "../store";
import { FloorHeader, SysLabel } from "../shared";
import type { Debris, Issue, Plate } from "../types";

type TimelineEvent =
  | { type: "ingest"; date: number; data: Debris }
  | { type: "plate"; date: number; data: Plate }
  | { type: "issue"; date: number; data: Issue };

export default function TimelineFloor() {
  const { issues, plates, debris, reading } = useMimi();

  const events: TimelineEvent[] = [
    ...debris.map((d) => ({ type: "ingest" as const, date: d.ingestedAt, data: d })),
    ...plates.map((p) => ({ type: "plate" as const, date: p.createdAt, data: p })),
    ...issues.map((i) => ({ type: "issue" as const, date: i.publishedAt, data: i })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="house-floor-enter">
      <FloorHeader
        index="ARCHIVE"
        name="Evolution"
        phase="System chronicle"
        blurb="Your aesthetic DNA over time. Every ingestion, plate, and issue recorded."
      />

      {reading ? (
        <div className="border border-[var(--house-line)] p-6 mb-8">
          <SysLabel className="mb-2 block">Current Reading</SysLabel>
          <h3 className="font-serif text-3xl">{reading.archetype}</h3>
          <p className="font-serif italic text-[var(--house-stone)] mt-1">{reading.positioning}</p>
          <div className="flex gap-2 mt-3">
            {reading.palette.map((c) => (
              <span
                key={c}
                className="w-6 h-6 border border-[var(--house-line)]"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="font-serif italic text-[var(--house-stone)] text-lg">
          The chronicle is blank. Ascend the floors.
        </p>
      ) : (
        <div className="space-y-6">
          {events.map((e, i) => (
            <div
              key={`${e.type}-${i}-${e.date}`}
              className="grid grid-cols-[100px_1fr] gap-4 border-b border-[var(--house-line)] pb-4"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--house-stone)]">
                {new Date(e.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--house-stone)] mr-3">
                  {e.type}
                </span>
                <span className="font-serif text-lg">
                  {e.type === "ingest"
                    ? e.data.raw.slice(0, 60)
                    : e.type === "plate"
                      ? e.data.title
                      : e.data.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
