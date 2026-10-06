# Google Play — Data safety & declarations (معامل ترست | Trust Labs)

Prepared from the actual code (2026-10-06). Where the form wording is ambiguous the
conservative answer is chosen. Items marked ⚠️ need a human decision before submitting.

## 1. First screen of the form

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS everywhere) |
| Do you provide a way for users to request that their data be deleted? | **Yes** → `https://app.trustlabseg.com/delete-data` |

## 2. Data types

Terms: **Collected** = leaves the device to us or our providers. **Shared** = handed to a third party
for *its own* use. Google excludes service providers that process data on our behalf, so
Supabase, Formspree, Anthropic, Google Analytics and Vercel count as *collected, not shared*.
Trust Lab Ops (the lab's own ERP) is first-party.

**Ephemeral processing:** No, for everything below (it is stored).

| Category → type | Collected | Shared | Required / optional | Purpose | Where it comes from |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | No | Required to book / complain; optional in visit rating | App functionality | Booking, Trust Card, complaints, ratings |
| Personal info → **Phone number** | Yes | No | Required to book / complain / activate card; optional in visit rating | App functionality; Fraud prevention, security and compliance | Same + sample tracking lookup; phone + card code unlock the medical file |
| Personal info → **Address** | Yes | No | Required for home visit; optional on Trust Card | App functionality | Home-visit booking, Trust Card |
| Personal info → **Other info** | Yes | No | Optional | App functionality | Date of birth, gender, marital status, family relationship |
| Health and fitness → **Health info** | Yes | No | Required for booking tests; optional for Trust Card | App functionality | Requested tests, blood group, emergency contact, family members' details, lab / imaging reports and diagnoses shown in the medical file |
| Messages → **Other in-app messages** | Yes | No | Optional | App functionality | Chat assistant messages, complaint text, visit-rating comments |
| Photos and videos → **Photos** | Yes | No | Optional | App functionality | Profile photo on the Trust Card |
| App activity → **App interactions** | Yes | No | Required (automatic) | Analytics | Google Analytics page views and events (booking started / completed, results viewed, chat opened…), Vercel Analytics |
| App activity → **Other user-generated content** | Yes | No | Optional | App functionality | Visit-rating answers |
| Device or other IDs → **Device or other IDs** | Yes | No | Required (automatic) | Analytics | Random anonymous device id stored on the phone for QR-scan counting; Google Analytics client id |

### Not collected — answer "No" for these
Location (approximate and precise) · Email address · User IDs / accounts · Race, religion, politics,
sexual orientation · Financial info (no card numbers, no payments in the app; "cash / card at the
visit" is only a preference) · Purchase history · Contacts · Calendar · Audio · Video · Files and docs
uploaded by the user · SMS / call log · Web browsing history · Installed apps · Crash logs and
diagnostics.

## 3. Security practices section

| Question | Answer |
|---|---|
| Data encrypted in transit | Yes |
| Users can request data deletion | Yes — URL above |
| Committed to the Play Families Policy | No (app is for adults, 18+) |
| Independent security review | No |

## 4. Other declarations

| Declaration | Answer |
|---|---|
| App access (login required for any feature?) | **No** — everything is available without logging in. Staff area `/admin` is not linked anywhere in the patient UI. ⚠️ If Google asks for reviewer access to it, create a dedicated read-only test account; never share a real admin login |
| Ads | **No ads** |
| Target audience | **18 and over** |
| Content rating (IARC) | Answer honestly; expect "Everyone". No violence, no user-visible public content |
| Health apps declaration | Pick the closest options: **health information / records and lab services booking**. The app does **not** diagnose, treat, or claim to be a medical device ⚠️ read the options in the console before picking |
| Government / financial / news / COVID apps | No to all |
| Sensitive permissions | None requested |
| Privacy policy URL | `https://app.trustlabseg.com/privacy` |

## 5. ⚠️ Points to confirm before you submit

1. **Chat assistant.** Messages go to Anthropic (processing on our behalf → "collected, not shared"). The assistant is currently blocked on credit, but the code ships in the app, so it is declared. If you ever remove the assistant, remove "Other in-app messages → chat" from the answer.
2. **Anthropic and health info.** A patient could type health details into the chat. We treat Anthropic as a service provider. If Google or the lab's lawyer prefers the stricter reading, mark Health info and Messages as **Shared** with purpose "App functionality" instead.
3. **Public profile photos.** Trust Card photos are stored in a *public* Supabase bucket (random file names, but publicly reachable if the link leaks). Consider switching them to expiring links before launch, as is already done for reports.
4. **Retention.** The policy promises deletion on request and is silent on a fixed retention period. Keep it that way unless management sets one.
5. **ERP forwarding.** Bookings and visit ratings are forwarded to Trust Lab Ops, the lab's own system. Deletion requests must also be applied there (colleague's side).
6. **Keep this in sync.** Any new field, SDK or provider means updating this form *and* `https://app.trustlabseg.com/privacy`, or Google can pull the app.
