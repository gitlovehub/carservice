# TV4 - Test scope and verification guide

Source baseline: CarService `v4` commit `729f7f6`, TV4 frontend account, customer and vehicle modules. These supplemental tests were prepared with AI assistance from the existing source and are not a claim of independently authored production code. The original 119-file transfer is not changed by this suite.

## Automated checks

From `frontend`, with the dependencies installed using `npm ci` and Node.js 24:

```sh
node --test tests/tv4-unit/*.test.mjs
```

On supported Node.js 22.13+ releases, include `--experimental-strip-types` if required. The one-time result on the archived source (Node 22.16.0, TypeScript 5.8.3) was 176 passed, 0 failed, 0 skipped. The project's installed versions and final integrated branch must be tested separately. The suite contains 94 previously delivered tests and 82 additional test cases.

The tests execute real TypeScript helpers and TSX components with explicitly injected browser, hook, API or network boundaries. They check input validation, API contract construction, session cleanup, routing decisions, billing calculations, email workflows, vehicle photo interactions, quotation/review eligibility and notification panel actions. They do not render a real DOM, run actual Laravel APIs, authenticate real users, upload real files, deliver real email or exercise WebSocket transport. Tests using mocked endpoints are not proof of server-side authorization. A passing suite is not a coverage percentage or proof that the entire application is defect-free.

## Manual integration checklist - pending

Run these against an isolated test database after all seven branches are integrated and with authorization from the team. Use disposable accounts and synthetic customer information. Record actual outcomes, not expected outcomes, with the browser version, backend build and commit SHA.

| Area | Scenario | Expected result | Actual result |
|---|---|---|---|
| Registration | Valid and duplicate email/phone, invalid password | Valid input registers; duplicates and invalid input receive safe errors | Not run |
| Email verification | Open test-mail verification link; expired or reused link | Only valid verification activates account; errors handled without leaking internals | Not run |
| Recovery | Request OTP, try invalid/expired OTP, resend, reset | Backend rejects invalid codes and enforces rate limits; successful reset permits new password | Not run |
| OTP editing | Delete a digit from the middle, paste mixed text, use keyboard arrows | Input and focus remain understandable; confirm middle-digit behavior on browser (current joining logic may shift later digits) | Not run |
| Session | Login, logout, remember-me, refresh and expired token | Correct role, safe cleanup; test cookie-only session marker separately | Not run |
| Authorization | Attempt customer access to another synthetic customer's vehicle, order, invoice and review; try staff/admin routes | Backend refuses unauthorized requests, including direct API requests | Not run |
| Contact update | Change name and phone, invalid values, duplicate phone | Valid data persists and refreshed profile is consistent; invalid data rejected | Not run |
| Change email | Customer and advisor initiate change, then confirm on new test mailbox | Login email changes only after server confirmation; old mailbox alert and error handling verified | Not run |
| Owner email | Advisor sends and confirms a test code | Only correct, permitted customer/email/code combination is verified | Not run |
| Vehicle CRUD | Add, edit and delete a permitted vehicle; duplicate or invalid license plate | Validation and ownership enforced by backend; history and booking relationships preserved | Not run |
| Vehicle catalog | Add/edit/disable brand, model and trim as admin | Cascading selections are consistent; existing vehicle records remain interpretable | Not run |
| Photo | Staff uploads supported image, oversize file, unsupported format and deletes | Backend checks authorization and actual content/size; UI updates only after response | Not run |
| Billing | Approve optional items, decline required items, cancel reject-all confirmation | Backend recalculates totals; response ownership and state transitions enforced | Not run |
| Payment | Successful, failed and duplicate simulated payment callback | No duplicate charge; only confirmed payments count; totals reconcile | Not run |
| Review | Attempt before handover, after handover and a duplicate review | Backend allows one review of eligible owned order; UI reflects persisted review | Not run |
| Notifications | Read one/all, filter, cancel/confirm clearing and follow deep link | Correct scoped updates and destination; no unrelated data removed | Not run |
| Live updates | Change data in another session; disconnect/reconnect; sign out | Polling and Reverb behavior recover without displaying another account's data | Not run |
| Accessibility | Keyboard navigation, focus, error announcements, responsive form layout | Important controls are accessible and errors visible | Not run |

Do not silently fix production behavior as part of this test-only branch. Report findings to the appropriate owner and obtain agreement for production changes or integration. Re-run `npm run build` and the applicable project regression scripts after all team branches are integrated. Earlier `npm audit` findings and bundle-size warning require separate review; this suite does not resolve them.
