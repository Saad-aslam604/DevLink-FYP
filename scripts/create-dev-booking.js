const fetch = require('node-fetch');
(async () => {
  try {
    const API = process.env.API_BASE || 'http://localhost:5000/api';
    function rand() { return Math.floor(Math.random() * 100000); }
    const studentEmail = `dev-student-${rand()}@dev.local`;
    const mentorEmail = `dev-mentor-${rand()}@dev.local`;

    // register student
    let res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: 'password123', role: 'junior' })
    });
    const student = await res.json();
    if (!res.ok) throw new Error('Failed to register student: ' + JSON.stringify(student));

    // register mentor
    res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mentorEmail, password: 'password123', role: 'mentor' })
    });
    const mentor = await res.json();
    if (!res.ok) throw new Error('Failed to register mentor: ' + JSON.stringify(mentor));

    const mentorId = mentor.data.user.id;

    // create booking by student
    const start = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 32 * 60 * 1000).toISOString();
    res = await fetch(`${API}/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student.data.token}` },
      body: JSON.stringify({ mentorId, meetingType: 'video-call', startTime: start, endTime: end, status: 'confirmed' })
    });
    const booking = await res.json();
    if (!res.ok) throw new Error('Failed to create booking: ' + JSON.stringify(booking));

    console.log('Student token:', student.data.token);
    console.log('Mentor credentials: email=%s password=password123', mentorEmail);
    console.log('Booking id:', booking.data.booking._id);
    console.log('Open these URLs in two browsers (signin as the student and the mentor):');
    console.log('Student: http://127.0.0.1:3000/video/' + booking.data.booking._id);
    console.log('Mentor:  http://127.0.0.1:3000/video/' + booking.data.booking._id);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
