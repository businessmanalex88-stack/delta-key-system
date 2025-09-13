// api/status.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  return res.json({
    success: true,
    message: 'Delta Key System API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      validate: '/api/validate (POST)',
      admin: '/api/admin (GET/POST/DELETE)',
      logs: '/api/logs (GET/POST)',
      status: '/api/status (GET)'
    },
    version: '1.0.0'
  });
}
