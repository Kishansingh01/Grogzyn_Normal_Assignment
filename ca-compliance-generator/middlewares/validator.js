const Joi = require('joi');
const mongoose = require('mongoose');

// Helper to validate MongoDB ObjectID
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Middleware to validate route parameters containing MongoDB IDs
const validateParams = (...paramNames) => {
  return (req, res, next) => {
    for (const param of paramNames) {
      const id = req.params[param];
      if (id && !isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: `Invalid identifier format: ${param} '${id}' is not a valid MongoDB ObjectId`
          }
        });
      }
    }
    next();
  };
};

// Generic validation helper
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload validation failed',
          details
        }
      });
    }

    req.validatedBody = value;
    next();
  };
};

// Joi Schemas
const generateWorkflowSchema = Joi.object({
  serviceType: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'serviceType is required (e.g. "GST Filing", "ITR Filing")',
    'string.empty': 'serviceType cannot be empty'
  }),
  purpose: Joi.string().trim().min(3).max(300).required().messages({
    'any.required': 'purpose is required (e.g. "Monthly GST return filing")',
    'string.empty': 'purpose cannot be empty'
  }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .insensitive(),
  clientName: Joi.string().trim().max(100).default('General Client'),
  financialPeriod: Joi.string().trim().max(50).default('FY 2025-26'),
  dueDate: Joi.date().iso().allow(null).optional(),
  stages: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        tasks: Joi.array()
          .items(
            Joi.alternatives().try(
              Joi.string().trim(),
              Joi.object({
                title: Joi.string().trim().required(),
                status: Joi.string().valid('pending', 'in-progress', 'completed'),
                assignedTo: Joi.string().trim(),
                dueDate: Joi.date().allow(null)
              })
            )
          )
          .default([])
      })
    )
    .optional()
});

const updateWorkflowSchema = Joi.object({
  serviceType: Joi.string().trim().min(2).max(100),
  purpose: Joi.string().trim().min(3).max(300),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').insensitive(),
  status: Joi.string().valid('draft', 'pending', 'in-progress', 'completed', 'cancelled'),
  clientName: Joi.string().trim().max(100),
  financialPeriod: Joi.string().trim().max(50),
  dueDate: Joi.date().iso().allow(null)
}).min(1);

const stageSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Stage name is required'
  }),
  tasks: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().trim(),
        Joi.object({
          title: Joi.string().trim().required(),
          status: Joi.string().valid('pending', 'in-progress', 'completed'),
          assignedTo: Joi.string().trim(),
          dueDate: Joi.date().allow(null)
        })
      )
    )
    .default([])
});

const taskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Task title is required'
  }),
  status: Joi.string()
    .valid('pending', 'in-progress', 'completed')
    .default('pending'),
  assignedTo: Joi.string().trim().max(100).default('Unassigned'),
  dueDate: Joi.date().iso().allow(null).optional()
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  status: Joi.string().valid('pending', 'in-progress', 'completed'),
  assignedTo: Joi.string().trim().max(100),
  dueDate: Joi.date().iso().allow(null)
}).min(1);

module.exports = {
  validateParams,
  validateGenerateWorkflow: validateBody(generateWorkflowSchema),
  validateUpdateWorkflow: validateBody(updateWorkflowSchema),
  validateStage: validateBody(stageSchema),
  validateTask: validateBody(taskSchema),
  validateUpdateTask: validateBody(updateTaskSchema)
};
