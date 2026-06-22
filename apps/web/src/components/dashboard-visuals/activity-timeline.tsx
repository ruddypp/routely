import type { ActivityItem, Tone } from "./types";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-[#1ED760]",
  warn: "bg-[#F59E0B]",
  error: "bg-[#EF4444]",
  muted: "bg-[#A8B3AD]",
  info: "bg-[#4F8CFF]"
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-[22px] border border-[#2D352F] bg-[#171C1A] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]" aria-labelledby="activity-timeline-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A8B3AD]">Activity</p>
          <h2 id="activity-timeline-title" className="mt-1 text-base font-black text-[#F7FFF9]">Recent operations</h2>
        </div>
        <span className="rounded-full border border-[#2D352F] bg-[#222823] px-3 py-1 font-mono text-xs font-black text-[#F7FFF9]">{items.length} loaded</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[18px] border border-[#2D352F] bg-[#101412]">
        {items.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs font-black text-[#F7FFF9]">No recent activity</p>
            <p className="mt-1 text-[11px] leading-4 text-[#A8B3AD]">Failures, deploys, and domain checks appear here.</p>
          </div>
        ) : (
          <ol className="divide-y divide-[#2D352F]">
            {items.map((item) => (
              <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-2.5">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${TONE_CLASS[item.tone]}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#F7FFF9]">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#A8B3AD]">{item.detail}</p>
                </div>
                <time className="font-mono text-[10px] font-bold text-[#A8B3AD]">{item.timestamp}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
