const Workflow = require('../models/Workflow');
const { getAllTemplates, PRESET_TEMPLATES } = require('../services/taskGenerator');

/**
 * Get summary metrics for compliance workflows
 * GET /api/analytics/summary
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [totalWorkflows, workflows] = await Promise.all([
      Workflow.countDocuments(),
      Workflow.find({}, 'priority status metadata')
    ]);

    const statusCounts = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      draft: 0,
      cancelled: 0
    };

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    let totalTasks = 0;
    let completedTasks = 0;

    workflows.forEach((wf) => {
      if (statusCounts[wf.status] !== undefined) {
        statusCounts[wf.status]++;
      }
      if (priorityCounts[wf.priority] !== undefined) {
        priorityCounts[wf.priority]++;
      }
      if (wf.metadata) {
        totalTasks += wf.metadata.totalTasks || 0;
        completedTasks += wf.metadata.completedTasks || 0;
      }
    });

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalWorkflows,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        completionRate: `${completionRate}%`,
        completionRateValue: completionRate,
        byStatus: statusCounts,
        byPriority: priorityCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of standard CA compliance templates
 * GET /api/templates
 */
const getTemplates = async (req, res) => {
  const templates = getAllTemplates();
  res.status(200).json({
    success: true,
    count: templates.length,
    data: templates
  });
};

/**
 * Get a specific template by service type
 * GET /api/templates/:service
 */
const getTemplateByService = async (req, res) => {
  const serviceKey = req.params.service.toLowerCase().trim();
  let template = PRESET_TEMPLATES[serviceKey];

  if (!template) {
    for (const key of Object.keys(PRESET_TEMPLATES)) {
      if (serviceKey.includes(key) || key.includes(serviceKey)) {
        template = PRESET_TEMPLATES[key];
        break;
      }
    }
  }

  if (template && template.alias) {
    template = PRESET_TEMPLATES[template.alias];
  }

  if (!template) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'TEMPLATE_NOT_FOUND',
        message: `Template for '${req.params.service}' not found.`
      }
    });
  }

  res.status(200).json({
    success: true,
    data: template
  });
};

module.exports = {
  getAnalytics,
  getTemplates,
  getTemplateByService
};
