import type { ActivityItem, Tone } from "./types";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-[#18A058]",
  warn: "bg-[#D97706]",
  error: "bg-[#DC2626]",
  muted: "bg-[#64748B]",
  info: "bg-[#2563EB]"
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-[1.35rem] border border-[#DCE3EE] bg-white p-4 shadow-[0_24px_70px_rgba(23,32,51,0.08)]" aria-labelledby="activity-timeline-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748B]">Activity</p>
          <h2 id="activity-timeline-title" className="mt-1 text-lg font-black text-[#172033]">Recent incidents and operations</h2>
        </div>
        <span className="rounded-full border border-[#DCE3EE] bg-[#F6F8FB] px-3 py-1 font-mono text-xs font-black text-[#172033]">{items.length} loaded</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#DCE3EE] bg-[#F6F8FB]">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-black text-[#172033]">No recent activity loaded</p>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">Failures, deploy runs, and domain checks will appear here when the backend reports them.</p>
          </div>
        ) : (
          <ol className="divide-y divide-[#DCE3EE]">
            {items.map((item) => (
              <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-3">
                <span className={`mt-1 h-3 w-3 rounded-full ${TONE_CLASS[item.tone]}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#172033]">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-[#64748B]">{item.detail}</p>
                </div>
                <time className="font-mono text-[11px] font-bold text-[#64748B]">{item.timestamp}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
