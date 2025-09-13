// api/admin.js
const crypto = require('crypto');

// Global database simulation (in production, use real database)
global.keyDatabase = global.keyDatabase || new Map();
global.deviceBindings = global.deviceBindings || new Map();
global.usageLogs = global.usageLogs || [];

function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Initialize demo keys if empty
if (global.keyDatabase.size === 0) {
  const demoKeys = [
    {
      key: 'DEMO1234567890AB',
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      isActive: true,
      usageCount: 0,
      maxUsage: 1
    }
  ];
  
  demoKeys.forEach(key => {
    global.keyDatabase.set(key.key, key);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { password } = req.query;
  
  if (password !== 'Whoamidev1819') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method === 'GET') {
    const keys = Array.from(global.keyDatabase.values()).map(key => ({
      key: req.query.showFull === 'true' ? key.key : key.key.substring(0, 8) + '...',
      createdAt: new Date(key.createdAt).toISOString(),
      expiresAt: new Date(key.expiresAt).toISOString(),
      isActive: key.isActive,
      usageCount: key.usageCount,
      maxUsage: key.maxUsage,
      deviceBound: !!key.deviceId
    }));
    
    return res.json({ 
      success: true, 
      keys: keys,
      stats: {
        totalKeys: global.keyDatabase.size,
        activeKeys: keys.filter(k => k.isActive).length,
        totalLogs: global.usageLogs.length
      }
    });
  }
  
  if (req.method === 'POST') {
    const { duration = 30, maxUsage = 1, customKey } = req.body || {};
    
    const newKey = {
      key: customKey || generateRandomKey(),
      userId: null,
      deviceId: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + (duration * 24 * 60 * 60 * 1000),
      isActive: true,
      usageCount: 0,
      maxUsage: maxUsage
    };
    
    if (global.keyDatabase.has(newKey.key)) {
      return res.status(409).json({ error: 'Key already exists' });
    }
    
    global.keyDatabase.set(newKey.key, newKey);
    
    return res.json({
      success: true,
      key: newKey.key,
      expiresAt: newKey.expiresAt,
      maxUsage: newKey.maxUsage
    });
  }
  
  if (req.method === 'DELETE') {
    const { key } = req.body || {};
    
    if (!key) {
      return res.status(400).json({ error: 'Key required' });
    }
    
    if (global.keyDatabase.delete(key)) {
      global.deviceBindings.delete(key);
      return res.json({ success: true, message: 'Key deleted' });
    }
    
    return res.status(404).json({ error: 'Key not found' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
