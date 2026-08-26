---
title: "Cyber Resilience Act: freemium isn't open-source exempt"
description: "The CRA's open-source exemption turns on commercial activity, not licence. If your free plugin funnels users to a paid tier, you're probably a manufacturer."
date: 2026-08-26
language: en
themes:
  - Software Supply Chain
  - GRC
  - WordPress Security
tags:
  - Cyber Resilience Act
  - CRA
  - open source
  - vulnerability disclosure
  - WordPress plugins
  - freemium
featured: true
draft: true
---

On 11 September 2026, Article 14 of the EU Cyber Resilience Act starts to bite. From
that date, a manufacturer that becomes aware of an actively exploited vulnerability in
its product has 24 hours to file an early warning, 72 hours to file the full
notification, and 14 days after a fix is available to file the final report. Severe
incidents follow the same 24/72 clock, with one month for the final report.

Two weeks before that date, the regulation most people in the European software
industry are worried about is the AI Act. It just moved. Regulation (EU) 2026/1744,
the Digital Omnibus on AI, pushed the Annex III high-risk obligations from 2 August
2026 to 2 December 2027, and the Annex I ones to 2 August 2028. The Article 50
transparency duties stayed where they were.

The CRA didn't move. Its reporting deadline is the one arriving, and it lands on a
group of people who mostly believe it doesn't apply to them.

Here is the thesis. If you sell a plugin, a theme or an extension into the EU, the CRA
very likely treats you as a _manufacturer_. The open-source exemption is real, but it
covers considerably less than most maintainers assume, and in particular it does not
cover freemium. Free plugin in the repository, paid pro version: that is the business
model of a large part of the WordPress economy, and it is the model the exemption was
never written to protect.

## What puts you in scope of the CRA, and it isn't the licence

Start with the operative text rather than the commentary, because the commentary is
where this gets distorted in both directions.

Article 2(1) says the regulation applies to "products with digital elements made
available on the market". Article 3(22) then defines making available on the market as
the supply of a product "for distribution or use on the Union market in the course of
a commercial activity, whether in return for payment or free of charge".

That last clause is the whole argument. Charging nothing is not an exemption. The test
is commercial activity, and it is written into the binding part of the regulation, not
inferred from the preamble. Article 2 does carry a list of carve-outs — medical
devices, in vitro diagnostics, motor vehicles, civil aviation, defence, classified
systems — and free and open-source software is not among them. The FOSS treatment lives
inside the definition of scope, which means it lives inside the commercial-activity
test.

So what counts as commercial activity? For that we do have to go to the recitals, and
this is worth stating plainly rather than glossing over: recitals are interpretive
guidance. They tell you how the legislator intends the operative text to be read. They
are not themselves the obligation. Recitals 15 and 18 set out the indicators:

- charging a price for the product;
- charging for technical support, unless it is purely recovering actual costs;
- an intention to monetise, which the text spells out as including "providing a
  software platform through which the manufacturer monetises other services";
- requiring the processing of personal data for reasons other than improving security,
  compatibility or interoperability;
- accepting donations that exceed the costs of design, development and provision.

Read the third one again. A free plugin distributed through a repository, acting as the
acquisition funnel for a paid pro version, is a software platform through which the
manufacturer monetises other services. That is not a stretched reading. That is the
example.

What genuinely stays outside: free and open-source software not monetised by its
manufacturer, software from not-for-profit organisations that reinvest everything into
non-profit purposes, and individual contributions made outside one's own commercial
responsibility. A component integrated into someone else's commercial product only
comes into scope through the _original_ manufacturer's own monetisation. And shipping
releases on a regular schedule is not, on its own, evidence of commercial activity.

Whether any specific freemium project falls inside is a legal determination, and border
cases need a lawyer rather than a blog post. What I can tell you is which question to
ask, and it isn't "is my code open source".

## What you actually owe under the CRA, and when

The alarmist version of this article would stop at the previous section and let you
assume that on 11 September you need a full product security programme. You don't, and
being precise about that is the difference between analysis and marketing.

Article 71 staggers the dates. Chapter IV, on notification of conformity assessment
bodies, applied from 11 June 2026. Article 14 applies from 11 September 2026. Everything
else — the essential cybersecurity requirements, the vulnerability handling process, CE
marking, technical documentation — applies from 11 December 2027.

In September you owe reporting. Not a programme. Reporting.

There is one detail here that gets missed, and it is the reason "my plugin has been out
for years" is not a defence. Article 69(2) grandfathers products placed on the market
before 11 December 2027 out of the regulation's requirements unless they undergo a
substantial modification. Article 69(3) then carves Article 14 straight back out of
that: by way of derogation, the reporting obligations "shall apply to all products with
digital elements that fall within the scope of this Regulation that have been placed on
the market before 11 December 2027". Everything you have already shipped is covered for
reporting purposes.

Reports go simultaneously to the CSIRT designated as coordinator for your main
establishment and to ENISA, through the single reporting platform established under
Article 16. ENISA's own guidance, updated in early August 2026, confirms the platform
becomes operational on 11 September and describes a user registration step for
authorised representatives that has to happen before you can submit anything. At the
time of writing the platform is not yet live. That is not a reason to wait; it is a
reason to find the registration materials now, because the first time you use an
unfamiliar reporting system should not be inside a 24-hour clock.

The other thing worth knowing is that the CRA created a lighter category. Article 3(14)
defines an _open-source software steward_ as a legal person, other than a manufacturer,
whose purpose is to systematically provide sustained support for the development of
specific free and open-source products. Stewards get a substantially reduced regime: a
cybersecurity policy, cooperation with authorities, and no penalties for infringement.
Foundations and industry consortia are the intended shape of this. If you are a company
selling a pro tier, you are not a steward, and anyone telling you otherwise is selling
you comfort.

## What CRA compliance looks like from the inside

I worked on CRA preparation with ecosystem vendors while I was at Patchstack. At a
basic level, and I want to be accurate about that rather than inflate it: helping
vendors understand which obligations were coming and what the first controls looked
like, not running their compliance programmes.

The first control is a vulnerability disclosure channel. I should disclose that
Patchstack sells one, so take the recommendation as structural rather than commercial:
what the regulation needs is a route by which someone who finds a problem in your
product can tell you, and a `security.txt` file plus a monitored mailbox satisfies it
as surely as a managed platform does. Without that route, the 24-hour obligation is
theoretical. You cannot report what nobody has a way to tell you. I've spent a fair
amount of time on the receiving end of that pipeline, and
[walked through the whole lifecycle in a talk last year](/speaking/valencia-meetup-2025-ciclo-vida-vulnerabilidades/)
— the failure mode is almost never the fix. It's the gap before anyone knows.

The second control is knowing what your product is made of. The dependency half of this
is close to solved: Dependabot and its equivalents will tell you when something in your
`composer.json` or `package.json` has a known vulnerability, and wiring that into CI is
an afternoon of work.

The hard half is your own code, where there is no button to press. At Patchstack I led
an AI-assisted vulnerability discovery system that reached production and a public
beta. It was built as a multi-tier arrangement of frontier models set against each
other, a junior analyst pass and a senior analyst review. It was withdrawn afterwards.
It is not available today.

It was not withdrawn because it failed. It was withdrawn because the release cadence of
the frontier models made maintaining bespoke scaffolding on top of them uneconomic:
every new model generation obsoleted a chunk of the work that made ours distinctive.
Our one real moat was a proprietary corpus of proof-of-concept exploits deep enough to
make retrieval genuinely useful, and in the end even that didn't close the gap. My own
assessment, and I'll flag it as an assessment rather than a benchmarked claim, is that
general-purpose models now do security review at roughly that level without any of the
scaffolding.

That is the useful part for you, and it cuts against the obvious reading. When a
security vendor builds a discovery tool and then kills it because the capability
commoditised, the lesson is that _finding_ is no longer the bottleneck. Finding gets
cheaper every quarter. What has not commoditised is hearing about it in time, having
somewhere for the report to land, and being able to ship a fix and file a notification
while the clock runs.

And the honest ending. I also held the mandate to bring Patchstack itself into CRA
compliance, and I left in May 2026 without finishing it. A security vendor, with the
domain knowledge in the building and the deadline on the calendar, and it was still
unfinished. If you take one thing from my experience rather than from the text of the
regulation, take that. Compliance work loses to shipping work in every organisation
that hasn't given it a named owner and a date.

## The minimum defensible position

If the security team is you, this is the version that fits in a week:

1. Work through the five indicators above against your own project and write down the
   answer, with the date and the reasoning. If you are outside, you want the record. If
   you are inside, you want to have known it in August rather than in the middle of an
   incident.
2. Publish a disclosure route and confirm somebody reads it. `security.txt` at the
   documented location, an address that resolves to a human.
3. Identify the CSIRT designated as coordinator for your main establishment, and find
   ENISA's registration materials for the reporting platform. Do this before you need
   them.
4. Keep an inventory of what your product is built from, generated rather than
   maintained by hand.
5. Write the notification draft now. At hour 24 you want to be filling in fields, not
   deciding what tone to take.

None of that requires a budget, and that is deliberately the point. The regulation is
demanding in December 2027. In September 2026 it asks for a channel and a habit.

## Where this actually stands

The security side of this ecosystem has been talking about the CRA for a while. Oliver
Sild presented on it at WordCamp Europe 2025, Patchstack has published a compliance
guide alongside its annual data — which counted 7,966 new vulnerabilities in the
WordPress ecosystem in 2024, a 34% rise, 96% of them in plugins — and a small market of
CRA-compliance tooling for WordPress has started to appear. None of this is new
information to anyone who works on
[WordPress vulnerabilities for a living](/speaking/vienna-2024-bermuda-triangle/).

What I have not been able to find is a position from the other side: from the plugin
businesses that will be classified as manufacturers, or from the WordPress Foundation,
which on the face of Article 3(14) looks a great deal like a steward. Maybe that
conversation is happening privately. Maybe it hasn't started. Either way, the people
who will be filing the notifications are not the ones currently writing about them.

If you maintain a commercial plugin and you have read this far, the question worth your
afternoon isn't whether the CRA is proportionate. It's which of the five indicators
catches you, because in my experience it's rarely the one people expect. I'd genuinely
like to hear which one it was for you.

---

_Sources: [Regulation (EU) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng)
(Articles 2, 3, 14, 16, 69, 71 and recitals 15 and 18);
[European Commission — CRA reporting obligations](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting);
[ENISA — Single Reporting Platform](https://www.enisa.europa.eu/topics/product-security-and-certification/single-reporting-platform-srp);
[Regulation (EU) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng);
[Patchstack, State of WordPress Security 2025](https://patchstack.com/whitepaper/state-of-wordpress-security-in-2025/)._

_Disclosure: I was Head of Security at Patchstack until May 2026. This article is not
legal advice; whether a specific project falls within the CRA's scope is a legal
determination._
