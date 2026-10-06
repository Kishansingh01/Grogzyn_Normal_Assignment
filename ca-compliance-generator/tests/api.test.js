process.env.NODE_ENV = 'test';
const { test, describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const Workflow = require('../models/Workflow');

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ca_compliance_test_db';

describe('CA Compliance Task Generator Test Suite', { concurrency: false }, () => {
  let createdWorkflowId;
  let stageId;
  let taskId;
  let newStageId;
  let newTaskId;

  before(async () => {
    await connectDB(TEST_DB_URI);
    await Workflow.deleteMany({});
  });

  after(async () => {
    await Workflow.deleteMany({});
    await disconnectDB();
  });

  // 1. Health Check
  it('1. GET /api/health should return 200 OK', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'CA Compliance Task Generator API');
  });

  // 2. Generate Workflow matching prompt example
  it('2. POST /api/workflows/generate with prompt sample payload should generate stages and tasks', async () => {
    const payload = {
      serviceType: 'GST Filing',
      purpose: 'Monthly GST return filing',
      priority: 'high'
    };

    const res = await request(app)
      .post('/api/workflows/generate')
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.serviceType, 'GST Filing');
    assert.equal(res.body.data.purpose, 'Monthly GST return filing');
    assert.equal(res.body.data.priority, 'high');

    // Check stages
    const stages = res.body.data.stages;
    assert.ok(Array.isArray(stages));
    assert.ok(stages.length >= 3);

    const stageNames = stages.map((s) => s.name);
    assert.ok(stageNames.includes('Document Collection'));
    assert.ok(stageNames.includes('Verification'));
    assert.ok(stageNames.includes('Filing'));

    // Check tasks inside stages
    const docStage = stages.find((s) => s.name === 'Document Collection');
    const docTasks = docStage.tasks.map((t) => t.title);
    assert.ok(docTasks.includes('Collect sales invoices'));
    assert.ok(docTasks.includes('Collect purchase invoices'));

    // Check prompt simpleView format
    const simple = res.body.simpleView;
    assert.ok(simple);
    assert.equal(simple.serviceType, 'GST Filing');
    assert.ok(Array.isArray(simple.stages));
    assert.equal(typeof simple.stages[0].tasks[0], 'string');

    createdWorkflowId = res.body.data._id;
    stageId = res.body.data.stages[0]._id;
    taskId = res.body.data.stages[0].tasks[0]._id;
  });

  // 3. Dynamic Workflow for custom service
  it('3. POST /api/workflows/generate should dynamically build stages for custom compliance', async () => {
    const payload = {
      serviceType: 'Transfer Pricing Advisory',
      purpose: 'Drafting Form 3CEB and international transaction benchmarking',
      priority: 'medium'
    };

    const res = await request(app)
      .post('/api/workflows/generate')
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.serviceType, 'Transfer Pricing Advisory');
    assert.equal(res.body.data.stages.length, 5);
  });

  // 4. Validation error tests
  it('4. POST /api/workflows/generate should reject missing serviceType with 400', async () => {
    const res = await request(app)
      .post('/api/workflows/generate')
      .send({ purpose: 'Test filing' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('5. POST /api/workflows/generate should reject missing purpose with 400', async () => {
    const res = await request(app)
      .post('/api/workflows/generate')
      .send({ serviceType: 'GST Filing' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('6. POST /api/workflows/generate should reject invalid priority with 400', async () => {
    const res = await request(app)
      .post('/api/workflows/generate')
      .send({
        serviceType: 'GST Filing',
        purpose: 'Monthly return',
        priority: 'critical-emergency'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // 7. GET /api/workflows
  it('7. GET /api/workflows should list all workflows with pagination', async () => {
    const res = await request(app).get('/api/workflows');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.total >= 2);
  });

  it('8. GET /api/workflows with ?priority=high filter', async () => {
    const res = await request(app).get('/api/workflows?priority=high');
    assert.equal(res.status, 200);
    res.body.data.forEach((w) => {
      assert.equal(w.priority, 'high');
    });
  });

  it('9. GET /api/workflows with ?format=simple', async () => {
    const res = await request(app).get('/api/workflows?format=simple');
    assert.equal(res.status, 200);
    const item = res.body.data[0];
    assert.ok(item.serviceType);
    assert.ok(Array.isArray(item.stages));
    assert.equal(typeof item.stages[0].tasks[0], 'string');
  });

  // 10. GET /api/workflows/:id
  it('10. GET /api/workflows/:id should retrieve the created workflow', async () => {
    const res = await request(app).get(`/api/workflows/${createdWorkflowId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data._id, createdWorkflowId);
    assert.equal(res.body.data.serviceType, 'GST Filing');
  });

  it('11. GET /api/workflows/:id with invalid ID should return 400', async () => {
    const res = await request(app).get('/api/workflows/not-a-valid-id');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_ID');
  });

  it('12. GET /api/workflows/:id with non-existent ID should return 404', async () => {
    const nonId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/workflows/${nonId}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'WORKFLOW_NOT_FOUND');
  });

  // 13. PUT /api/workflows/:id
  it('13. PUT /api/workflows/:id should update workflow fields', async () => {
    const res = await request(app)
      .put(`/api/workflows/${createdWorkflowId}`)
      .send({
        purpose: 'Updated monthly GST return filing for client Q3',
        priority: 'urgent'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.purpose, 'Updated monthly GST return filing for client Q3');
    assert.equal(res.body.data.priority, 'urgent');
  });

  // 14. Stages CRUD
  it('14. POST /api/workflows/:id/stages should append a new stage', async () => {
    const res = await request(app)
      .post(`/api/workflows/${createdWorkflowId}/stages`)
      .send({
        name: 'Partner Sign-off & Audit',
        tasks: ['Review final figures', 'Affix DSC token']
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Partner Sign-off & Audit');
    assert.equal(res.body.data.tasks.length, 2);
    newStageId = res.body.data._id;
  });

  it('15. PUT /api/workflows/:id/stages/:stageId should update stage name', async () => {
    const res = await request(app)
      .put(`/api/workflows/${createdWorkflowId}/stages/${newStageId}`)
      .send({
        name: 'Partner Review & Digital Signature'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Partner Review & Digital Signature');
  });

  // 16. Tasks CRUD
  it('16. POST /api/workflows/:id/stages/:stageId/tasks should add a task', async () => {
    const res = await request(app)
      .post(`/api/workflows/${createdWorkflowId}/stages/${stageId}/tasks`)
      .send({
        title: 'Reconcile e-way bills with tax invoice register',
        assignedTo: 'Kishan Singh'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Reconcile e-way bills with tax invoice register');
    assert.equal(res.body.data.assignedTo, 'Kishan Singh');
    newTaskId = res.body.data._id;
  });

  it('17. PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId should update task details', async () => {
    const res = await request(app)
      .patch(`/api/workflows/${createdWorkflowId}/stages/${stageId}/tasks/${newTaskId}`)
      .send({
        status: 'in-progress'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in-progress');
  });

  it('18. PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId/toggle should toggle task status', async () => {
    const res = await request(app)
      .patch(`/api/workflows/${createdWorkflowId}/stages/${stageId}/tasks/${newTaskId}/toggle`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'completed');
    assert.ok(res.body.workflow.metadata.completedTasks >= 1);
  });

  it('19. DELETE /api/workflows/:id/stages/:stageId/tasks/:taskId should delete task', async () => {
    const res = await request(app)
      .delete(`/api/workflows/${createdWorkflowId}/stages/${stageId}/tasks/${newTaskId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.deletedTaskId, newTaskId);
  });

  it('20. DELETE /api/workflows/:id/stages/:stageId should delete stage', async () => {
    const res = await request(app)
      .delete(`/api/workflows/${createdWorkflowId}/stages/${newStageId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.deletedStageId, newStageId);
  });

  // 21. Templates & Analytics
  it('21. GET /api/templates should return standard CA templates', async () => {
    const res = await request(app).get('/api/templates');
    assert.equal(res.status, 200);
    assert.ok(res.body.count >= 5);
  });

  it('22. GET /api/templates/:service should return specific template', async () => {
    const res = await request(app).get('/api/templates/gst filing');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.serviceType, 'GST Filing');
  });

  it('23. GET /api/analytics/summary should return aggregated stats', async () => {
    const res = await request(app).get('/api/analytics/summary');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalWorkflows >= 1);
    assert.ok(res.body.data.totalTasks >= 1);
    assert.ok(res.body.data.byStatus);
    assert.ok(res.body.data.byPriority);
  });

  // 24. Delete workflow
  it('24. DELETE /api/workflows/:id should delete the workflow', async () => {
    const res = await request(app).delete(`/api/workflows/${createdWorkflowId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.deletedId, createdWorkflowId);

    // Verify it is gone
    const checkRes = await request(app).get(`/api/workflows/${createdWorkflowId}`);
    assert.equal(checkRes.status, 404);
  });
});
