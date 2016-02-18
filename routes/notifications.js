const express = require('express');
import { default as notifications } from '../engine/notifications';
const router = new express.Router();

function handleErrorResponse(err, res) {
  if (err.message === 'Not Found') {
    return res.sendStatus(404);
  }
  console.error(err.message);
  res.sendStatus(500, err.message);
}

router.post('/register', (req, res) => {
  notifications.register(req.body.deviceId, req.body.features, req.body.endpoint)
  .catch(err => handleErrorResponse(err, res))
  .then(features => res.json({ features }));
});

router.get('/registrations/:deviceId', (req, res) => {
  notifications.getRegisteredFeatures(req.params.deviceId)
  .catch(err => handleErrorResponse(err, res))
  .then((features) => res.json({ features }));
});

router.post('/unregister', (req, res) => {
  notifications.unregister(req.body.deviceId, req.body.features)
  .catch(err => handleErrorResponse(err, res))
  .then(() => res.json({ success: 'success' }));
});

router.put('/update_endpoint', (req, res) => {
  notifications.updateEndpoint(req.body.deviceId, req.body.endpoint, req.body.key)
  .catch(err => handleErrorResponse(err, res))
  .then(() => res.json({ success: 'success' }));
});

router.get('/payload/:deviceId', (req, res) => {
  notifications.getPayload(req.params.deviceId)
  .then(payload => {
    if (!payload) {
      res.sendStatus(404);
    }
    return res.json(payload);
  });
});

module.exports = router;
export default router;
