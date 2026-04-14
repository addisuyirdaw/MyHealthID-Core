const fs = require('fs');
const path = require('path');

const files = [
  'app/doctor/search/page.tsx',
  'app/doctor/patient/[id]/page.tsx',
  'app/doctor/dashboard/page.tsx',
  'app/patients/[id]/dashboard/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let result = content.replace(/\\\$\{/g, '${');
    if (content !== result) {
      fs.writeFileSync(fullPath, result, 'utf8');
      console.log('Fixed', file);
    } else {
      console.log('No changes in', file);
    }
  } else {
    console.log('File not found:', fullPath);
  }
});
