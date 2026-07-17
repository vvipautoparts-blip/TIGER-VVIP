# UAT OWNER ACCEPTANCE PLAN

## Scope

Owner acceptance scenarios across:

- Android mobile
- iPhone mobile
- Desktop web
- RTL
- Arabic then English flow

## Coverage Areas

- Login and logout
- Home
- Marketplace
- Search
- Profiles
- Create Listing
- Images
- Communication
- Tiger Care
- Permissions
- Negative cases

## Test Case Template

| ID | Preconditions | Steps | Expected Result | Evidence | Owner Decision |
| --- | --- | --- | --- | --- | --- |
| UAT-A-001 | Test account exists on Android | Open app, login, logout | Successful login/logout without broken flow | Screen recording + timestamp | Pending |
| UAT-A-002 | Logged in user | Open Home then Marketplace | Cards/filters render and remain usable | Screenshots | Pending |
| UAT-A-003 | Listings available | Run search by sector/category/price/location | Relevant results returned | Screenshot + query terms | Pending |
| UAT-A-004 | Seller-capable account | Create listing with required fields | Draft/submit path works with validation | Video capture + form values | Pending |
| UAT-A-005 | Image assets prepared | Add, crop, reorder, set cover | Up to 7 images, 4:3 behavior visible | Screen recording | Pending |
| UAT-A-006 | Existing listing and counterpart user | Start private communication | One-to-one flow only | Screenshots | Pending |
| UAT-A-007 | Tiger Care form accessible | Submit request | Confirmation message displayed | Screenshot of confirmation | Pending |
| UAT-A-008 | Role test users available | Attempt unauthorized route | Access denied shown correctly | Screenshot of denied state | Pending |
| UAT-A-009 | Arabic default | Complete key flow then switch English | RTL Arabic and LTR English copy both clear | Side-by-side captures | Pending |
| UAT-A-010 | Negative data cases prepared | Try zero price / over image limit / invalid actions | Validation and blocks appear | Screenshot of each error | Pending |

## Execution Notes

- Run the same core suite on Android, iPhone, and desktop web.
- Record evidence for each case before owner decision.
- Owner decision must be explicit per case (`Accepted`, `Rejected`, `Needs Fix`).
- No case implies backend authorization by UI behavior alone.