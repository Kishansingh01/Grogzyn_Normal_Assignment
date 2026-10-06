const express = require('express');
const router = express.Router();

const {
  generateWorkflow,
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow
} = require('../controllers/workflowController');

const {
  addStage,
  updateStage,
  deleteStage
} = require('../controllers/stageController');

const {
  addTask,
  updateTask,
  toggleTaskStatus,
  deleteTask
} = require('../controllers/taskController');

const {
  validateParams,
  validateGenerateWorkflow,
  validateUpdateWorkflow,
  validateStage,
  validateTask,
  validateUpdateTask
} = require('../middlewares/validator');

// Workflow Generation & Creation
router.post('/generate', validateGenerateWorkflow, generateWorkflow);
router.post('/', validateGenerateWorkflow, createWorkflow);

// Workflows Listing & Retrieval
router.get('/', getAllWorkflows);
router.get('/:id', validateParams('id'), getWorkflowById);

// Workflow Update & Deletion
router.put('/:id', validateParams('id'), validateUpdateWorkflow, updateWorkflow);
router.patch('/:id', validateParams('id'), validateUpdateWorkflow, updateWorkflow);
router.delete('/:id', validateParams('id'), deleteWorkflow);

// Stages CRUD
router.post('/:id/stages', validateParams('id'), validateStage, addStage);
router.put('/:id/stages/:stageId', validateParams('id', 'stageId'), validateStage, updateStage);
router.delete('/:id/stages/:stageId', validateParams('id', 'stageId'), deleteStage);

// Tasks CRUD
router.post('/:id/stages/:stageId/tasks', validateParams('id', 'stageId'), validateTask, addTask);
router.put('/:id/stages/:stageId/tasks/:taskId', validateParams('id', 'stageId', 'taskId'), validateUpdateTask, updateTask);
router.patch('/:id/stages/:stageId/tasks/:taskId', validateParams('id', 'stageId', 'taskId'), validateUpdateTask, updateTask);
router.patch('/:id/stages/:stageId/tasks/:taskId/toggle', validateParams('id', 'stageId', 'taskId'), toggleTaskStatus);
router.delete('/:id/stages/:stageId/tasks/:taskId', validateParams('id', 'stageId', 'taskId'), deleteTask);

module.exports = router;
