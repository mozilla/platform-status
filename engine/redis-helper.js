import redis from 'redis';

let client = null;
let redisIndex = null;

function getClient() {
  if (!client) {
    client = redis.createClient({
      url: process.env.REDIS_URL,
    });
  }
  console.log('XXX', process.env.REDIS_INDEX);
  if (process.env.REDIS_INDEX === undefined || redisIndex === process.env.REDIS_INDEX) {
    return Promise.resolve(client);
  }
  redisIndex = process.env.REDIS_INDEX || 0;
  return new Promise((resolve, reject) => {
    client.select(redisIndex, err => {
      if (err) {
        console.log('REDIS ERROR:', err);
        client.quit();
        reject(err);
        return;
      }
      resolve(client);
    });
  });
}

const commands = {};

// promisify following commads (add client as the first argument)
// redis function:
// `client.methodName(arguments, callback(err, response))`
['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
 'sadd', 'hgetall', 'srem', 'select', 'flushdb', 'quit']
.forEach(name => {
  commands[name] = function redisFunction(...args) {
    return getClient()
    .then(() => new Promise((resolve, reject) => {
      args.push((err, response) => err ? reject(err) : resolve(response));
      client[name](...args);
    }));
  };
});

function quitClient() {
  if (!client) {
    return Promise.reject(new Error('No redis client open'));
  }
  const response = commands.quit()
  .then(() => {
    client = null;
  });
  return response;
}

commands.getClient = getClient;
commands.quitClient = quitClient;

export default commands;
