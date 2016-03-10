import redis from 'redis';

function handleRedisResponse(err, response, resolve, reject) {
  if (err) {
    reject(err);
    return;
  }
  resolve(response);
}

function getClient(dbTestNumber) {
  const client = redis.createClient(process.env.REDIS_URL, { no_ready_check: true });
  return new Promise((resolve, reject) => {
    if (!dbTestNumber) {
      resolve(client);
      return;
    }

    client.select(dbTestNumber, err => handleRedisResponse(err, client, resolve, reject));
  });
}

const commands = {
  getClient,
};

// promisify following commads (add client as the first argument)
['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
 'sadd', 'hgetall', 'srem', 'select', 'flushdb', 'quit']
.forEach(name => {
  commands[name] = function redisFunction(...args) {
    const client = args.shift();
    return new Promise((resolve, reject) => {
      args.push((err, response) => handleRedisResponse(err, response, resolve, reject));
      client[name].apply(client, args);
    });
  };
});

export default commands;
