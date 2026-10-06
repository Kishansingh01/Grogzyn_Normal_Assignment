const Workflow = require('../models/Workflow');

/**
 * Add a task to a stage
 * POST /api/workflows/:id/stages/:stageId/tasks
 */
const addTask = async (req, res, next) => {
  try {
    const { id, stageId } = req.params;
    const { title, status = 'pending', assignedTo = 'Unassigned', dueDate = null } = req.validatedBody;

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

    stage.tasks.push({
      title,
      status,
      assignedTo,
      dueDate
    });

    await workflow.save();
    const createdTask = stage.tasks[stage.tasks.length - 1];

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: createdTask,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a task inside a stage
 * PUT /api/workflows/:id/stages/:stageId/tasks/:taskId
 * PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId
 */
const updateTask = async (req, res, next) => {
  try {
    const { id, stageId, taskId } = req.params;
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

    const task = stage.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task with ID '${taskId}' was not found in stage '${stageId}'`
        }
      });
    }

    ['title', 'status', 'assignedTo', 'dueDate'].forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await workflow.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle task status between 'completed' and 'pending'
 * PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId/toggle
 */
const toggleTaskStatus = async (req, res, next) => {
  try {
    const { id, stageId, taskId } = req.params;

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
          message: `Stage with ID '${stageId}' was not found`
        }
      });
    }

    const task = stage.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task with ID '${taskId}' was not found`
        }
      });
    }

    task.status = task.status === 'completed' ? 'pending' : 'completed';
    await workflow.save();

    res.status(200).json({
      success: true,
      message: `Task marked as ${task.status}`,
      data: task,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task from a stage
 * DELETE /api/workflows/:id/stages/:stageId/tasks/:taskId
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id, stageId, taskId } = req.params;

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
          message: `Stage with ID '${stageId}' was not found`
        }
      });
    }

    const task = stage.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task with ID '${taskId}' was not found`
        }
      });
    }

    task.deleteOne();
    await workflow.save();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      deletedTaskId: taskId,
      workflow
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTask,
  updateTask,
  toggleTaskStatus,
  deleteTask
};
