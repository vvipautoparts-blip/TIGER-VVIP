# TIGER CARE OPERATIONS SOP

## 1. Request Intake

- Receive request from in-platform form only.
- Capture requester, sector, category, summary, and timestamp.
- Send confirmation message immediately.

Official user message:

`تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.`

## 2. Classification

- Classify by request type: support, complaint, escalation, account help, content report.
- Tag sector and urgency.

## 3. Priority Model

- `Low`: informational/non-blocking.
- `Normal`: standard support.
- `High`: service-impacting issue.
- `Urgent`: severe abuse, security, legal, or critical service disruption.

## 4. Assignment

- Assign ticket to responsible queue owner.
- Reassign with reason when scope changes.
- Keep assignment history.

## 5. SLA Response

- First response must be within `24` hours.
- If unresolved, share progress update with user.

## 6. Escalation

- Escalate to sector manager for sector-bound risk.
- Escalate to platform admin for cross-sector/critical risk.
- Escalate to owner lane for strategic/legal blocking decisions.

## 7. Closure And Reopen

- Close only after resolution summary is logged.
- Allow reopen when user provides new evidence within policy window.

## 8. Privacy Protection

- Do not expose management phone numbers.
- Do not request passwords, OTP codes, or token secrets.
- Keep sensitive fields redacted in shared responses.

## 9. Response Templates

### Acknowledgment

- Arabic: تم استلام طلبك، وجارٍ مراجعته من الفريق المختص.
- English: Your request has been received and is under review by the responsible team.

### Need More Info

- Arabic: نحتاج معلومات إضافية لإكمال المعالجة. يرجى تزويدنا بالتفاصيل التالية.
- English: We need additional information to proceed. Please provide the following details.

### Resolved

- Arabic: تم إغلاق الطلب بعد المعالجة. يمكنك إعادة فتحه إذا ظهرت معلومات جديدة.
- English: The request has been resolved and closed. You may reopen it if new information appears.

## 10. Future Audit Log Requirement

Minimum future audit fields:

- Ticket ID
- Actor role and actor ID
- Action type
- Before/after status
- Assignment changes
- Escalation marker
- Timestamp
- Evidence reference