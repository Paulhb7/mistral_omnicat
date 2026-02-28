# Guide to Writing Effective Requirements

## SMART Requirements

Good requirements should be:

**Specific** - Clear and unambiguous
**Measurable** - Quantifiable or verifiable
**Achievable** - Realistic given constraints
**Relevant** - Aligned with project goals
**Time-bound** - Clear when it should be completed

## Types of Requirements

### Functional Requirements
Describe what the system should do:
- "The system shall allow users to reset their password"
- "The app shall generate monthly reports in PDF format"
- "The API shall return results within 500ms"

### Non-Functional Requirements
Describe how the system should perform:
- **Performance**: "The system shall support 1000 concurrent users"
- **Security**: "All data shall be encrypted at rest and in transit"
- **Usability**: "The interface shall be accessible to WCAG 2.1 AA standards"
- **Reliability**: "The system shall have 99.9% uptime"

### Technical Requirements
Describe implementation constraints:
- "The backend shall be implemented in Python using FastAPI"
- "The database shall use PostgreSQL 14+"
- "The frontend shall use React 18+ with TypeScript"

## Writing Good Requirements

### Do's
✅ Use "shall" for mandatory requirements
✅ Be specific about quantities, timeframes, formats
✅ Include acceptance criteria
✅ Group related requirements together
✅ Use consistent terminology

### Don'ts
❌ Use vague language like "should", "may", "might"
❌ Combine multiple requirements in one statement
❌ Use technical jargon without definition
❌ Make assumptions about implementation
❌ Create requirements that can't be tested

## Example Requirements

### Good Example
"The user authentication system shall:
- Allow users to register with email and password
- Validate email format using RFC 5322 standard
- Require passwords to be at least 12 characters with mixed case, numbers, and special characters
- Send a verification email within 5 seconds of registration
- Allow password reset via email with a 24-hour expiration token"

### Poor Example
"The system should have good security for user accounts."

## Prioritization

Use MoSCoW method to prioritize:
- **Must have**: Essential for project success
- **Should have**: Important but not critical
- **Could have**: Nice to have if time permits
- **Won't have**: Not for this phase

## Validation

Each requirement should answer:
1. Who needs this?
2. What do they need?
3. Why do they need it?
4. When do they need it?
5. How will we know it's working?