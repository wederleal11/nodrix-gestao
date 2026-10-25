# Security Specification — Nodrix Gestão

## 1. Data Invariants
1. **User Identity & Role Control**: User profiles can only be updated with valid fields; standard collaborators cannot escalate themselves to `admin` or change their own `role` or `status`. Initial admin is `wederleal11@gmail.com`.
2. **Project Integrity**: Only administrators can create or archive projects. Collaborators can read projects they are assigned to or that are active.
3. **Task State & Validation Workflow**:
   - Tasks cannot transition directly from `in_progress` to `completed`.
   - Completion requires `awaiting_validation` with `deliverySummary` and `deliveryEvidence`.
   - Self-approval is strictly forbidden: a user cannot validate their own delivery (`validatorId != assigneeId`).
   - Collaborators cannot directly change a task's priority without a manager-approved `PriorityRequest`.
4. **Audit Immutability**: `audit_logs` are write-once append-only documents. Deletion or updates of audit logs is forbidden for all users.
5. **PII and Confidential Feedback Isolation**:
   - Manager private notes inside `feedbacks` (`privateManagerNote`) are strictly accessible only to the Admin.
   - Collaborators can ONLY read feedback explicitly shared with them (`userId == request.auth.uid` and `sharedWithUser == true`).
   - Collaborators can NEVER read feedback addressed to other team members.
6. **Temporal & Boundary Enforcement**: Timestamps must be validated, and string sizes strictly bounded (e.g., titles <= 200 chars, descriptions <= 2000 chars) to prevent Denial of Wallet attacks.

---

## 2. The "Dirty Dozen" Vulnerability Payloads

1. **Payload 1 (Self-Role Escalation)**: Collaborator attempts to update `role: "admin"` in `/users/{uid}`.
2. **Payload 2 (Ghost Status Jump)**: Collaborator attempts to update task from `in_progress` directly to `completed` bypassing `awaiting_validation`.
3. **Payload 3 (Self-Approval Attack)**: Assignee attempts to validate their own task setting `validatorId == assigneeId` and `status: "completed"`.
4. **Payload 4 (Confidential Feedback Snoop)**: Collaborator Bruno attempts to `get` feedback document of Jefferson (`/feedbacks/{feedbackId}`).
5. **Payload 5 (Audit Trail Destruction)**: User attempts to `delete` an entry in `/audit_logs/{logId}`.
6. **Payload 6 (Unauthorized Project Archival)**: Collaborator attempts to mark project `isArchived: true`.
7. **Payload 7 (Oversized Payload / Denial of Wallet)**: Malicious actor sends a 5MB junk string in task `title` to exhaust database quota.
8. **Payload 8 (Arbitrary Priority Override)**: Collaborator silently changes task priority from `P2` to `P0` without manager authorization.
9. **Payload 9 (Orphaned Task Injection)**: Task created with non-existent or invalid `projectId`.
10. **Payload 10 (Daily Checkin Identity Forgery)**: User creates a checkin with someone else's `userId`.
11. **Payload 11 (Unverified Email Write)**: Unauthenticated or unverified token attempting document creation.
12. **Payload 12 (Shadow Field Injection)**: Injection of undeclared field `isBypassed: true` into task payload.
