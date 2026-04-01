const fetch = global.fetch || require('node-fetch');
const roles = ['junior','mentor','both'];
(async () => {
  for (const r of roles) {
    const ts = Math.floor(Date.now()/1000);
    const email = `test+${r}+${ts}@example.com`;
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ email, password: 'Password123', role: r })
      });
      const j = await res.json().catch(()=>null);
      console.log('role=', r, 'status=', res.status, 'body=', j);
    } catch (e) {
      console.error('role=', r, 'error=', e.message);
    }
    await new Promise(rp=>setTimeout(rp,300));
  }
})();
