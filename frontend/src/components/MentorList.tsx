import React from 'react';
import { Star } from 'lucide-react';

type Mentor = {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  skills: string[];
  rating: number; // 0-5
  reviews: number;
};

// Mentor list is rendered from props (fetched from API). No local mock data by default.

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full || (half && idx === full + 1);
        return (
          <Star key={i} size={14} className={filled ? 'text-yellow-400' : 'text-white/30'} />
        );
      })}
    </div>
  );
}

export default function MentorList({ mentors = [] }: { mentors?: Mentor[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.92)' }}>Available Mentors</h2>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <article
            key={m.id}
            className="group bg-white/3 rounded-2xl p-4 hover:shadow-2xl hover:translate-y-[-4px] transform transition-all duration-200"
            style={{ border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center gap-4">
              <img src={m.avatar} alt={m.name} className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: '#FFFFFF' }}>{m.name}</div>
                    <div className="text-sm text-white/70">{m.title} • {m.company}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Stars value={m.rating} />
                  <div className="text-sm text-white/60">{m.reviews} reviews</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {m.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-1 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.92)' }}
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-white/60">15–30 min</div>
              <button type="button" className="px-3 py-2 rounded-md text-sm font-medium bg-[#0066FF] hover:bg-[#0051d4] transition-colors text-white">
                Book Meeting
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
