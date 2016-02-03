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

export default {
  getClient,
};
