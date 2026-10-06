const express = require('express');
const router = express.Router();

const {
  getAnalytics,
  getTemplates,
  getTemplateByService
} = require('../controllers/analyticsController');

router.get('/analytics/summary', getAnalytics);
router.get('/templates', getTemplates);
router.get('/templates/:service', getTemplateByService);

module.exports = router;
