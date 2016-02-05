const express = require('express');
import notifications from '../engine/notifications';
const router = new express.Router();

router.post('/register', function register(req, res) {
  notifications.register(req.body.deviceId, req.body.endpoint, req.body.features)
  .catch(() => res.sendStatus(404))
  .then(() => res.json({ success: 'success' }));
});

router.get('/registrations:deviceId', function registrations(req, res) {
  notifications.getRegisteredFeatures(req.body.deviceId)
  .catch(() => res.sendStatus(404))
  .then((features) => res.json({ features }));
});

router.post('/unregister', function unregister(req, res) {
  res.json(req);
});

router.put('/update_endpoint', function updateEndpoint(req, res) {
  res.json(req);
});

module.exports = router;
export default router;
