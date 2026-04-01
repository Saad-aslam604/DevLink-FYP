const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces.js <file>'); process.exit(2); }
const s = fs.readFileSync(path,'utf8');
const counts = {'{':0,'}':0,'(':0,')':0,'[':0,']':0,'`':0,'"':0,'\'':0};
for (let i=0;i<s.length;i++){const c=s[i]; if (counts.hasOwnProperty(c)) counts[c]++;}
console.log('counts',counts);
let stack=[];for(let i=0;i<s.length;i++){const c=s[i]; if(c==='{') stack.push(i); else if(c==='}') { if(stack.length) stack.pop(); else console.log('Extra } at',i) }}
if(stack.length){ console.log('Unclosed { count',stack.length); for(let j=0;j<Math.min(10,stack.length);j++){const idx=stack[stack.length-1-j]; console.log('Unclosed { at',idx,'context:\n',s.slice(Math.max(0,idx-80),idx+80)) }} else console.log('All braces closed');
