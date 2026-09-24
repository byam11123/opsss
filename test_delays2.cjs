const http = require('http');
http.get('http://localhost:3000/api/purchase-fms/pipeline', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const items = JSON.parse(data).data.items;
    const delays = items.filter(i => i.currentBottleneck).map(i => i.currentBottleneck.delay);
    console.log('Delays found:', delays.slice(0, 50));
  });
});
