const fs = require('fs');
const p = process.argv[2];
const idx = parseInt(process.argv[3]||0,10);
const s = fs.readFileSync(p,'utf8');
const start = Math.max(0, idx-60);
const end = Math.min(s.length, idx+60);
console.log('length',s.length,'showing',start,'to',end);
console.log(s.slice(start,end));
console.log('--- char codes ---');
for(let i=start;i<end;i++){
  const ch=s[i]; const code=ch.charCodeAt(0);
  console.log(i, code, JSON.stringify(ch));
}
