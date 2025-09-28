# MMO Match Privacy Policy

_Last updated: 2024-06-06_

We built MMO Match with privacy as a core feature. This policy explains what data we collect, why we collect it, and the limited circumstances under which we share it. If anything here is unclear, contact us at `privacy@mmo-match.gg`.

## 1. Principles
- **Collect only what we need.** We stick to the minimum data required to deliver matchmaking, messaging, and safety features.
- **Give you control.** You can export your data via `/api/export` and delete your account at any time from settings.
- **Guardians first.** Kid accounts require a linked guardian who can review matches, chats, and guild memberships.
- **No tracking ads.** We do not sell, rent, or broker personal data.

## 2. Data we collect
| Category | Details | Retention |
| --- | --- | --- |
| Account | Email address (for magic-link login) and basic preference profile | Until you delete your account |
| Matchmaking | Swipes, matches, and badge collections | Until deletion or as mandated by guardians |
| Messages | Direct and guild messages. Auto-deleted after 30 days. | 30 days |
| Guardian controls | Approvals, blocks, and linked kid accounts | Until guardian unlinks or deletes |
| Device context | IP address and user-agent logged transiently for security (stored for at most 30 days) | 30 days |

## 3. How we use data
- Deliver matchmaking suggestions and chat functionality.
- Operate guardian approvals, kid safeguards, and shadowban moderation.
- Monitor anonymized analytics to keep features running smoothly.
- Generate aggregated badge insights (never tied to individuals).

## 4. Sharing
We share data only with:
- **Email service providers** for sending login links.
- **Payment providers** when purchasing guild creation codes.
- **Moderation partners** (via OpenRouter) to scan small slices of text for abuse. We redact personal identifiers where feasible.
All vendors commit contractually to use data solely to provide their service.

## 5. Data control and deletion
- Export your data: request `/api/export` while authenticated.
- Delete your account: use the “Delete account” action in settings or email `privacy@mmo-match.gg`.
- Guardians may request deletion of linked kid accounts.

## 6. Security
- OTP login with session cookies (no passwords stored).
- All connections use TLS. Sensitive secrets are stored encrypted.
- We regularly audit dependencies and honor vulnerability disclosures.

## 7. Children
Kid accounts are created and managed by guardians. We do not knowingly collect personal information from kids without explicit guardian oversight.

## 8. International transfers
Data is stored in the region selected when deploying your MMO Match instance. If a provider moves data across borders, it must provide adequate safeguards (e.g., SCCs).

## 9. Changes
We may update this policy to reflect new features. Major changes will be announced within the app and by email when possible.

## 10. Contact
Privacy questions, deletion requests, or vulnerability reports: `privacy@mmo-match.gg`.

By using MMO Match, you consent to this policy. We appreciate your trust and are committed to keeping your data safe.
