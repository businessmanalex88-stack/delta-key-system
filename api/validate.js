// api/validate.js
const crypto = require('crypto');

// Use global database
global.keyDatabase = global.keyDatabase || new Map();
global.deviceBindings = global.deviceBindings || new Map();
global.usageLogs = global.usageLogs || [];

function generateDeviceFingerprint(userAgent, ip, deviceInfo = {}) {
  const fingerprint = {
    userAgent: userAgent || '',
    ip: (ip || '').split(',')[0].trim(), // Get first IP if multiple
    platform: deviceInfo.platform || '',
    executor: deviceInfo.executor || '',
    screen: deviceInfo.screen || '',
    hour: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour precision for some variance
  };
  
  const combined = JSON.stringify(fingerprint);
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { key, deviceInfo } = req.body || {};
    
    if (!key) {
      return res.status(400).json({ error: 'Key required' });
    }
    
    // Get key from database
    const keyData = global.keyDatabase.get(key);
    
    if (!keyData) {
      global.usageLogs.push({
        key: key,
        action: 'invalid_key_attempt',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        timestamp: Date.now(),
        suspicious: true
      });
      
      return res.status(404).json({ error: 'Invalid key' });
    }
    
    // Check expiration
    if (Date.now() > keyData.expiresAt) {
      return res.status(403).json({ error: 'Key expired' });
    }
    
    // Check active status
    if (!keyData.isActive) {
      return res.status(403).json({ error: 'Key deactivated' });
    }
    
    // Check usage limit
    if (keyData.usageCount >= keyData.maxUsage) {
      return res.status(403).json({ error: 'Usage limit exceeded' });
    }
    
    // Generate device fingerprint
    const currentDeviceId = generateDeviceFingerprint(
      req.headers['user-agent'],
      req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      deviceInfo
    );
    
    // Check device binding
    const boundDeviceId = global.deviceBindings.get(key);
    
    if (!boundDeviceId) {
      // First time usage - bind device
      global.deviceBindings.set(key, currentDeviceId);
      keyData.deviceId = currentDeviceId;
      keyData.usageCount += 1;
      global.keyDatabase.set(key, keyData);
      
      global.usageLogs.push({
        key: key,
        deviceId: currentDeviceId,
        action: 'first_bind',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        timestamp: Date.now()
      });
      
      return res.json({ 
        success: true, 
        message: 'Key validated and device bound',
        remainingUses: keyData.maxUsage - keyData.usageCount,
        expiresAt: keyData.expiresAt
      });
    }
    
    // Verify device fingerprint
    if (boundDeviceId !== currentDeviceId) {
      global.usageLogs.push({
        key: key,
        deviceId: currentDeviceId,
        boundDeviceId: boundDeviceId,
        action: 'device_mismatch',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        timestamp: Date.now(),
        suspicious: true
      });
      
      return res.status(403).json({ 
        error: 'Device mismatch. This key is bound to another device.' 
      });
    }
    
    // Update usage
    keyData.usageCount += 1;
    global.keyDatabase.set(key, keyData);
    
    global.usageLogs.push({
      key: key,
      deviceId: currentDeviceId,
      action: 'successful_validation',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: Date.now()
    });
    
    return res.json({ 
      success: true, 
      message: 'Key validated successfully',
      remainingUses: keyData.maxUsage - keyData.usageCount,
      expiresAt: keyData.expiresAt
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
