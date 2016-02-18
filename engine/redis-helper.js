import redis from 'redis';

function getClient(dbTestNumber) {
  const client = redis.createClient(process.env.REDIS_URL, { no_ready_check: true });
  return new Promise((resolve, reject) => {
    if (!dbTestNumber) {
      return resolve(client);
    }

    client.select(dbTestNumber, (err) => err ? reject(err) : resolve(client));
  });
}

const commands = {
  getClient,
};

// promisify following commads (add client as the first argument)
['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
 'sadd', 'hgetall', 'srem', 'select', 'flushdb', 'quit']
.map(name => {
  commands[name] = function redisFunction() {
    const args = Array.prototype.slice.call(arguments);
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
