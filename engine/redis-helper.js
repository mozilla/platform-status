import redis from 'redis';

function getClient(dbTestNumber) {
  const client = redis.createClient(process.env.REDISCLOUD_URL, { no_ready_check: true });
  return new Promise((resolve, reject) => {
    if (dbTestNumber) {
      client.select(dbTestNumber, (err) => {
        if (err) {
          reject(err);
        }
        resolve(client);
      });
    } else {
      resolve(client);
    }
  })
  .catch((err) => {
    throw new Error(err);
  });
}

export default {
  getClient,
};
