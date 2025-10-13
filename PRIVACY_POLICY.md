# MMOPLAYA Privacy Policy

_Last updated: 2025-10-13_

We built MMOPLAYA with privacy as a core feature. This policy explains what data we collect, why we collect it, and the limited circumstances under which we share it. If anything here is unclear, contact us at `artur@mmoplaya.net`.

## 1. Principles
- **Collect only what we need.** We stick to the minimum data required to deliver matchmaking, messaging, and safety features.
- **Give you control.** You can export your data via `/api/export` and delete your account at any time from settings.
- **Guardians first.** Kid accounts require a linked guardian who can review matches, chats, and guild memberships.
- **No tracking ads.** We do not sell, rent, or broker personal data.

## 2. Data we collect
| Category | Details | Retention |
| --- | --- | --- |
| Account | Email address (for magic-link login) and the profile info you choose to share | Until you delete your account |
| Matchmaking | Swipes, matches, guild memberships, and badge collections | Until deletion or as directed by a guardian |
| Messages | Direct and guild messages (auto-deleted after 30 days) | 30 days |
| Guardian controls | Approvals, blocks, and linked kid accounts | Until guardian unlinks or deletes |
| Device context | IP address and user-agent captured for security and abuse prevention | Up to 30 days |
| Cookies | A single, httpOnly session cookie used strictly for login/session continuity | Until you sign out or the session expires |

## 3. How we use data
- Deliver matchmaking suggestions, chat, and guild features you request.
- Operate guardian approvals, kid safeguards, and automated moderation tools.
- Monitor aggregate product health metrics so we can improve stability and safety.

## 4. Cookies & local storage
We rely on one first-party cookie (`mmo_match_session`) to keep you signed in. It is httpOnly, marked `Secure` in production, and never used for advertising or cross-site tracking. We do not load third-party cookies or analytics pixels by default.

## 5. Sharing
We share data only with trusted partners who help run the service:
- **Email providers** to deliver magic-link login codes.
- **Payment processors** when guild creation codes or similar purchases are enabled.
- **Moderation partners** (via OpenRouter) that analyze small snippets of text for abuse. We redact personal identifiers where feasible.
All vendors commit contractually to use data solely to provide their service and to maintain adequate security.

## 6. Data control and deletion
- Export your data: request `/api/export` while authenticated.
- Delete your account: use the “Delete account” control in settings or email `artur@mmoplaya.net`.
- Guardians may request deletion of linked kid accounts or revoke approvals at any time.

## 7. Security
- Passwordless OTP login with secure session cookies (no passwords stored).
- All connections use TLS. Secrets are encrypted at rest.
- We monitor dependencies, apply security patches promptly, and welcome responsible disclosure.

## 8. Children
Kid accounts are created and managed by guardians. We do not knowingly collect personal information from kids without explicit guardian oversight and consent.

## 9. International transfers
Data is hosted in the region selected when deploying your MMOPLAYA instance. If a provider moves data across borders, it must implement adequate safeguards (e.g., SCCs).

## 10. Changes
We may update this policy to reflect new features or legal requirements. Major changes will be announced within the app and, when possible, via email.

## 11. Contact
Privacy questions, deletion requests, or vulnerability reports: `artur@mmoplaya.net`.

By using MMOPLAYA, you consent to this policy. We appreciate your trust and are committed to keeping your data safe.
