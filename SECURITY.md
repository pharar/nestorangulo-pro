# Security Policy — nestorangulo.pro

This document describes how security is approached for **nestorangulo.pro**, the personal authority site for **Nestor Angulo de Ugarte**. The site publishes public content only: biography-style pages, essays, talks, and links to external contact channels. There are no accounts, no paywalled areas, and no application backend operated as part of the site itself.

---

## Threat model & scope

- **Purpose:** A small, mostly static personal brand presence.
- **Sensitive data:** The site does not intentionally collect visitor statistics or run first-party analytics. Contact is handled via ordinary links (for example `mailto:` and profiles on third-party services).
- **Infrastructure:** The public site is delivered over HTTPS. Operational security (provider configuration, patching, access control) relies on the hosting platform and routine maintenance practices.

Treat reported issues seriously when they materially affect confidentiality, integrity, or availability **of this site or its visitors**.

---

## Reporting a security concern

If you believe you have found a security vulnerability related to **nestorangulo.pro**, please report it responsibly:

**Email:** [security@nestorangulo.pro](mailto:security@nestorangulo.pro)

Structured contact details are also published in **[`.well-known/security.txt`](https://nestorangulo.pro/.well-known/security.txt)** (`https://nestorangulo.pro/.well-known/security.txt`).

Include, when you can:

- A concise description of the issue and the affected URL or asset
- Steps to reproduce (requests, payloads, screenshots if helpful)
- Your assessment of impact (guest vs. maintainer-only, data exposure, takeover risk, etc.)
- Whether you consent to attribution in a public thank-you note (optional)

Encrypted email is welcome if your mail client supports it; if you need a specific key or channel, ask in your first message and it can be coordinated.

---

## What to expect after you report

This is **not** a formal bug bounty program. There are **no payouts** tied to disclosures.

Responses are handled **on a best-effort basis** alongside other commitments. Practical goals:

- Acknowledge substantive reports within a **few business days** when possible.
- Provide a substantive update when a fix or mitigation has shipped, or explain why something is deferred or rejected as out of scope.
- Coordinate reasonable publication timing if you plan to disclose publicly.

Avoid destructive testing (for example denial-of-service attempts, excessive automated scanning that impacts availability, or data exfiltration beyond what proves the issue).

---

## Out of scope examples

Reporting is appreciated, but the following may be **prioritized lower or declined** depending on feasibility and relevance:

- Theoretical issues with no plausible impact on nestorangulo.pro or typical visitors (for example hypothetical attacks without a practical path against the deployed setup)
- Social engineering targeting individuals, physical access scenarios, or issues solely on external services unless they clearly stem from configuration under this site's control (for example incorrect DNS or CSP on nestorangulo.pro)
- Spam, content complaints, trademark disputes, SEO issues, or similar non-security topics — use ordinary contact routes on the website for those instead
- Third-party ecosystems (social networks, email providers, etc.) except where misuse directly involves assets served from or attributed to nestorangulo.pro

---

## Changes

This policy may be updated occasionally to stay accurate as the site or hosting evolves. Prefer the **`SECURITY.md` file at this repository root**, or linked pages under **https://nestorangulo.pro**.

---

_Last updated: 2026-05-20_
