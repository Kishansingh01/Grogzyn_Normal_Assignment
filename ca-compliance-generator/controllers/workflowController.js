const Workflow = require('../models/Workflow');
const { generateWorkflowStages } = require('../services/taskGenerator');

/**
 * Generate and store a new CA Compliance Workflow
 * POST /api/workflows/generate
 */
const generateWorkflow = async (req, res, next) => {
  try {
    const payload = req.validatedBody;

    // Generate workflow stages and tasks
    const generatedStages = generateWorkflowStages(payload);

    const newWorkflow = new Workflow({
      serviceType: payload.serviceType,
      purpose: payload.purpose,
      priority: payload.priority || 'medium',
      clientName: payload.clientName || 'General Client',
      financialPeriod: payload.financialPeriod || 'FY 2025-26',
      dueDate: payload.dueDate || null,
      status: 'pending',
      stages: generatedStages
    });

    const savedWorkflow = await newWorkflow.save();

    // Check if simple format was requested via query parameter
    const isSimpleFormat = req.query.format === 'simple';

    res.status(201).json({
      success: true,
      message: 'Compliance workflow generated and saved successfully',
      data: isSimpleFormat ? savedWorkflow.toSimpleFormat() : savedWorkflow,
      simpleView: savedWorkflow.toSimpleFormat()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Directly create a workflow (alias to generate with custom or default stages)
 * POST /api/workflows
 */
const createWorkflow = async (req, res, next) => {
  return generateWorkflow(req, res, next);
};

/**
 * Get all workflows with optional filters, search, and pagination
 * GET /api/workflows
 */
const getAllWorkflows = async (req, res, next) => {
  try {
    const {
      serviceType,
      status,
      priority,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      format = 'detailed'
    } = req.query;

    const filter = {};

    if (serviceType) {
      filter.serviceType = { $regex: serviceType, $options: 'i' };
    }

    if (status) {
      filter.status = status.toLowerCase();
    }

    if (priority) {
      filter.priority = priority.toLowerCase();
    }

    if (search) {
      filter.$or = [
        { serviceType: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [workflows, total] = await Promise.all([
      Workflow.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Workflow.countDocuments(filter)
    ]);

    const formattedData =
      format === 'simple'
        ? workflows.map((wf) => wf.toSimpleFormat())
        : workflows;

    res.status(200).json({
      success: true,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single workflow by ID
 * GET /api/workflows/:id
 */
const getWorkflowById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workflow = await Workflow.findById(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: `Workflow with ID '${id}' was not found`
        }
      });
    }

    const format = req.query.format;
    const data = format === 'simple' ? workflow.toSimpleFormat() : workflow;

    res.status(200).json({
      success: true,
      data,
      simpleView: workflow.toSimpleFormat()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update top-level workflow properties
 * PUT /api/workflows/:id or PATCH /api/workflows/:id
 */
const updateWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.validatedBody;

    const workflow = await Workflow.findById(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: `Workflow with ID '${id}' was not found`
        }
      });
    }

    // Apply allowed updates
    const allowedFields = [
      'serviceType',
      'purpose',
      'priority',
      'status',
      'clientName',
      'financialPeriod',
      'dueDate'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        workflow[field] = updates[field];
      }
    });

    const updatedWorkflow = await workflow.save();

    res.status(200).json({
      success: true,
      message: 'Workflow updated successfully',
      data: updatedWorkflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a workflow by ID
 * DELETE /api/workflows/:id
 */
const deleteWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedWorkflow = await Workflow.findByIdAndDelete(id);

    if (!deletedWorkflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: `Workflow with ID '${id}' was not found`
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully',
      deletedId: id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateWorkflow,
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow
};
