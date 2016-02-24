import redis from 'redis';

function getClient(dbTestNumber) {
  const client = redis.createClient(process.env.REDIS_URL, { no_ready_check: true });
  return new Promise((resolve, reject) => {
    if (!dbTestNumber) {
      return resolve(client);
    }
    return client.select(dbTestNumber, err => {
      if (err) {
        return reject(err);
      }
      return resolve(client);
    });
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
      args.push((err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
      client[name].apply(client, args);
    });
  };
});

export default commands;
