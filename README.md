# Competition Judging System - Project Context

You are working on a web-based competition registration and judging system.

The system manages participant registrations, payment verification, project submissions, judge assignments, judging, scoring, and administrative management.

## Core Concept

Participants **do not create user accounts and do not log in with passwords**.

Participants are external applicants who submit a registration form.

Only internal users such as administrators, secretaries, and judges have authenticated accounts.

This distinction is important:

* A **participant** is registration data submitted to a competition.
* An **internal user** is an authenticated person who can access the system.

Do not create participant authentication unless explicitly requested.

---

## User Roles

There are four authenticated system roles:

### 1. ADMIN

Administrators have broad access to the system.

Responsibilities include:

* Manage competitions
* Manage competition categories
* Manage users
* Create/manage judges
* Assign judges to registrations
* View registrations
* View payment status
* View judging results
* Manage judging criteria
* View/export reports
* Manage system configuration

### 2. SECRETARY

The secretary primarily handles participant registration and payment verification.

Responsibilities:

* View registrations
* View participant information
* View project information
* View uploaded documents
* View payment submissions
* Verify payments
* Reject payments when necessary
* Update payment verification status

The secretary should not automatically have access to judging functionality.

### 3. THESIS_JUDGE

Thesis judges evaluate thesis/project submissions assigned to them.

Responsibilities:

* View assigned thesis registrations
* View relevant participant information
* View project details
* View project documents
* Score judging criteria
* Add comments/feedback
* Submit their evaluation

A thesis judge should only be able to judge registrations assigned to them.

### 4. EBOOK_JUDGE

E-book judges work similarly to thesis judges, but for e-book submissions.

Responsibilities:

* View assigned e-book registrations
* View relevant participant information
* View project details
* View project documents
* Score judging criteria
* Add comments/feedback
* Submit their evaluation

An e-book judge should only be able to judge registrations assigned to them.

---

## Participants

Participants do NOT exist in the `users` collection.

They do not have:

* Passwords
* Login accounts
* System roles
* Authentication sessions

Instead, participant information is stored as part of their competition registration.

A participant may register for different competitions over time.

A registration should preserve the information submitted at that point in time.

For example, if a participant changes their institution later, an old competition registration should not automatically change.

Therefore, participant information submitted during registration should be treated as a historical snapshot.

---

## Main Business Flow

The overall workflow is:

Participant
→ Registration
→ Project information
→ Team information
→ Supervisor information
→ Documents
→ Payment
→ Secretary verification
→ Registration becomes eligible for judging
→ Admin assigns judges
→ Judges evaluate
→ Scores are submitted
→ Results can be calculated/reported

---

## MongoDB Architecture

The application uses MongoDB.

Do not try to recreate a traditional SQL schema unnecessarily.

Use MongoDB documents and embedding where information naturally belongs to its parent.

Use references when an entity has an independent lifecycle or is shared between multiple entities.

The initial collections should be approximately:

```text
users
competitions
registrations
payments
judgeAssignments
auditLogs
```

Additional collections can be introduced only when there is a clear domain reason.

---

## users Collection

The `users` collection contains ONLY authenticated internal users.

Example:

```js
{
  _id: ObjectId(),

  name: "Dr. Ahmad Rahman",
  email: "ahmad@example.com",
  passwordHash: "...",

  roles: [
    "THESIS_JUDGE"
  ],

  status: "ACTIVE",

  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

Valid roles:

```text
ADMIN
SECRETARY
THESIS_JUDGE
EBOOK_JUDGE
```

Use a roles array rather than a single role because a user may potentially have multiple roles.

For example:

```js
roles: [
  "ADMIN",
  "THESIS_JUDGE"
]
```

Do not add `PARTICIPANT` as a user role unless the requirements explicitly change.

---

## competitions Collection

A competition represents a specific competition/event.

Example:

```js
{
  _id: ObjectId(),

  name: "National Innovation Competition 2026",

  description: "...",

  categories: [
    {
      type: "THESIS",
      name: "Research Thesis"
    },
    {
      type: "EBOOK",
      name: "Digital Book"
    }
  ],

  registrationStart: ISODate(),
  registrationEnd: ISODate(),

  status: "OPEN",

  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

Competition categories can be embedded if they do not need an independent lifecycle.

---

## registrations Collection

The `registrations` collection is the core entity for participants.

A registration represents one participant/team entering one competition.

Example:

```js
{
  _id: ObjectId(),

  registrationNumber: "REG-2026-00125",

  competitionId: ObjectId(),

  participant: {
    name: "Ahmad Rahman",
    email: "ahmad@gmail.com",
    phone: "+60123456789",

    educationLevel: "UNDERGRADUATE",

    institution: {
      name: "Universiti Kuala Lumpur",
      country: "Malaysia"
    },

    government_id: {
      type: "NATIONAL_ID",
      value: "123456"
    }
  },

  project: {
    title: "AI-Based Smart Agriculture System",
    abstract: "...",
    category: "THESIS"
  },

  team: {
    lead: {
      name: "Ahmad Rahman",
      email: "ahmad@gmail.com"
    },

    members: [
      {
        name: "Ali Hassan",
        email: "ali@gmail.com"
      }
    ]
  },

  supervisors: [
    {
      name: "Dr. Abdullah",
      email: "abdullah@university.edu",
    }
  ],

  documents: [
    {
      type: "PROJECT_DOCUMENT",
      file_name: "project.pdf",
      file_url: "..."
    }
  ],

  status: "SUBMITTED",

  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

The exact fields may evolve according to the competition requirements.

Do not assume fields that have not been specified.

---

## Important Registration Principle

The registration should preserve the information submitted by the participant.

Do not rely on dynamically fetching participant information from some hypothetical user profile.

The registration is a historical record.

For example:

```text
2026 Registration
Institution: Universiti Kuala Lumpur
```

should remain unchanged even if the participant later submits another registration with:

```text
2027 Registration
Institution: Another University
```

---

## Team Members

Team members do not necessarily need system accounts.

If team members do not need to log into the system, store their submitted information directly in the registration:

```js
team: {
  lead: {
    name,
    email,
    ...
  },

  members: [
    {
      name,
      email,
      ...
    }
  ]
}
```

Do not create unnecessary `users` records for team members simply because they are people.

Only create a `users` record if they actually need authenticated access to the system.

---

## Supervisors

Supervisors are also not automatically system users.

If supervisors only need to be listed as part of a registration, store their submitted information in the registration:

```js
supervisors: [
  {
    name,
    email,
    institution
  }
]
```

Do not create authenticated user accounts for supervisors unless the requirements explicitly introduce supervisor functionality.

---

## payments Collection

Payment information should be separate from the registration because payment has its own lifecycle.

Example:

```js
{
  _id: ObjectId(),

  registrationId: ObjectId(),

  amount: 150,
  currency: "MYR",

  paymentMethod: "FPX",

  reference: "FPX-928381",

  receiptUrl: "...",

  status: "PENDING",

  verifiedBy: null,
  verifiedAt: null,

  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

Possible payment statuses:

```text
PENDING
VERIFIED
REJECTED
```

When a secretary verifies a payment:

```text
PENDING
→ VERIFIED
```

If rejected:

```text
PENDING
→ REJECTED
```

Always preserve who verified/rejected the payment and when.

---

## Judge Assignments

Judges should not be able to score arbitrary registrations.

A judge must have an explicit assignment.

Use a `judgeAssignments` collection.

Example:

```js
{
  _id: ObjectId(),

  judgeId: ObjectId(),
  registrationId: ObjectId(),

  status: "ASSIGNED",

  scores: [
    {
      criterionId: ObjectId(),
      score: 18,
      comment: "Strong methodology."
    }
  ],

  submittedAt: null,

  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

Possible assignment statuses:

```text
ASSIGNED
IN_PROGRESS
COMPLETED
```

A judge should only be able to access and evaluate registrations assigned to them.

Authorization must check BOTH:

1. The user has the appropriate judge role.
2. The judge has an assignment for that registration.

For example:

```text
THESIS_JUDGE
+
assignment exists
+
registration.category === THESIS
=
allowed to judge
```

Do not rely on the frontend to enforce this.

---

## Judging Criteria

Judging criteria should be configurable rather than hardcoded into the application.

For example, a thesis competition might use:

```text
Innovation       20%
Methodology      30%
Results          30%
Presentation     20%
```

An e-book competition may use completely different criteria.

Criteria can be represented as part of competition configuration or as a separate collection if they require an independent lifecycle.

Example:

```js
{
  category: "THESIS",

  criteria: [
    {
      name: "Innovation",
      description: "...",
      maxScore: 20,
      weight: 20
    },
    {
      name: "Methodology",
      description: "...",
      maxScore: 30,
      weight: 30
    }
  ]
}
```

Do not hardcode criterion names into application logic.

---

## Scores

Scores belong to a judge's evaluation of a registration.

They should be associated with the judge assignment.

Example:

```js
scores: [
  {
    criterionId: ObjectId(),
    score: 18,
    comment: "Strong innovation."
  },
  {
    criterionId: ObjectId(),
    score: 25,
    comment: "Good methodology."
  }
]
```

A judge should not be able to modify a completed evaluation unless the business requirements explicitly allow score revisions.

---

## Authorization

Authorization is critical.

Never rely only on the frontend.

Backend authorization must check:

```text
Authenticated user
        ↓
Has required role
        ↓
Has access to requested resource
        ↓
Action is permitted
```

Examples:

### Secretary

Can verify payments:

```text
SECRETARY
+
payment exists
=
can verify payment
```

But should not submit judging scores.

### Thesis Judge

Can judge:

```text
THESIS_JUDGE
+
assigned to registration
+
registration category = THESIS
=
can submit evaluation
```

### E-book Judge

Can judge:

```text
EBOOK_JUDGE
+
assigned to registration
+
registration category = EBOOK
=
can submit evaluation
```

### Admin

Has broad system management access.

---

## Registration Status

Use explicit statuses rather than relying on scattered boolean fields.

Possible lifecycle:

```text
DRAFT
↓
SUBMITTED
↓
PAYMENT_PENDING
↓
PAYMENT_VERIFIED
↓
READY_FOR_JUDGING
↓
JUDGING
↓
JUDGED
```

Rejected/cancelled states may also exist depending on requirements.

Do not create statuses that have no clear business meaning.

---

## Audit Logs

Important administrative actions should be recorded.

Example:

```js
{
  _id: ObjectId(),

  userId: ObjectId(),

  action: "VERIFY_PAYMENT",

  entityType: "PAYMENT",
  entityId: ObjectId(),

  metadata: {
    previousStatus: "PENDING",
    newStatus: "VERIFIED"
  },

  createdAt: ISODate()
}
```

Audit logs are especially important for:

* Payment verification
* Payment rejection
* Judge assignment
* Score submission
* Score changes
* Registration changes
* Administrative actions

---

## Database Design Principles

Follow these principles when implementing the system:

1. Do not create unnecessary collections.
2. Do not treat MongoDB like a relational SQL database.
3. Embed data when it naturally belongs to a parent document.
4. Use references when data has an independent lifecycle or is shared.
5. Keep authenticated users separate from external participants.
6. Treat registrations as historical records.
7. Do not create user accounts for team members or supervisors unless they require system access.
8. Keep payments separate because payment has its own lifecycle.
9. Keep judge assignments separate because assignments have their own lifecycle.
10. Never rely on frontend authorization.
11. Use database indexes for frequently queried fields.
12. Use validation for required fields and allowed enum/status values.
13. Avoid premature abstraction.
14. Do not add features or entities that are not required by the current business requirements.

---

## Initial Development Order

Build the system in vertical slices:

### Phase 1 - Competition and Registration

Build:

* Competition management
* Registration form
* Participant information
* Project information
* Team members
* Supervisors
* Document uploads
* Registration submission

### Phase 2 - Payment

Build:

* Payment submission
* Receipt upload
* Secretary dashboard
* Payment verification/rejection
* Registration status transitions

### Phase 3 - Judging

Build:

* Judge accounts
* Judge management
* Judge assignments
* Thesis judging
* E-book judging
* Criteria
* Scores
* Comments
* Evaluation submission

### Phase 4 - Administration

Build:

* Admin dashboard
* User management
* Competition management
* Registration management
* Judge assignment management
* Results
* Reports
* Audit logs

---

## Important Instruction for Code Generation

Before creating or modifying code, understand the existing project structure and conventions.

Do not introduce new libraries, architectural patterns, collections, APIs, or abstractions without a clear reason.

Prefer simple, maintainable implementations.

When implementing database models, keep the MongoDB document structure aligned with the domain model above.

When a requirement is ambiguous, inspect the existing code and configuration first rather than inventing business rules.

The system should be designed so that the participant registration workflow works end-to-end before building advanced administrative features.

---

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
