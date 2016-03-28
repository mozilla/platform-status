import redis from 'redis';

function getClient(dbTestNumber) {
  const client = redis.createClient({
    url: process.env.REDIS_URL,
    no_ready_check: true,
  });
  return new Promise((resolve, reject) => {
    if (!dbTestNumber) {
      resolve(client);
      return;
    }

    client.select(dbTestNumber, (err) => err ? reject(err) : resolve(client));
  });
}

const commands = {
  getClient,
};

// promisify following commads (add client as the first argument)
// redis function:
// `client.methodName(arguments, callback(err, response))`
['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
 'sadd', 'hgetall', 'srem', 'select', 'flushdb', 'quit']
.forEach(name => {
  commands[name] = function redisFunction(client, ...args) {
    return new Promise((resolve, reject) => {
      args.push((err, response) => err ? reject(err) : resolve(response));
      client[name](...args);
    });
  };
});

export default commands;
