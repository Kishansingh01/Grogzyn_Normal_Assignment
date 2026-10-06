/**
 * CA Compliance Task Generator Service
 * Generates structured compliance workflow stages and tasks based on serviceType, purpose, and priority.
 */

const PRESET_TEMPLATES = {
  'gst filing': {
    serviceType: 'GST Filing',
    stages: [
      {
        name: 'Document Collection',
        tasks: [
          'Collect sales invoices',
          'Collect purchase invoices',
          'Collect bank statements',
          'Collect debit & credit notes'
        ]
      },
      {
        name: 'Verification',
        tasks: [
          'Verify invoices',
          'Reconcile data',
          'Perform GSTR-2B vs Books reconciliation',
          'Check tax liability and eligible ITC calculation'
        ]
      },
      {
        name: 'Filing',
        tasks: [
          'Prepare return',
          'Review return',
          'Submit return',
          'Generate challan and verify tax payment',
          'Download and archive acknowledgment receipt'
        ]
      }
    ]
  },
  'income tax return': {
    serviceType: 'Income Tax Return',
    stages: [
      {
        name: 'Document Collection',
        tasks: [
          'Collect Form 16 / 16A and salary certificates',
          'Download Annual Information Statement (AIS) & Form 26AS',
          'Collect capital gains & interest statements',
          'Gather Chapter VI-A deduction proofs (80C, 80D, 80G)'
        ]
      },
      {
        name: 'Computation & Reconciliation',
        tasks: [
          'Reconcile AIS/26AS with bank books',
          'Compute total income under all five heads',
          'Calculate tax liability, interest (234A/B/C), and rebate',
          'Prepare preliminary tax computation sheet'
        ]
      },
      {
        name: 'Review & Client Sign-off',
        tasks: [
          'Internal CA partner review',
          'Share draft computation with client for approval',
          'Verify self-assessment tax challan payment'
        ]
      },
      {
        name: 'Filing & E-Verification',
        tasks: [
          'Upload ITR JSON on Income Tax e-filing portal',
          'Complete e-verification via Aadhaar OTP / EVC',
          'Download ITR-V acknowledgment and store in client dossier'
        ]
      }
    ]
  },
  'itr filing': {
    alias: 'income tax return'
  },
  'tds return': {
    serviceType: 'TDS Return',
    stages: [
      {
        name: 'Data Collection & Verification',
        tasks: [
          'Collect monthly TDS deduction sheet and vendor details',
          'Gather challan receipts (BSR code, date, challan serial no.)',
          'Validate vendor PANs using Income Tax bulk utility'
        ]
      },
      {
        name: 'RPU & FVU Processing',
        tasks: [
          'Prepare return file in NSDL e-TDS Return Preparation Utility (RPU)',
          'Run File Validation Utility (FVU) to verify correctness',
          'Correct syntax or PAN errors if reported by FVU'
        ]
      },
      {
        name: 'Filing & Certificate Generation',
        tasks: [
          'Upload FVU file to TRACES / Income Tax portal',
          'Obtain provisional receipt / token number',
          'Download Form 16 / 16A from TRACES and dispatch to deductees'
        ]
      }
    ]
  },
  'statutory audit': {
    serviceType: 'Statutory Audit',
    stages: [
      {
        name: 'Audit Planning & Risk Assessment',
        tasks: [
          'Obtain signed engagement letter and NOC from previous auditor',
          'Assess internal financial controls (IFC) and identify risk areas',
          'Determine materiality thresholds and sample sizes'
        ]
      },
      {
        name: 'Substantive Testing & Fieldwork',
        tasks: [
          'Vouch sales, purchases, and major operational expenses',
          'Verify physical asset verification records and depreciation schedules',
          'Obtain external bank, debtor, and creditor balance confirmations',
          'Verify statutory register and compliance filings'
        ]
      },
      {
        name: 'CARO & Reporting',
        tasks: [
          'Prepare CARO 2020 checklist and draft notes to accounts',
          'Draft Independent Auditor’s Report with key audit matters',
          'Discuss audit observations with Audit Committee & Board of Directors',
          'Issue final signed audit report and generate UDIN on ICAI portal'
        ]
      }
    ]
  },
  'tax audit': {
    serviceType: 'Tax Audit (Section 44AB)',
    stages: [
      {
        name: 'Document Gathering',
        tasks: [
          'Collect audited financial statements and trial balance',
          'Gather previous year tax audit report (Form 3CD)',
          'Collect quantitative stock registers and method of valuation details'
        ]
      },
      {
        name: 'Clause-by-Clause Verification',
        tasks: [
          'Verify turnover computation and applicability under Sec 44AB',
          'Examine Section 40(a)(ia) disallowances and TDS compliance',
          'Verify Section 43B payments made before ITR due date',
          'Reconcile turnover and taxes with GST annual return'
        ]
      },
      {
        name: 'Form 3CA/3CB-3CD Filing',
        tasks: [
          'Fill online Form 3CA/3CB and Form 3CD on e-filing portal',
          'Partner review, digital signature, and UDIN generation',
          'Client approval of uploaded audit report on portal'
        ]
      }
    ]
  },
  'roc filing': {
    serviceType: 'ROC Compliance & MCA Filing',
    stages: [
      {
        name: 'Secretarial & Board Documentation',
        tasks: [
          'Draft notices, resolutions, and minutes for Board & AGM meetings',
          'Prepare Directors’ Report with required statutory disclosures',
          'Complete annual DIR-3 KYC verification for all directors'
        ]
      },
      {
        name: 'Annual Accounts Finalization',
        tasks: [
          'Obtain audited balance sheet, P&L, and schedules',
          'Prepare XBRL / PDF financial statements for filing',
          'Obtain director digital signatures (DSC) on forms'
        ]
      },
      {
        name: 'MCA Portal Submission',
        tasks: [
          'File Form AOC-4 (Financial Statements)',
          'File Form MGT-7 / MGT-7A (Annual Return)',
          'Verify payment challan and download SRN approval status'
        ]
      }
    ]
  },
  'payroll compliance': {
    serviceType: 'Payroll & PF/ESI Compliance',
    stages: [
      {
        name: 'Attendance & Wage Processing',
        tasks: [
          'Collect monthly attendance and leaves records',
          'Compute wage register, deductions, and gross pay',
          'Reconcile new joiners and exit employee details'
        ]
      },
      {
        name: 'Statutory Calculations',
        tasks: [
          'Calculate EPF employer and employee contributions',
          'Calculate ESIC and Professional Tax contributions',
          'Generate ECR text file from payroll software'
        ]
      },
      {
        name: 'Portal Filing & Payment',
        tasks: [
          'Upload ECR file to EPFO unified portal and verify TRRN',
          'Submit monthly contribution on ESIC portal',
          'Make online challan payment and distribute wage slips'
        ]
      }
    ]
  }
};

/**
 * Dynamically builds smart workflow stages for custom services
 */
function generateDynamicWorkflow(serviceType, purpose, priority) {
  const cleanType = (serviceType || 'Compliance').trim();
  const cleanPurpose = (purpose || 'Process compliance requirements').trim();

  return [
    {
      name: 'Document Collection & Requirement Gathering',
      tasks: [
        `Collect prerequisite records and credentials for ${cleanType}`,
        `Obtain client source documents related to: ${cleanPurpose}`,
        'Verify completeness of submitted vouchers and statements'
      ]
    },
    {
      name: 'Verification & Reconciliation',
      tasks: [
        `Cross-verify client financial records against statutory guidelines`,
        `Reconcile ledgers and transaction logs for ${cleanType}`,
        'Identify discrepancies and request clarifications from client'
      ]
    },
    {
      name: 'Computation & Preparation',
      tasks: [
        `Draft computation sheets and statutory schedules for ${cleanType}`,
        `Apply compliance rules and prepare final draft regarding: ${cleanPurpose}`,
        'Conduct internal quality control review'
      ]
    },
    {
      name: 'Client Review & Approval',
      tasks: [
        'Share draft computation and liability summary with client',
        'Obtain written client sign-off and approval',
        'Ensure requisite challan/tax payment if applicable'
      ]
    },
    {
      name: 'Submission & Archival',
      tasks: [
        `Submit final filings / deliverables for ${cleanType}`,
        'Download submission receipt and official acknowledgment',
        'Archive complete audit trail and working papers in client dossier'
      ]
    }
  ];
}

/**
 * Main generator function
 * @param {Object} input - { serviceType, purpose, priority, stages }
 * @returns {Array} stages with structured tasks
 */
function generateWorkflowStages(input) {
  const { serviceType = '', purpose = '', priority = 'medium', stages: customStages } = input;

  // 1. If explicit stages were passed in the payload, format and use them
  if (Array.isArray(customStages) && customStages.length > 0) {
    return customStages.map((stage) => ({
      name: stage.name || 'Stage',
      tasks: (stage.tasks || []).map((t) => {
        if (typeof t === 'string') {
          return { title: t, status: 'pending' };
        }
        return {
          title: t.title || 'Task',
          status: t.status || 'pending',
          assignedTo: t.assignedTo || 'Unassigned',
          dueDate: t.dueDate || null
        };
      })
    }));
  }

  // 2. Look for matching preset templates
  const normalizedType = serviceType.toLowerCase().trim();
  let matchedTemplate = PRESET_TEMPLATES[normalizedType];

  if (!matchedTemplate) {
    // Check partial key matches
    for (const key of Object.keys(PRESET_TEMPLATES)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        matchedTemplate = PRESET_TEMPLATES[key];
        break;
      }
    }
  }

  if (matchedTemplate && matchedTemplate.alias) {
    matchedTemplate = PRESET_TEMPLATES[matchedTemplate.alias];
  }

  let selectedStages;
  if (matchedTemplate && matchedTemplate.stages) {
    selectedStages = matchedTemplate.stages;
  } else {
    selectedStages = generateDynamicWorkflow(serviceType, purpose, priority);
  }

  // Convert task strings to structured task objects for Mongoose model
  return selectedStages.map((stage) => ({
    name: stage.name,
    tasks: stage.tasks.map((taskTitle) => ({
      title: typeof taskTitle === 'string' ? taskTitle : taskTitle.title,
      status: typeof taskTitle === 'object' && taskTitle.status ? taskTitle.status : 'pending',
      assignedTo: typeof taskTitle === 'object' && taskTitle.assignedTo ? taskTitle.assignedTo : 'Unassigned',
      dueDate: typeof taskTitle === 'object' && taskTitle.dueDate ? taskTitle.dueDate : null
    }))
  }));
}

/**
 * Returns all available CA compliance preset templates
 */
function getAllTemplates() {
  const result = [];
  for (const [key, val] of Object.entries(PRESET_TEMPLATES)) {
    if (!val.alias) {
      result.push({
        id: key,
        serviceType: val.serviceType,
        totalStages: val.stages.length,
        stages: val.stages
      });
    }
  }
  return result;
}

module.exports = {
  generateWorkflowStages,
  getAllTemplates,
  PRESET_TEMPLATES
};
