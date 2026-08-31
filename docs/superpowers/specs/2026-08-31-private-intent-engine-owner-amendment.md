# Private Intent Engine — OWNER-Approved Design Amendment

**Date:** 2026-08-31  
**Decision:** `OWNER-PRIVATE-INTENT-001`  
**Authority:** OWNER  
**State:** `APPROVED / FINAL_IN_SCOPE`  
**Applies to:** post-linked commercial/social engagement, private interest/inquiry, post-linked messaging, notification behavior, privacy, anti-spam, interaction lifecycle  
**Amends:** `docs/superpowers/specs/2026-08-31-cleanroom-modular-core-design.md`

## 1. Precedence

This amendment was approved by the OWNER after the base Clean-Room Modular Core specification. Under the current owner precedence rule, this amendment is the governing design in overlapping post-engagement scope.

The earlier base-spec sentence that treated exact Likes/Comments/post-linked Messages privacy as `SOURCE-RECOVERY-LOCKED` is superseded for that privacy scope. Implementation status remains separate: approval does not mean the feature is implemented or verified.

## 2. Governing product rule

**Public Content + Private Intent.**

For post-linked commercial engagement:

- each user + each post has one private intent path;
- the post may be visible to its targeted audience;
- the user's interest, inquiry and post-linked communication state are private;
- the public feed does not become a public commercial-comment or public-interest-count arena.

Internal working name: **Private Intent Engine (PIE) / محرك النية الخاصة**. This is a technical working identifier, not a locked public brand.

## 3. Primary post controls

Keep the visible post interaction surface simple and familiar:

- `♡ مهتم`
- `💬 استفسار`
- `🔖 حفظ`
- `✉ تواصل`

Sharing may exist, but sharing a post must not reveal the sharer's private interest state unless the sharer explicitly states it.

The post remains visually clean; the image is presented inside the fixed post frame established by the product design. Exact crop-tool mechanics that are not fixed by this owner amendment remain governed by their own later/earlier valid design authority and must not be invented here.

## 4. Private interest

`مهتم` is private.

- no public list of users who are interested;
- no public interested-user count as the default product behavior;
- the user sees their own interest state;
- the post owner can see interest on their own post inside the private owner interaction center;
- a third user cannot see another user's interest state.

Optional non-numeric vitality wording may be designed later only within owner-approved product policy; it must not recreate public numerical social proof by default.

## 5. Private inquiry replaces public commercial comments

`استفسار` is not a public comment thread.

- the user writes an inquiry to the post owner;
- the inquiry is visible only to the user and post owner;
- other users do not see it;
- the flow preserves the ease of a comment without creating public comment noise.

## 6. One user + one post = one Intent Capsule

The platform maintains one private post-linked context per user/post pair, internally called an `Intent Capsule`.

It can record the user's progression and events such as:

- viewed;
- interested;
- inquiry;
- saved;
- serious interest;
- contact request;
- one-to-one conversation.

This is an internal context record, not a mandatory extra user-facing screen.

Do not create fragmented duplicate interaction contexts for the same user/post path.

## 7. Intent progression

Supported conceptual states include:

`VIEWED -> INTERESTED -> INQUIRY -> SERIOUS_INTEREST -> CONTACT_REQUEST -> PRIVATE_CONVERSATION -> CLOSED/ENDED`

The path is non-linear. A user may jump directly from viewing to contact, or remove/change their current interest. The system keeps the current state and internal event/audit history instead of manufacturing new duplicate records.

Do not present fake precision such as `87% purchase probability`. Use understandable states such as initial interest, following, serious interest and contact request.

## 8. Do not flood Inbox

A simple inquiry remains inside the post-linked interaction context. It does not automatically create a new Inbox conversation.

The post owner sees a private **Post Interest Center / مركز اهتمام المنشور** that can summarize the post's interaction workload instead of receiving one unrelated Inbox conversation per interest/inquiry.

Only escalation to `تواصل` converts the same private context into a full one-to-one conversation.

## 9. Post Interest Center

The post owner may see private operational summaries for their own post, including categories such as:

- interested;
- inquiries;
- serious interest;
- contact requests;
- common question categories;
- new / waiting for reply / replied / serious / contact / active conversation states.

These are private owner analytics, not public social-proof counters.

## 10. Smart inquiry classification

The intelligence layer may:

- understand an inquiry;
- classify it (price, availability, location, specifications, contact, other);
- group similar inquiries;
- suggest a reply;
- translate a reply;
- prioritize actionable inquiries.

The intelligence layer must **not invent owner facts**. It may not make up price, availability, specifications or similarly sensitive post facts.

## 11. Private Smart Reply

The owner may answer a grouped question once and have the platform deliver the answer **individually and privately** to the relevant users.

Requirements:

- no group conversation;
- recipients do not learn who else received the same response;
- each recipient receives the response inside their own private post-linked context.

## 12. Notifications

Notifications are grouped by default to prevent noise.

Example behavior:

- summarize multiple non-urgent interactions into one post-level notification;
- allow urgent/actionable events such as a new contact request or serious-interest waiting for reply to produce a separate notification;
- opening the notification should lead to the relevant post interaction center/context.

## 13. Conversation escalation

When the user chooses `تواصل`:

- reuse the same Intent Capsule/context;
- create/continue a one-to-one conversation;
- preserve the post context/card at the top of the conversation;
- do not create a second unrelated context and lose the previous inquiry history;
- enforce conversation/context uniqueness for the same user/post path.

General social messaging outside this post-linked commercial scope is not abolished by this amendment.

## 14. User view

The user sees only their own relationship to the post, for example:

- you are interested;
- your inquiry;
- the owner's reply;
- your contact request;
- your one-to-one conversation if escalated.

The user does not see other users' private interaction states.

## 15. Owner-guided updates

When the owner changes a fact such as availability/sold state or price, the platform may identify users who previously asked about that fact and propose a private update.

The update is sent only when the owner approves the proposed notification as defined by the approved source design. The intelligence layer does not silently declare availability/sale/price facts.

## 16. Privacy boundary

Fail closed.

- **User:** sees their own interaction.
- **Post owner:** sees interactions on their own post.
- **Third user:** sees nothing about other users' private engagement.
- **Employee:** gets no private-content access merely because they are an employee.
- **Administration:** accesses private content only through explicit authorization and a legitimate safety/abuse/security reason under the platform permission system.

UI hiding alone is not sufficient; server-side authorization must enforce private access.

## 17. Harassment and spam protection

The private intent path supports:

- block;
- report;
- close inquiry;
- repeated-message protection;
- repeated identical-message detection;
- suspicious-link handling;
- automated-behavior/spam detection;
- blocked-user enforcement;
- rate limiting or merging repeated nagging messages when appropriate.

The system may show the sender that the inquiry has already been sent rather than creating repeated pressure messages.

## 18. Translation

When participants use different languages, the platform may translate inquiries/replies while preserving and making the original text available according to UI policy.

## 19. Post expiry and deletion

The current paid-card lifecycle still governs post expiry.

When the post expires:

- no new Intent Capsules / new post-linked engagement may be created;
- existing private history remains according to retention policy;
- an already-started real conversation may remain according to retention policy;
- the conversation must show the post context as expired.

If the owner deletes/unpublishes the post:

- it disappears from the public surface;
- an existing conversation may show that the post is no longer available;
- security/audit history follows the approved retention/authorization policy.

This amendment does not invent the unresolved retention duration.

## 20. Save and share are distinct

`حفظ` is separate from `مهتم`; saving a post does not imply contact intent.

Private return/revisit behavior may improve recommendations, but must not be exposed invasively to the post owner.

Sharing a post must not reveal the sharer's private interest unless explicitly stated by the sharer.

## 21. Analytics and transaction truth

Owner-facing post analytics should emphasize useful private funnel signals such as:

- verified views;
- interest;
- inquiries;
- serious interest;
- contact requests.

Do not claim that a sale happened merely because a contact request or private conversation happened. The in-platform path ends at communication unless a future explicit, evidence-based owner decision adds transaction proof.

## 22. Simple outside, intelligent inside

The external interaction grammar remains immediately understandable: post, image, interest, inquiry, save, contact.

Classification, grouping, priority, private smart replies, notification aggregation, anti-duplication and anti-spam operate behind the scenes. Do not expose a maze of controls to ordinary users.

## 23. Explicit supersession

For overlapping post-linked commercial engagement scope, the following are superseded:

- public Like/interest identity lists;
- default public numerical interested-user counts;
- public commercial inquiry/comment threads;
- creating an Inbox conversation for every simple inquiry;
- duplicate conversations/contexts for the same user/post path;
- employee-by-title access to private engagement;
- the base-spec `SOURCE-RECOVERY-LOCKED` state for exact Likes/Comments/post-linked Messages privacy.

## 24. Implementation truth

This amendment is **approved design authority**, not implementation evidence.

Required later gate remains:

`Exact SHA -> Tests -> Security/Authorization -> Schema Verification -> Working Preview -> OWNER Acceptance -> Separate Release Decision`

No Production mutation, real payment, live database migration or release is authorized by this amendment.