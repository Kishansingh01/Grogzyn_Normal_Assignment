const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    assignedTo: {
      type: String,
      default: 'Unassigned',
      trim: true
    },
    dueDate: {
      type: Date,
      default: null
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true
    },
    tasks: [taskSchema]
  },
  {
    _id: true,
    timestamps: true
  }
);

const workflowSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      lowercase: true
    },
    clientName: {
      type: String,
      default: 'General Client',
      trim: true
    },
    financialPeriod: {
      type: String,
      default: 'FY 2025-26',
      trim: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    stages: [stageSchema],
    metadata: {
      totalStages: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      progressPercentage: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate progress and totals
workflowSchema.pre('save', function () {
  if (this.stages) {
    let totalTasksCount = 0;
    let completedTasksCount = 0;

    this.stages.forEach((stage) => {
      if (Array.isArray(stage.tasks)) {
        totalTasksCount += stage.tasks.length;
        stage.tasks.forEach((task) => {
          if (task.status === 'completed') {
            completedTasksCount++;
          }
        });
      }
    });

    this.metadata = {
      totalStages: this.stages.length,
      totalTasks: totalTasksCount,
      completedTasks: completedTasksCount,
      progressPercentage:
        totalTasksCount > 0
          ? Math.round((completedTasksCount / totalTasksCount) * 100)
          : 0
    };

    // Auto-update overall workflow status based on tasks progress
    if (this.status !== 'cancelled' && this.status !== 'draft') {
      if (totalTasksCount > 0 && completedTasksCount === totalTasksCount) {
        this.status = 'completed';
      } else if (completedTasksCount > 0) {
        this.status = 'in-progress';
      }
    }
  }
});

// Helper method to format response in simple format matching the prompt requirement
workflowSchema.methods.toSimpleFormat = function () {
  return {
    _id: this._id,
    serviceType: this.serviceType,
    purpose: this.purpose,
    priority: this.priority,
    status: this.status,
    stages: this.stages.map((stage) => ({
      _id: stage._id,
      name: stage.name,
      tasks: stage.tasks.map((task) => (typeof task === 'string' ? task : task.title))
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Workflow', workflowSchema);
