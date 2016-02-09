// This file is written as an AMD module that will be loaded by the Intern
// test client. The test client can load node modules directly to test
// that individual pieces are working as expected.
//
// The flow for each test is generally:
//   1. Load the module you wish to perform unit tests on
//   2. Call the functions of that module directly and use the assert
//      library to verify expected results
//
// More info on writing Unit tests with Intern:
//    https://theintern.github.io/intern/#writing-unit-test
//
// We have chosen to use Intern's "BDD" interface (as opposed to the other
// options that Intern provides - "Object," "TDD," and "QUnit"):
//    https://theintern.github.io/intern/#interface-tdd/
//
// We have chosen to use Chai's "assert" library (as opposed to the other
// options that Chai provides - "expect" and "should"):
//    http://chaijs.com/api/assert/

define((require) => {
  const bdd = require('intern!bdd');
  const chai = require('intern/dojo/node!chai');
  const chaiHttp = require('intern/dojo/node!chai-http');
  chai.use(chaiHttp);
  const assert = chai.assert;

  // This modifies the node module loader to work with es2015 modules.
  // All subsequent `require` calls that use the node module loader
  // will use this modified version and will be able to load es2015
  // modules.
  require('intern/dojo/node!babel-core/register');
  const notifications = require('intern/dojo/node!../../../../engine/notifications');
  const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;

  function flushDB(client) {
    return redis.flushdb(client);
  }
  function flushQuitDB(client) {
    return flushDB(client).then(() => notifications.test.quitClient());
  }
  function register(deviceId, features, endpoint, key) {
    if (Object.prototype.toString.call(features) !== '[object Array]') {
      features = [features];
    }
    return notifications.default.register(deviceId, features, endpoint, key, 5);
  }

  bdd.describe('Notifications unit', () => {
    // clean and quit database after each test
    bdd.afterEach(() => notifications.test.setClient(5)
      .then((client) => flushQuitDB(client)));

    bdd.describe('Backend', () => {
      bdd.describe('register', () => {
        bdd.it('should fail if no endpoint provided or stored', () =>
          register('someId', ['feature'], null)
          .catch(err => {
            assert.ok(err);
            assert.equal(err.message, 'No endpoint provided');
          })
        );

        bdd.it('should fail if no features provided', () =>
          register('someId', [], 'http://endpoint')
          .catch(err => {
            assert.ok(err);
            assert.equal(err.message, 'No features provided');
          })
        );

        bdd.it('should save the endpoint and notifications registration', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', ['feature'], 'http://endpoint', 'someKey'))
          .then(() => redis.smembers(client, 'feature-notifications'))
          .then(featureNotifications => {
            assert.lengthOf(featureNotifications, 1);
            assert.strictEqual(featureNotifications[0], 'someId');
          })
          .then(() => redis.smembers(client, 'someId-notifications'))
          .then(deviceNotifications => {
            assert.lengthOf(deviceNotifications, 1);
            assert.strictEqual(deviceNotifications[0], 'feature');
          })
          .then(() => redis.hgetall(client, 'device-someId'))
          .then(device => {
            assert.isObject(device);
            assert.strictEqual(device.endpoint, 'http://endpoint');
            assert.strictEqual(device.key, 'someKey');
          });
        });

        bdd.it('should save work without endpoint if already saved it', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', 'feature', 'http://endpoint'))
          .then(() => register('someId', 'another-feature'))
          .then(() => redis.hget(client, 'device-someId', 'endpoint'))
          .then(endpoint => {
            assert.ok(endpoint);
            assert.strictEqual(endpoint, 'http://endpoint');
          });
        });

        bdd.it('should register to a second feature', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', 'feature', 'http://endpoint'))
          .then(() => register('someId', 'another-feature'))
          .then(() => redis.smembers(client, 'someId-notifications'))
          .then(deviceNotifications => {
            assert.lengthOf(deviceNotifications, 2);
            assert.include(deviceNotifications, 'feature');
            assert.include(deviceNotifications, 'another-feature');
          });
        });

        bdd.it('should register many devices to a feature', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', 'feature', 'http://endpoint'))
          .then(() => register('anotherId', 'feature', 'http://anotherEndpoint'))
          .then(() => redis.smembers(client, 'feature-notifications'))
          .then(featureNotifications => {
            assert.lengthOf(featureNotifications, 2);
            assert.include(featureNotifications, 'someId');
            assert.include(featureNotifications, 'anotherId');
          });
        });

        bdd.it('should register to multiple features in one call', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', ['feature', 'another-feature'], 'http://endpoint'))
          .then(() => redis.smembers(client, 'someId-notifications'))
          .then(deviceNotifications => {
            assert.lengthOf(deviceNotifications, 2);
            assert.include(deviceNotifications, 'feature');
            assert.include(deviceNotifications, 'another-feature');
          });
        });
      });

      bdd.describe('registered features', () => {
        bdd.it('should fail if no deviceId', () =>
          notifications.default.getRegisteredFeatures('someId', 5)
          .catch(err => {
            assert.ok(err);
            assert.strictEqual(err.message, 'Not Found');
          })
        );

        bdd.it('should return saved notifications', () =>
          register('someId', ['feature', 'another-feature'], 'http://endpoint')
          .then(() => notifications.default.getRegisteredFeatures('someId', 5))
          .then(deviceNotifications => {
            assert.isArray(deviceNotifications);
            assert.lengthOf(deviceNotifications, 2);
            assert.include(deviceNotifications, 'feature');
            assert.include(deviceNotifications, 'another-feature');
          })
        );
      });

      bdd.describe('unregister', () => {
        bdd.it('should fail if no deviceId', () =>
          notifications.default.unregister('someId', 5)
          .catch(err => {
            assert.ok(err);
            assert.strictEqual(err.message, 'Not Found');
          })
        );

        bdd.it('should unregister from a notification', () =>
          register('someId', ['feature', 'another-feature'], 'http://endpoint')
          .then(() => notifications.default.unregister('someId', ['feature'], 5))
          .then(() => notifications.default.getRegisteredFeatures('someId', 5))
          .then(deviceNotifications => {
            assert.isArray(deviceNotifications);
            assert.lengthOf(deviceNotifications, 1);
            assert.include(deviceNotifications, 'another-feature');
          })
        );

        bdd.it('should unregister and remove device', () =>
          register('someId', ['feature', 'another-feature'], 'http://endpoint')
          .then(() => notifications.default.unregister('someId', null, 5))
          .then(() => notifications.default.getRegisteredFeatures('someId', 5))
          .catch(err => {
            assert.ok(err);
            assert.strictEqual(err.message, 'Not Found');
          })
        );
      });

      bdd.describe('update endpoint', () => {
        bdd.it('should fail if no deviceId', () =>
          notifications.default.updateEndpoint('someId', 'http://endpoint', 5)
          .catch(err => {
            assert.ok(err);
            assert.strictEqual(err.message, 'Not Found');
          })
        );

        bdd.it('should fail if no endpoint', () =>
          register('someId', 'feature', 'http://endpoint')
          .then(() => notifications.default.updateEndpoint('someId', null, 5))
          .catch(err => {
            assert.ok(err);
            assert.strictEqual(err.message, 'No endpoint provided');
          })
        );

        bdd.it('should set endpoint', () => {
          var client;
          return notifications.test.setClient(5)
          .then(redisClient => {
            client = redisClient;
          })
          .then(() => register('someId', 'feature', 'http://endpoint'))
          .then(() => notifications.default.updateEndpoint('someId', 'http://another-endpoint', 5))
          .then(() => redis.hget(client, 'device-someId', 'endpoint'))
          .then(endpoint => {
            assert.ok(endpoint);
            assert.strictEqual(endpoint, 'http://another-endpoint');
          });
        });
      });
    });

    bdd.describe('Sending Notifications', () => {
      const nock = require('intern/dojo/node!nock');
      const crypto = require('intern/dojo/node!crypto');
      const urlBase64 = require('intern/dojo/node!urlsafe-base64');
      const userCurve = crypto.createECDH('prime256v1');

      const userPublicKey = userCurve.generateKeys();
      // const userPrivateKey = userCurve.getPrivateKey();

      bdd.describe('send notification', () => {
        bdd.afterEach(() => {
          nock.cleanAll();
        });
        bdd.it('should post to endpoint', () => {
          const service = nock('https://localhost:5005')
          .post('/')
          .reply(201);

          return register('someId', 'feature', 'https://localhost:5005/')
          .then(() => notifications.test.sendNotifications('feature', undefined, 5))
          .then(() => {
            assert.ok(service.isDone(), 'is service called');
          });
        });

        bdd.it('should post to non GCM endpoint with payload', () => {
          const service = nock('https://localhost:5005')
          .post('/')
          .reply(201);

          return register('someId', 'feature', 'https://localhost:5005/', urlBase64.encode(userPublicKey))
          .then(() => notifications.test.sendNotifications('feature', 'hello', 5))
          .then(() => {
            assert.ok(service.isDone());
          });
        });

        bdd.it('should not create a payload key if sending to non GCM endpoint with payload', () => {
          nock('https://localhost:5005')
          .post('/')
          .reply(201);

          return register('someId', 'feature', 'https://localhost:5005/', urlBase64.encode(userPublicKey))
          .then(() => notifications.test.sendNotifications('feature', 'hello', 5))
          .then(() => notifications.test.setClient(5))
          .then(client => redis.get(client, 'someId-payload'))
          .then(payload => {
            assert.notOk(payload);
          });
        });

        bdd.it('should post to GCM endpoint and create a payload', () => {
          const service = nock('https://android.googleapis.com')
          .post('/gcm')
          .reply(201);

          return register('someId', 'feature', 'https://android.googleapis.com/gcm/send')
          .then(() => notifications.test.sendNotifications('feature', 'hello', 5))
          .then(() => notifications.test.setClient(5))
          .then(client => redis.get(client, 'someId-payload'))
          .then(payload => {
            assert.strictEqual(payload, '"hello"');
            assert.ok(service.isDone());
          });
        });

        bdd.it('should delete payload after providing it', () => {
          var client;

          return notifications.test.setClient(5)
          .then(redisClient => client = redisClient)
          .then(() => redis.set(client, 'someId-payload', 'hello'))
          .then(() => notifications.default.getPayload('someId', 5))
          .then(() => redis.get(client, 'someId-payload'))
          .then(payload => {
            assert.notOk(payload);
          });
        });

        bdd.it('should post if someone registered to all', () => {
          const serviceA = nock('https://localhost:5005')
          .post('/')
          .reply(201);

          const serviceB = nock('https://localhost:5006')
          .post('/')
          .reply(201);

          return register('someId', 'feature', 'https://localhost:5005/')
          .then(() => register('anotherId', 'all', 'https://localhost:5006/'))
          .then(() => notifications.test.sendNotifications('feature', undefined, 5))
          .then(() => {
            assert.ok(serviceA.isDone(), 'is serviceA called');
            assert.ok(serviceB.isDone(), 'is serviceB called');
          });
        });

        bdd.it('should post to multiple endpoints', () => {
          const serviceA = nock('https://localhost:5005')
          .post('/')
          .reply(201);

          const serviceB = nock('https://localhost:5006')
          .post('/')
          .reply(201);

          return register('someId', 'feature', 'https://localhost:5005/')
          .then(() => register('anotherId', 'feature', 'https://localhost:5006/'))
          .then(() => notifications.test.sendNotifications('feature', undefined, 5))
          .then(() => {
            assert.ok(serviceA.isDone(), 'is serviceA called');
            assert.ok(serviceB.isDone(), 'is serviceB called');
          });
        });
      });
    });

    bdd.describe('API', () => {
      // const nock = require('intern/dojo/node!nock');
      // const crypto = require('intern/dojo/node!crypto');
      // const urlBase64 = require('intern/dojo/node!urlsafe-base64');
      // const userCurve = crypto.createECDH('prime256v1');
      const portfinder = require('intern/dojo/node!portfinder');
      const platatus = require('intern/dojo/node!../app');
      // const userPublicKey = userCurve.generateKeys();

      var port;
      var server;
      function api() {
        return chai.request(`http://localhost:${port}`);
      }

      bdd.before(() => new Promise((resolve) => {
        portfinder.getPort((err, receivedPort) => {
          port = receivedPort;
          server = platatus.listen(port, () => {
            console.log('server is running on port %j', port);
            resolve();
          });
        });
      }));

      bdd.after(() => server.close());

      bdd.it('registers a device', () => {
        var client;
        return notifications.test.setClient(5)
        .then(redisClient => client = redisClient)
        .then(() => api()
          .post('/register')
          .send({
            deviceId: 'someId',
            endpoint: 'https://endpoint',
            features: ['feature', 'another-feature'],
          }))
        .then(() => redis.hget(client, 'device-someId', 'endpoint'))
        .then(endpoint => {
          assert.ok(endpoint);
          assert.strictEqual(endpoint, 'https://endpoint');
        })
        .then(() => redis.smembers(client, 'someId-notifications'))
        .then(deviceNotifications => {
          assert.lengthOf(deviceNotifications, 2);
          assert.include(deviceNotifications, 'feature');
          assert.include(deviceNotifications, 'another-feature');
        })
        .then(() => redis.smembers(client, 'feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 1);
          assert.include(featureNotifications, 'someId');
        })
        .then(() => redis.smembers(client, 'another-feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 1);
          assert.include(featureNotifications, 'someId');
        });
      });

      bdd.it('/payload replies with 404 if there\'s no payload available', () =>
        register('someId', 'feature', 'https://localhost:5005')
        .then(() => api()
          .get('/payload/someId')
          .send())
        .catch(err => {
          assert.strictEqual(err.response.statusCode, 404);
        })
      );

      bdd.it('/payload returns the right content', () => notifications.test.setClient(5)
        .then(client => redis.set(client, 'someId-payload', 'hello'))
        .then(() => api()
          .get('/payload/someId')
          .send())
        .then(response => {
          assert.equal(response.status, 200);
          assert.equal(response.body, 'hello');
        })
      );

      bdd.it('/registrations returns an array with registrations for device', () =>
          register('someId', ['feature', 'another-feature'], 'https://localhost:5005/')
        .then(() => api()
          .get('/registrations/someId')
          .send())
        .then(response => {
          assert.equal(response.status, 200);
          assert.isArray(response.body.features);
          assert.include(response.body.features, 'feature');
          assert.include(response.body.features, 'another-feature');
        })
      );

      bdd.it('/registrations replies with 404 if no registrations for the user', () =>
          register('someId', ['feature', 'another-feature'], 'https://localhost:5005/')
        .then(() => api()
          .get('/registrations/someOtherId')
          .send())
        .catch(err => {
          assert.strictEqual(err.response.statusCode, 404);
        })
      );

      bdd.it('/unregister removes only from the another-feature', () => {
        var client;

        return register('someId', ['feature', 'another-feature'], 'https://localhost:5005/')
        .then(() => api()
          .post('/unregister')
          .send({
            deviceId: 'someId',
            features: ['another-feature'],
          }))
        .then(response => {
          assert.equal(response.status, 200);
        })
        .then(() => notifications.test.setClient(5))
        .then(redisClient => client = redisClient)
        .then(() => redis.smembers(client, 'someId-notifications'))
        .then(deviceNotifications => {
          assert.lengthOf(deviceNotifications, 1);
          assert.strictEqual(deviceNotifications[0], 'feature');
        })
        .then(() => redis.smembers(client, 'feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 1);
          assert.strictEqual(featureNotifications[0], 'someId');
        })
        .then(() => redis.smembers(client, 'another-feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 0);
        });
      });

      bdd.it('/unregister removes all device info', () => {
        var client;

        return register('someId', ['feature', 'another-feature'], 'https://localhost:5005/')
        .then(() => api()
          .post('/unregister')
          .send({
            deviceId: 'someId',
          }))
        .then(response => {
          assert.equal(response.status, 200);
        })
        .then(() => notifications.test.setClient(5))
        .then(redisClient => client = redisClient)
        .then(() => redis.smembers(client, 'someId-notifications'))
        .then(deviceNotifications => {
          assert.lengthOf(deviceNotifications, 0);
        })
        .then(() => redis.smembers(client, 'feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 0);
        })
        .then(() => redis.smembers(client, 'another-feature-notifications'))
        .then(featureNotifications => {
          assert.lengthOf(featureNotifications, 0);
        })
        .then(() => redis.hgetall(client, 'device-deviceId'))
        .then(device => {
          assert.notOk(device);
        });
      });

      bdd.it('/update_endpoint changes the endpoint info', () =>
          register('someId', 'feature', 'https://localhost:5005/', 'akey')
        .then(() => api()
          .put('/update_endpoint')
          .send({
            deviceId: 'someId',
            endpoint: 'https://localhost:5006/',
            key: 'anotherkey',
          }))
        .then(response => {
          assert.equal(response.status, 200);
        })
        .then(() => notifications.test.setClient(5))
        .then(client => redis.hgetall(client, 'device-someId'))
        .then(device => {
          assert.isObject(device);
          assert.strictEqual(device.endpoint, 'https://localhost:5006/');
          assert.strictEqual(device.key, 'anotherkey');
        })
      );

      bdd.it('/update_endpoint replies with 404 if no registrations for the device', () =>
        notifications.test.setClient(5)
        .then(() => api()
          .put('/update_endpoint')
          .send({
            deviceId: 'someId',
            endpoint: 'https://localhost:5006/',
            key: 'anotherkey',
          }))
        .catch(err => {
          assert.strictEqual(err.response.statusCode, 404);
        })
      );
    });
  });
});
