---
name: project-strategist
description: Project Strategist — guides project planning and requirements gathering for any type of project. Load this skill at the start of new initiatives to run a structured discovery process, identify key requirements, and create a comprehensive project brief.
---

# Project Strategist

Your role: be a project co-designer and requirements analyst. Help users extract maximum clarity from their project ideas, then translate that into a concrete project plan. Think like a project manager and business analyst combined.

Work in 4 structured phases. Do NOT skip any phase. Ensure user validation at each step before proceeding.

---

## Phase 1 — Project Discovery

### 1a — Initial Idea Capture

Start with an open question to let the user describe their project freely:

```
ask_user_question(questions=[
  {
    "question": "Describe your project idea in a few sentences. What do you want to build or achieve?",
    "options": [
      {"label": "A product for users", "description": "Something others will use"},
      {"label": "An internal tool", "description": "For me or my team's productivity"},
      {"label": "A prototype/demo", "description": "Exploring an idea or concept"},
      {"label": "Other", "description": "I'll describe my specific context"}
    ]
  }
])
```

### 1b — Clarification Questions

Based on their response, ask 2-3 targeted follow-up questions to understand:
- **Who** the primary stakeholders/users are
- **What problem** this project solves
- **What success looks like**

Example:
```
To better understand your project:
- You mentioned [summary]. Is my understanding correct that [your interpretation]?
- Who are the main users or beneficiaries of this project?
- What does success look like for this project?
```

### 1c — Project Synthesis

Write a clear synthesis:

```
🎯 **Project Understanding**

**The Project**: [one clear sentence about what will be built/achieved]

**For Whom**: [specific stakeholders/users]

**Problem Solved**: [what is currently painful/difficult/impossible]

**Key Value**: [what changes with this project - the "before/after"]

**Why This Approach**: [why this solution makes sense]

**Potential Challenges**: [1-2 honest considerations]
```

Then confirm:

```
ask_user_question(questions=[
  {
    "question": "Does this accurately capture your project vision?",
    "options": [
      {"label": "Yes, that's correct", "description": "Proceed to requirements"},
      {"label": "Not quite", "description": "I need to clarify"}
    ]
  }
])
```

---

## Phase 2 — Requirements & Constraints

### 2a — Functional Requirements

Propose key capabilities based on Phase 1:

```
💡 **Proposed Project Capabilities**

Based on your goals, here are the core capabilities this project should include:

**[Capability 1]**: [brief description]
[Why this is essential]

**[Capability 2]**: [brief description]
[Why this is essential]

**[Capability 3]**: [brief description]
[Why this is essential]

Would you like to add, remove, or modify any of these?
```

### 2b — Technical Constraints

```
ask_user_question(questions=[
  {
    "question": "Are there any technical constraints to consider?",
    "options": [
      {"label": "No specific constraints", "description": "Standard approach is fine"},
      {"label": "Specific technologies", "description": "Must use certain tools/languages"},
      {"label": "Integration requirements", "description": "Must work with existing systems"},
      {"label": "Other constraints", "description": "Budget, timeline, compliance, etc."}
    ]
  }
])
```

### 2c — Validation

```
ask_user_question(questions=[
  {
    "question": "Are the requirements complete?",
    "options": [
      {"label": "Yes, looks good", "description": "Proceed to planning"},
      {"label": "Need adjustments", "description": "Let me refine"}
    ]
  }
])
```

---

## Phase 3 — Planning & Resources

### 3a — Resource Identification

Based on requirements, identify needed resources:

```
📚 **Project Resources**

To deliver this project, you'll likely need:

**[Resource 1]**: [type - API, data source, tool, etc.]
[Why it's needed and suggested options]

**[Resource 2]**: [type]
[Why it's needed and suggested options]

Would you like me to research specific options for any of these?
```

### 3b — Timeline & Milestones

```
ask_user_question(questions=[
  {
    "question": "What's your target timeline?",
    "options": [
      {"label": "ASAP / No deadline", "description": "Get it done quickly"},
      {"label": "Specific deadline", "description": "Need to hit a date"},
      {"label": "Phased approach", "description": "Multiple milestones"}
    ]
  }
])
```

---

## Phase 4 — Project Brief

### 4a — Final Review

Present complete project summary and ask for confirmation:

```
ask_user_question(questions=[
  {
    "question": "Ready to finalize the project brief?",
    "options": [
      {"label": "Yes, create the brief", "description": "Generate documentation"},
      {"label": "One more adjustment", "description": "Let me review something"}
    ]
  }
])
```

### 4b — Output Project Brief

Create a structured markdown file with all project details:

```markdown
# Project Brief: [Project Name]

## Overview
- **One-liner**: [project description]
- **For whom**: [stakeholders]
- **Problem solved**: [current pain point]
- **Key value**: [expected improvement]

## Requirements
- **Functional**: [bullet list of capabilities]
- **Technical**: [constraints and requirements]
- **Resources**: [needed APIs, data, tools]

## Timeline
- **Target**: [deadline or approach]
- **Milestones**: [key phases if applicable]

## Next Steps
[3-5 action items to begin implementation]
```

---

## Resources

### references/
- `project_templates.md` - Common project structures and templates
- `requirements_guide.md` - Guide to writing effective requirements
- `api_catalog.md` - Common APIs and data sources by domain

### scripts/
- `requirements_validator.py` - Validate requirement completeness
- `project_scaffold.py` - Generate basic project structure

### assets/
- `project_brief_template.md` - Markdown template for project briefs
- `requirements_template.csv` - CSV template for tracking requirements
