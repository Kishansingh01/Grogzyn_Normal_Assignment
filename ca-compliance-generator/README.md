# CA Compliance Task Generator

> A production-grade **Chartered Accountant (CA) Compliance Task & Workflow Generator** built using **Node.js**, **Express**, and **MongoDB (Mongoose)**.

---

## 🌟 Key Features

- **Automated Workflow & Task Generation**:
  - Accepts compliance parameters: `serviceType`, `purpose`, and `priority`.
  - Automatically identifies domain patterns (e.g., GST Filing, Income Tax Return, TDS Return, Statutory Audit, Tax Audit Sec 44AB, ROC/MCA Compliance, Payroll/PF/ESI).
  - Generates organized sequential **stages** and granular statutory **compliance tasks**.
  - Includes a dynamic AI/rule generator for custom advisory services.
  - Supports custom user-defined stage overrides.
- **Full CRUD RESTful APIs**:
  - **Workflows**: Generate, create, view, filter, update, and delete compliance workflows.
  - **Stages**: Add stages, update stage names, delete stages.
  - **Tasks**: Add tasks to stages, update details, toggle pending/completed status, and delete tasks.
- **Dual Output Formats**:
  - **Prompt Simple Format**: Clean JSON format showing `serviceType` and `stages` with string tasks as requested in the specification.
  - **Enterprise Detailed Format**: Subdocument model with task IDs, completion status, due dates, assignee, and auto-computed progress percentages.
- **Robust Validation & Error Handling**:
  - Schema validation with **Joi** for required fields, string length, and enums.
  - MongoDB ObjectId parameter validator.
  - Standardized JSON error responses with detailed error codes.
- **Modern Interactive Dashboard & API Playground**:
  - Real-time interactive Kanban view with checkbox task toggling.
  - Live API Request & Response inspector.
  - Pre-configured 1-click test presets for GST, ITR, TDS, and Audit.
  - CA template browser and live summary metrics.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Web Framework**: Express.js (v5)
- **Database**: MongoDB via Mongoose (v9)
- **Validation**: Joi
- **Logging & Utilities**: Morgan, CORS, Dotenv
- **Testing**: Jest, Supertest
- **Frontend UI**: Vanilla JavaScript, CSS3 with Glassmorphism Design System, HTML5

---

## 📁 Project Structure

```text
ca-compliance-generator/
├── config/
│   └── db.js                 # MongoDB connection logic and lifecycle handlers
├── controllers/
│   ├── workflowController.js # Workflows CRUD handlers & generation
│   ├── stageController.js    # Stages CRUD handlers
│   ├── taskController.js     # Tasks CRUD handlers and status toggles
│   └── analyticsController.js# Overview metrics and template catalog
├── middlewares/
│   ├── validator.js          # Joi schemas and MongoDB ObjectId validation
│   └── errorHandler.js       # Centralized 404 and global error handlers
├── models/
│   └── Workflow.js           # Mongoose schemas for Workflow, Stage, and Task
├── routes/
│   ├── workflowRoutes.js     # API route definitions for workflows, stages & tasks
│   └── analyticsRoutes.js    # API route definitions for metrics & templates
├── services/
│   └── taskGenerator.js      # CA domain knowledge engine and dynamic generator
├── public/                   # Interactive Dashboard UI
│   ├── index.html            # Dashboard layout and modals
│   ├── style.css             # Glassmorphism aesthetic and responsive styles
│   └── app.js                # Frontend controllers and live API playground
├── tests/
│   └── workflow.test.js      # Jest + Supertest end-to-end test suite
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration
├── package.json              # NPM dependencies and scripts
├── server.js                 # HTTP server bootstrap and graceful shutdown
└── README.md                 # Complete documentation and API manual
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017` (or a remote MongoDB Atlas connection URI)

### 2. Install Dependencies
```bash
cd ca-compliance-generator
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root (or copy `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ca_compliance_db
NODE_ENV=development
```

### 4. Run the Server
```bash
# Start server in production mode
npm start

# Or start in development mode with auto-reload
npm run dev
```

The application will be live at:
- **Dashboard UI**: [http://localhost:5000](http://localhost:5000)
- **API Base URL**: `http://localhost:5000/api`
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 5. Run Automated Tests
```bash
npm test
```

---

## 📡 API Reference & Examples

### 1. Generate Compliance Workflow

Generates stages and tasks based on `serviceType`, `purpose`, and `priority`, then persists the workflow to MongoDB.

- **Endpoint**: `POST /api/workflows/generate`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "serviceType": "GST Filing",
  "purpose": "Monthly GST return filing",
  "priority": "high"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Compliance workflow generated and saved successfully",
  "simpleView": {
    "_id": "67531a89c9b4e10012345678",
    "serviceType": "GST Filing",
    "purpose": "Monthly GST return filing",
    "priority": "high",
    "status": "pending",
    "stages": [
      {
        "_id": "67531a89c9b4e10012345679",
        "name": "Document Collection",
        "tasks": [
          "Collect sales invoices",
          "Collect purchase invoices",
          "Collect bank statements",
          "Collect debit & credit notes"
        ]
      },
      {
        "_id": "67531a89c9b4e1001234567a",
        "name": "Verification",
        "tasks": [
          "Verify invoices",
          "Reconcile data",
          "Perform GSTR-2B vs Books reconciliation",
          "Check tax liability and eligible ITC calculation"
        ]
      },
      {
        "_id": "67531a89c9b4e1001234567b",
        "name": "Filing",
        "tasks": [
          "Prepare return",
          "Review return",
          "Submit return",
          "Generate challan and verify tax payment",
          "Download and archive acknowledgment receipt"
        ]
      }
    ]
  }
}
```

*Note: Pass `?format=simple` to get the clean output directly inside `data`.*

---

### 2. Workflows CRUD

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/workflows/generate` | Generate and store a compliance workflow |
| `POST` | `/api/workflows` | Create a workflow (alias with custom stages support) |
| `GET` | `/api/workflows` | List all workflows (supports filtering by `serviceType`, `status`, `priority`, `search`, pagination) |
| `GET` | `/api/workflows/:id` | Get workflow by ID (append `?format=simple` for prompt-style view) |
| `PUT` | `/api/workflows/:id` | Update workflow properties (`purpose`, `priority`, `status`, `clientName`) |
| `DELETE` | `/api/workflows/:id` | Delete workflow by ID |

#### Query Parameters for `GET /api/workflows`:
- `serviceType`: Filter by service name regex (e.g. `?serviceType=GST`)
- `priority`: Filter by priority (`low`, `medium`, `high`, `urgent`)
- `status`: Filter by status (`pending`, `in-progress`, `completed`)
- `search`: Search across serviceType, purpose, and clientName
- `format`: Set to `simple` for lightweight prompt format
- `page` & `limit`: Pagination controls (default: `page=1`, `limit=20`)

---

### 3. Stages & Tasks CRUD

#### Add a Stage to Workflow
- **Endpoint**: `POST /api/workflows/:id/stages`
```json
{
  "name": "Partner Audit Review",
  "tasks": ["Review CARO checklist", "Sign audit report with DSC"]
}
```

#### Update Stage
- **Endpoint**: `PUT /api/workflows/:id/stages/:stageId`
```json
{
  "name": "Final Verification & Partner Review"
}
```

#### Delete Stage
- **Endpoint**: `DELETE /api/workflows/:id/stages/:stageId`

#### Add a Task to Stage
- **Endpoint**: `POST /api/workflows/:id/stages/:stageId/tasks`
```json
{
  "title": "Verify e-way bills against sales invoices",
  "assignedTo": "Senior CA Article",
  "dueDate": "2026-10-20"
}
```

#### Update Task Details
- **Endpoint**: `PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId`
```json
{
  "title": "Reconcile GSTR-2B against books of accounts",
  "status": "in-progress",
  "assignedTo": "Kishan Singh"
}
```

#### Toggle Task Status
- **Endpoint**: `PATCH /api/workflows/:id/stages/:stageId/tasks/:taskId/toggle`
*Quickly switches between `pending` and `completed` and auto-recalculates workflow progress.*

#### Delete Task
- **Endpoint**: `DELETE /api/workflows/:id/stages/:stageId/tasks/:taskId`

---

### 4. CA Compliance Templates & Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/templates` | Retrieve pre-configured CA statutory compliance templates |
| `GET` | `/api/templates/:service` | Retrieve template details for a specific service (e.g. `gst`, `itr`, `tds`, `audit`) |
| `GET` | `/api/analytics/summary` | Get summary counts, completion rates, and priority breakdown |

---

## 💻 Sample cURL Commands

### 1. Generate GST Filing Workflow
```bash
curl -X POST http://localhost:5000/api/workflows/generate \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "GST Filing",
    "purpose": "Monthly GST return filing",
    "priority": "high"
  }'
```

### 2. List Workflows in Simple View
```bash
curl -X GET "http://localhost:5000/api/workflows?format=simple"
```

### 3. Toggle a Task Completion
```bash
curl -X PATCH "http://localhost:5000/api/workflows/<WORKFLOW_ID>/stages/<STAGE_ID>/tasks/<TASK_ID>/toggle"
```

---

## 🧪 Testing

The test suite validates compliance generation, edge cases, validation errors, and end-to-end CRUD:

```bash
npm test
```
