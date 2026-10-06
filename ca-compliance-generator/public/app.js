/**
 * CA Compliance Task Generator - Frontend Logic
 */

let allWorkflows = [];
let lastRequestPayload = null;
let lastResponseData = null;
let currentTab = 'dashboard';
let currentViewMode = 'detailed';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadAnalytics();
  loadWorkflows();
  loadTemplates();
  initGeneratorDefault();
});

// Setup navigation between tabs
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  document.getElementById('btn-open-generator').addEventListener('click', () => {
    switchTab('generator');
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.classList.toggle('active', n.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach((p) => {
    p.classList.toggle('active', p.id === `tab-${tabId}`);
  });

  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  if (tabId === 'dashboard') {
    pageTitle.textContent = 'Compliance Workflows';
    pageSubtitle.textContent = 'Generate, manage, track stages and tasks for Chartered Accountant compliance';
    loadWorkflows();
    loadAnalytics();
  } else if (tabId === 'generator') {
    pageTitle.textContent = 'Workflow Generator';
    pageSubtitle.textContent = 'Specify compliance service type, purpose and priority to generate stage-wise checklist';
  } else if (tabId === 'templates') {
    pageTitle.textContent = 'Standard CA Templates';
    pageSubtitle.textContent = 'Standardized compliance templates built into the compliance engine';
    loadTemplates();
  } else if (tabId === 'api-docs') {
    pageTitle.textContent = 'API Documentation';
    pageSubtitle.textContent = 'REST endpoints for programmatic integration and automation';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById('btn-refresh').addEventListener('click', () => {
    loadWorkflows();
    loadAnalytics();
    showToast('Workflows refreshed', 'success');
  });

  // Filters
  document.getElementById('filter-search').addEventListener('input', filterAndRenderWorkflows);
  document.getElementById('filter-priority').addEventListener('change', filterAndRenderWorkflows);
  document.getElementById('filter-status').addEventListener('change', filterAndRenderWorkflows);
  document.getElementById('view-mode-toggle').addEventListener('change', (e) => {
    currentViewMode = e.target.value;
    filterAndRenderWorkflows();
  });

  // Generator Form Submission
  document.getElementById('workflow-generator-form').addEventListener('submit', handleGenerateSubmit);

  // Modals
  document.getElementById('form-add-stage').addEventListener('submit', handleAddStageSubmit);
  document.getElementById('form-add-task').addEventListener('submit', handleAddTaskSubmit);
}

// Quick fill generator presets
const PRESET_DATA = {
  gst: {
    serviceType: 'GST Filing',
    purpose: 'Monthly GST return filing',
    priority: 'high',
    clientName: 'Apex Enterprises Pvt Ltd',
    financialPeriod: 'September 2026'
  },
  itr: {
    serviceType: 'Income Tax Return',
    purpose: 'Filing ITR-3 for individual proprietor with business audit',
    priority: 'medium',
    clientName: 'Rajesh Sharma (HUF)',
    financialPeriod: 'AY 2026-27'
  },
  tds: {
    serviceType: 'TDS Return',
    purpose: 'Quarterly Form 26Q filing for Q2 payments',
    priority: 'high',
    clientName: 'Global Solutions Ltd',
    financialPeriod: 'Q2 (Jul - Sep 2026)'
  },
  audit: {
    serviceType: 'Statutory Audit',
    purpose: 'Statutory audit and CARO reporting under Companies Act 2013',
    priority: 'urgent',
    clientName: 'Vertex Pharma Technologies Ltd',
    financialPeriod: 'FY 2025-26'
  },
  custom: {
    serviceType: 'FEMA & RBI Compliance',
    purpose: 'Overseas Direct Investment (ODI) annual performance report filing',
    priority: 'medium',
    clientName: 'Innovatech Ventures LLP',
    financialPeriod: 'FY 2025-26'
  }
};

window.applyPreset = function (key) {
  const p = PRESET_DATA[key];
  if (!p) return;

  document.getElementById('input-serviceType').value = p.serviceType;
  document.getElementById('input-purpose').value = p.purpose;
  document.getElementById('input-priority').value = p.priority;
  document.getElementById('input-clientName').value = p.clientName;
  document.getElementById('input-period').value = p.financialPeriod;

  updateLiveRequestPreview();
  showToast(`Applied preset: ${p.serviceType}`, 'success');
};

function initGeneratorDefault() {
  applyPreset('gst');
}

function updateLiveRequestPreview() {
  const payload = {
    serviceType: document.getElementById('input-serviceType').value,
    purpose: document.getElementById('input-purpose').value,
    priority: document.getElementById('input-priority').value,
    clientName: document.getElementById('input-clientName').value,
    financialPeriod: document.getElementById('input-period').value
  };
  lastRequestPayload = payload;
  const previewEl = document.getElementById('preview-json');
  if (previewEl && (!lastResponseData || document.getElementById('pill-request').classList.contains('active'))) {
    previewEl.innerHTML = `<code class="json">${JSON.stringify(payload, null, 2)}</code>`;
  }
}

['input-serviceType', 'input-purpose', 'input-priority', 'input-clientName', 'input-period'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateLiveRequestPreview);
});

window.switchPreviewTab = function (tab) {
  document.getElementById('pill-request').classList.toggle('active', tab === 'request');
  document.getElementById('pill-response').classList.toggle('active', tab === 'response');

  const previewEl = document.getElementById('preview-json');
  if (tab === 'request') {
    previewEl.innerHTML = `<code class="json">${JSON.stringify(lastRequestPayload || {}, null, 2)}</code>`;
  } else {
    previewEl.innerHTML = `<code class="json">${JSON.stringify(lastResponseData || { message: 'Generate a workflow to see output' }, null, 2)}</code>`;
  }
};

window.resetGeneratorForm = function () {
  document.getElementById('workflow-generator-form').reset();
  applyPreset('gst');
};

// Handle Workflow Generation Submit
async function handleGenerateSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-generate-submit');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Generating...`;

  const payload = {
    serviceType: document.getElementById('input-serviceType').value.trim(),
    purpose: document.getElementById('input-purpose').value.trim(),
    priority: document.getElementById('input-priority').value,
    clientName: document.getElementById('input-clientName').value.trim(),
    financialPeriod: document.getElementById('input-period').value.trim()
  };

  lastRequestPayload = payload;

  try {
    const res = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ? data.error.message : 'Generation failed');
    }

    lastResponseData = data.simpleView;
    switchPreviewTab('response');
    showToast('Workflow generated & stored in MongoDB successfully!', 'success');

    // Reload workflows & analytics
    loadWorkflows();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Fetch Analytics & Stats
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics/summary');
    if (!res.ok) return;
    const json = await res.json();
    const data = json.data;

    document.getElementById('stat-total-workflows').textContent = data.totalWorkflows;
    document.getElementById('stat-total-tasks').textContent = data.totalTasks;
    document.getElementById('stat-completed-tasks').textContent = data.completedTasks;
    document.getElementById('stat-completion-rate').textContent = `${data.completionRateValue}%`;
    document.getElementById('stat-progress-bar').style.width = `${data.completionRateValue}%`;

    const highAndUrgent = (data.byPriority.high || 0) + (data.byPriority.urgent || 0);
    document.getElementById('stat-high-priority').textContent = highAndUrgent;
  } catch (e) {
    console.error('Error loading analytics:', e);
  }
}

// Fetch Workflows
async function loadWorkflows() {
  const container = document.getElementById('workflows-container');
  try {
    const res = await fetch('/api/workflows?limit=50');
    const json = await res.json();
    if (json.success) {
      allWorkflows = json.data;
      filterAndRenderWorkflows();
    }
  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <p style="color:var(--danger)">Failed to connect to MongoDB / API.</p>
        <button class="btn btn-secondary btn-sm" onclick="loadWorkflows()">Retry</button>
      </div>
    `;
  }
}

// Filter and Render
function filterAndRenderWorkflows() {
  const query = document.getElementById('filter-search').value.toLowerCase().trim();
  const priority = document.getElementById('filter-priority').value;
  const status = document.getElementById('filter-status').value;

  const filtered = allWorkflows.filter((wf) => {
    const matchQuery =
      !query ||
      wf.serviceType.toLowerCase().includes(query) ||
      wf.purpose.toLowerCase().includes(query) ||
      (wf.clientName && wf.clientName.toLowerCase().includes(query));

    const matchPriority = !priority || wf.priority.toLowerCase() === priority;
    const matchStatus = !status || wf.status.toLowerCase() === status;

    return matchQuery && matchPriority && matchStatus;
  });

  renderWorkflows(filtered);
}

// Render Workflows
function renderWorkflows(workflows) {
  const container = document.getElementById('workflows-container');

  if (!workflows || workflows.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-dim)">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <h4>No Workflows Found</h4>
        <p>No compliance workflows match your criteria or none have been generated yet.</p>
        <button class="btn btn-primary btn-sm" onclick="switchTab('generator')">Generate First Workflow</button>
      </div>
    `;
    return;
  }

  container.innerHTML = workflows
    .map((wf) => {
      if (currentViewMode === 'simple') {
        // Output format matching the prompt requirement
        const simpleJson = {
          serviceType: wf.serviceType,
          stages: (wf.stages || []).map((s) => ({
            name: s.name,
            tasks: (s.tasks || []).map((t) => (typeof t === 'string' ? t : t.title))
          }))
        };

        return `
          <div class="workflow-card">
            <div class="workflow-header">
              <div class="wf-title-block">
                <h3>${escapeHtml(wf.serviceType)}</h3>
                <p class="wf-purpose">${escapeHtml(wf.purpose)}</p>
              </div>
              <div class="wf-actions">
                <button class="btn btn-secondary btn-sm" onclick="copySimpleJSON('${wf._id}')">Copy JSON</button>
                <button class="btn btn-danger-outline btn-sm" onclick="deleteWorkflow('${wf._id}')">Delete</button>
              </div>
            </div>
            <div style="padding:20px;">
              <pre class="simple-view-box"><code>${JSON.stringify(simpleJson, null, 2)}</code></pre>
            </div>
          </div>
        `;
      }

      // Detailed View with interactive Kanban stages and task checklists
      const completedTasks = (wf.metadata && wf.metadata.completedTasks) || 0;
      const totalTasks = (wf.metadata && wf.metadata.totalTasks) || 0;
      const progressPercent = (wf.metadata && wf.metadata.progressPercentage) || 0;

      return `
        <div class="workflow-card" id="wf-${wf._id}">
          <div class="workflow-header">
            <div class="wf-title-block">
              <h3>
                ${escapeHtml(wf.serviceType)}
                <div class="wf-badges">
                  <span class="badge badge-priority-${wf.priority}">${wf.priority}</span>
                  <span class="badge badge-status-${wf.status}">${wf.status}</span>
                </div>
              </h3>
              <p class="wf-purpose">${escapeHtml(wf.purpose)}</p>
              <div class="wf-meta-tags">
                <span>🏢 Client: <strong>${escapeHtml(wf.clientName || 'General Client')}</strong></span>
                <span>📅 Period: <strong>${escapeHtml(wf.financialPeriod || 'FY 2025-26')}</strong></span>
                <span>📊 Tasks: <strong>${completedTasks}/${totalTasks} (${progressPercent}%)</strong></span>
              </div>
            </div>
            <div class="wf-actions">
              <button class="btn btn-outline btn-sm" onclick="openAddStageModal('${wf._id}')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Stage
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="deleteWorkflow('${wf._id}')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </div>

          <!-- Stages & Tasks Horizontal Track -->
          <div class="workflow-stages-wrap">
            <div class="stages-track">
              ${(wf.stages || [])
                .map(
                  (stage) => `
                <div class="stage-column" id="stage-${stage._id}">
                  <div class="stage-header">
                    <h4>
                      <span>${escapeHtml(stage.name)}</span>
                      <span class="stage-task-count">${(stage.tasks || []).length}</span>
                    </h4>
                    <div class="stage-actions">
                      <button class="btn-icon-tiny delete" title="Delete stage" onclick="deleteStage('${wf._id}', '${stage._id}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div class="tasks-list">
                    ${(stage.tasks || [])
                      .map((task) => {
                        const isDone = task.status === 'completed';
                        return `
                        <div class="task-item ${isDone ? 'completed' : ''}" id="task-${task._id}">
                          <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} onchange="toggleTask('${wf._id}', '${stage._id}', '${task._id}')" title="Toggle status">
                          <div class="task-body">
                            <div class="task-text">${escapeHtml(task.title)}</div>
                            ${task.assignedTo && task.assignedTo !== 'Unassigned' ? `<div class="task-meta">👤 ${escapeHtml(task.assignedTo)}</div>` : ''}
                          </div>
                          <button class="task-delete-btn" title="Delete task" onclick="deleteTask('${wf._id}', '${stage._id}', '${task._id}')">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                      `;
                      })
                      .join('')}
                  </div>

                  <button class="btn-add-task" onclick="openAddTaskModal('${wf._id}', '${stage._id}')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Task
                  </button>
                </div>
              `
                )
                .join('')}

              <button class="stage-add-column" onclick="openAddStageModal('${wf._id}')">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <span>+ Add New Stage</span>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Toggle Task Status
window.toggleTask = async function (workflowId, stageId, taskId) {
  try {
    const res = await fetch(`/api/workflows/${workflowId}/stages/${stageId}/tasks/${taskId}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (data.success) {
      // Update local workflow
      const wfIndex = allWorkflows.findIndex((w) => w._id === workflowId);
      if (wfIndex !== -1 && data.workflow) {
        allWorkflows[wfIndex] = data.workflow;
      }
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast(data.message, 'success');
    }
  } catch (e) {
    showToast('Failed to update task status', 'error');
  }
};

// Delete Task
window.deleteTask = async function (workflowId, stageId, taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    const res = await fetch(`/api/workflows/${workflowId}/stages/${stageId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      const wfIndex = allWorkflows.findIndex((w) => w._id === workflowId);
      if (wfIndex !== -1 && data.workflow) {
        allWorkflows[wfIndex] = data.workflow;
      }
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast('Task deleted', 'success');
    }
  } catch (e) {
    showToast('Failed to delete task', 'error');
  }
};

// Delete Stage
window.deleteStage = async function (workflowId, stageId) {
  if (!confirm('Are you sure you want to delete this stage and all its tasks?')) return;
  try {
    const res = await fetch(`/api/workflows/${workflowId}/stages/${stageId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      const wfIndex = allWorkflows.findIndex((w) => w._id === workflowId);
      if (wfIndex !== -1 && data.workflow) {
        allWorkflows[wfIndex] = data.workflow;
      }
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast('Stage deleted', 'success');
    }
  } catch (e) {
    showToast('Failed to delete stage', 'error');
  }
};

// Delete Workflow
window.deleteWorkflow = async function (workflowId) {
  if (!confirm('Are you sure you want to delete this entire compliance workflow?')) return;
  try {
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      allWorkflows = allWorkflows.filter((w) => w._id !== workflowId);
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast('Workflow deleted', 'success');
    }
  } catch (e) {
    showToast('Failed to delete workflow', 'error');
  }
};

// Copy Simple JSON
window.copySimpleJSON = function (workflowId) {
  const wf = allWorkflows.find((w) => w._id === workflowId);
  if (!wf) return;
  const simpleJson = {
    serviceType: wf.serviceType,
    stages: (wf.stages || []).map((s) => ({
      name: s.name,
      tasks: (s.tasks || []).map((t) => (typeof t === 'string' ? t : t.title))
    }))
  };
  navigator.clipboard.writeText(JSON.stringify(simpleJson, null, 2));
  showToast('Copied JSON to clipboard!', 'success');
};

// Stage Modal Handlers
window.openAddStageModal = function (workflowId) {
  document.getElementById('modal-workflow-id').value = workflowId;
  document.getElementById('stage-name-input').value = '';
  document.getElementById('modal-add-stage').classList.add('open');
};

async function handleAddStageSubmit(e) {
  e.preventDefault();
  const workflowId = document.getElementById('modal-workflow-id').value;
  const stageName = document.getElementById('stage-name-input').value.trim();

  try {
    const res = await fetch(`/api/workflows/${workflowId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: stageName })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-add-stage');
      const wfIndex = allWorkflows.findIndex((w) => w._id === workflowId);
      if (wfIndex !== -1 && data.workflow) {
        allWorkflows[wfIndex] = data.workflow;
      }
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast('Stage added successfully', 'success');
    }
  } catch (e) {
    showToast('Failed to add stage', 'error');
  }
}

// Task Modal Handlers
window.openAddTaskModal = function (workflowId, stageId) {
  document.getElementById('modal-task-wf-id').value = workflowId;
  document.getElementById('modal-task-stage-id').value = stageId;
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-assigned-input').value = 'Unassigned';
  document.getElementById('modal-add-task').classList.add('open');
};

async function handleAddTaskSubmit(e) {
  e.preventDefault();
  const workflowId = document.getElementById('modal-task-wf-id').value;
  const stageId = document.getElementById('modal-task-stage-id').value;
  const title = document.getElementById('task-title-input').value.trim();
  const assignedTo = document.getElementById('task-assigned-input').value.trim();

  try {
    const res = await fetch(`/api/workflows/${workflowId}/stages/${stageId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, assignedTo })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-add-task');
      const wfIndex = allWorkflows.findIndex((w) => w._id === workflowId);
      if (wfIndex !== -1 && data.workflow) {
        allWorkflows[wfIndex] = data.workflow;
      }
      loadAnalytics();
      filterAndRenderWorkflows();
      showToast('Task added successfully', 'success');
    }
  } catch (e) {
    showToast('Failed to add task', 'error');
  }
}

window.closeModal = function (id) {
  document.getElementById(id).classList.remove('open');
};

// Templates Fetch
async function loadTemplates() {
  const grid = document.getElementById('templates-grid');
  try {
    const res = await fetch('/api/templates');
    const json = await res.json();
    if (json.success) {
      grid.innerHTML = json.data
        .map(
          (t) => `
        <div class="template-card">
          <div class="template-card-header">
            <h4>${escapeHtml(t.serviceType)}</h4>
            <span class="badge badge-priority-medium">${t.totalStages} Stages</span>
          </div>
          <div class="template-stages-preview">
            ${t.stages
              .map(
                (s) => `
              <div class="tmpl-stage-item">
                <div class="tmpl-stage-name">${escapeHtml(s.name)} (${s.tasks.length} tasks)</div>
                ${s.tasks
                  .slice(0, 2)
                  .map((task) => `<div class="tmpl-task-bullet">${escapeHtml(task)}</div>`)
                  .join('')}
                ${s.tasks.length > 2 ? `<div class="tmpl-task-bullet" style="color:var(--text-dim)">+ ${s.tasks.length - 2} more tasks...</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
          <button class="btn btn-primary btn-sm" onclick="useTemplate('${escapeHtml(t.serviceType)}')">
            Generate Workflow with this Template
          </button>
        </div>
      `
        )
        .join('');
    }
  } catch (e) {
    grid.innerHTML = `<p style="color:var(--danger)">Failed to load templates</p>`;
  }
}

window.useTemplate = function (serviceType) {
  switchTab('generator');
  document.getElementById('input-serviceType').value = serviceType;
  document.getElementById('input-purpose').value = `Annual / Periodic compliance for ${serviceType}`;
  updateLiveRequestPreview();
  showToast(`Loaded ${serviceType} into Generator`, 'success');
};

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

// Security Helper
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
