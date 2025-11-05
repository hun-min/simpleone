const fs = require('fs');
let lines = fs.readFileSync('src/App.js', 'utf8').split('\n');
lines[1213] = '              placeholder="할일입력"';
fs.writeFileSync('src/App.js', lines.join('\n'), 'utf8');
console.log('Fixed line 1213');
