const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

redisClient.on('connect', () => {
  console.log('✅ Redis Client Connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

module.exports = redisClient;
module.exports.redisClient = redisClient;
