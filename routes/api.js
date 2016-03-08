import { default as express } from 'express';
import { default as digger } from '../engine/digger';
import { default as helper } from './helper.js';
const router = new express.Router();

router.get('/api/status', (req, res) =>
  digger.getStatus()
  .then(status => res.json(status))
  .catch(err => helper.handleErrorResponse(err, res))
);

router.get('/api/feature/:slug', (req, res) =>
  digger.getFeatureStatus(req.params.slug)
  .then(featureStatus => res.json(featureStatus))
  .catch(err => helper.handleErrorResponse(err, res))
);

module.exports = router;
export default router;
