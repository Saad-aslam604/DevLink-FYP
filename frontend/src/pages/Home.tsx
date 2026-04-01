import React, { useState } from 'react';
import MentorList from '../components/MentorList';
import SessionBooking from '../components/SessionBooking';

export default function Home() {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.04)',
            boxShadow: '0 8px 30px rgba(2,6,23,0.6)'
          }}
        >
          <h1 className="text-3xl font-semibold mb-2" style={{ color: '#FFFFFF' }}>Welcome to DevLink</h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.72)' }}>
            DevLink connects mentors and learners with real-time meetings, chat, and payments. Get started by exploring mentors
            or creating a new meeting.
          </p>

          <div className="flex items-center gap-4">
            <button type="button" className="px-4 py-2 rounded-md text-sm font-medium bg-white text-[#0A0B0D] hover:opacity-95 transition">
              Explore Mentors
            </button>
            <CreateSessionButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <MentorList />
      </div>
      <SessionBookingWrapper />
    </div>
  );
}

function CreateSessionButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md text-sm font-medium border border-white/20 text-white hover:bg-white/6 transition"
      >
        Create Meeting
      </button>
      <SessionBooking open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SessionBookingWrapper() {
  // keep a simple wrapper to allow future wiring (e.g., global modal)
  return null;
}
