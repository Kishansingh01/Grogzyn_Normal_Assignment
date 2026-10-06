const Workflow = require('../models/Workflow');

/**
 * Add a new stage to a workflow
 * POST /api/workflows/:id/stages
 */
const addStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tasks = [] } = req.validatedBody;

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

    const formattedTasks = tasks.map((t) => {
      if (typeof t === 'string') {
        return { title: t, status: 'pending' };
      }
      return {
        title: t.title,
        status: t.status || 'pending',
        assignedTo: t.assignedTo || 'Unassigned',
        dueDate: t.dueDate || null
      };
    });

    workflow.stages.push({
      name,
      tasks: formattedTasks
    });

    await workflow.save();
    const createdStage = workflow.stages[workflow.stages.length - 1];

    res.status(201).json({
      success: true,
      message: 'Stage added successfully',
      data: createdStage,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing stage
 * PUT /api/workflows/:id/stages/:stageId
 */
const updateStage = async (req, res, next) => {
  try {
    const { id, stageId } = req.params;
    const { name } = req.validatedBody;

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

    const stage = workflow.stages.id(stageId);
    if (!stage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAGE_NOT_FOUND',
          message: `Stage with ID '${stageId}' was not found in workflow '${id}'`
        }
      });
    }

    if (name) {
      stage.name = name;
    }

    await workflow.save();

    res.status(200).json({
      success: true,
      message: 'Stage updated successfully',
      data: stage,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a stage from a workflow
 * DELETE /api/workflows/:id/stages/:stageId
 */
const deleteStage = async (req, res, next) => {
  try {
    const { id, stageId } = req.params;

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

    const stage = workflow.stages.id(stageId);
    if (!stage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAGE_NOT_FOUND',
          message: `Stage with ID '${stageId}' was not found in workflow '${id}'`
        }
      });
    }

    stage.deleteOne();
    await workflow.save();

    res.status(200).json({
      success: true,
      message: 'Stage deleted successfully',
      deletedStageId: stageId,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addStage,
  updateStage,
  deleteStage
};
