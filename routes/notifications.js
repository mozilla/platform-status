import { default as express } from 'express';
import { default as notifications } from '../engine/notifications';
const router = new express.Router();

function handleErrorResponse(err, res) {
  if (err.message === 'Not Found') {
    return res.sendStatus(404);
  }
  console.error(err.message);
  return res.sendStatus(500, err.message);
}

router.post('/register', (req, res) =>
  notifications.register(
    req.body.deviceId,
    req.body.features,
    req.body.endpoint,
    req.body.key,
    req.body.authSecret)
  .catch(err => handleErrorResponse(err, res))
  .then(features => res.json({ features }))
);

router.get('/registrations/:deviceId', (req, res) =>
  notifications.getRegisteredFeatures(req.params.deviceId)
  .catch(err => handleErrorResponse(err, res))
  .then((features) => res.json({ features }))
);

router.post('/unregister', (req, res) =>
  notifications.unregister(req.body.deviceId, req.body.features)
  .catch(err => handleErrorResponse(err, res))
  .then(features => res.json({ features }))
);

router.put('/update_device', (req, res) =>
  notifications.updateDevice(
    req.body.deviceId,
    req.body.endpoint,
    req.body.key,
    req.body.authSecret)
  .catch(err => handleErrorResponse(err, res))
  .then(() => res.json({ success: 'success' }))
);

router.get('/payload/:deviceId', (req, res) =>
  notifications.getPayload(req.params.deviceId)
  .then(payload => {
    if (!payload) {
      res.sendStatus(404);
    }
    return res.json(payload);
  })
);

router.get('/test_notification', (req, res) => {
  if (!req) {
    // this lines are only to satisfy eslint
    return null;
  }
  return notifications.sendNotifications('asmjs', { title: 'Test', body: 'Notification' })
  .then(() => res.json({ success: 'Success' }));
});

module.exports = router;
export default router;
