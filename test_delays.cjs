const http = require('http');

http.get('http://localhost:3000/api/purchase-fms/pipeline', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data.slice(0, 500));
  });
});
