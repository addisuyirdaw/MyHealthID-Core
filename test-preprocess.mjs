import fs from 'fs';
import http from 'http';

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const imageBuffer = fs.readFileSync('./back.jpg');

// Build multipart form data manually
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="back.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
  imageBuffer,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/qr-preprocess',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = Buffer.alloc(0);
  res.on('data', (chunk) => {
    data = Buffer.concat([data, chunk]);
  });
  
  res.on('end', () => {
    console.log('Response size:', data.length, 'bytes');
    
    // Check if it's a valid PNG
    const isPng = data.length > 4 && data.slice(0, 4).toString('hex') === '89504e47';
    console.log('Valid PNG:', isPng);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: API returned HTTP 200 with', data.length, 'bytes of PNG data');
    } else {
      console.log('❌ FAILED: API returned HTTP', res.statusCode);
      console.log('Body:', data.toString('utf-8').substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(body);
req.end();
