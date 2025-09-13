// api/logs.js
global.usageLogs = global.usageLogs || [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    const logData = req.body || {};
    global.usageLogs.push({
      ...logData,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 logs
    if (global.usageLogs.length > 1000) {
      global.usageLogs = global.usageLogs.slice(-1000);
    }
    
    return res.json({ success: true });
  }
  
  if (req.method === 'GET') {
    const { password, limit = 50, suspicious = false } = req.query;
    
    if (password !== 'Whoamidev1819') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    let logs = global.usageLogs;
    
    if (suspicious === 'true') {
      logs = logs.filter(log => log.suspicious);
    }
    
    return res.json({
      success: true,
      logs: logs.slice(-parseInt(limit)).reverse(),
      total: logs.length
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
