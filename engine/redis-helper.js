import redis from 'redis';

let client;

function getClient(dbTestNumber) {
  if (!client) {
    client = redis.createClient({
      url: process.env.REDIS_URL,
    });
  }
  if (!dbTestNumber) {
    return Promise.resolve(client);
  }
  return new Promise((resolve, reject) => {
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
 'sadd', 'hgetall', 'srem', 'select', 'flushdb']
.forEach(name => {
  commands[name] = function redisFunction(instance, ...args) {
    return new Promise((resolve, reject) => {
      args.push((err, response) => err ? reject(err) : resolve(response));
      instance[name](...args);
    });
  };
});

export default commands;
