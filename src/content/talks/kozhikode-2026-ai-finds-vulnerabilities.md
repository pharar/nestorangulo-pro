---
title: "We Built an AI That Finds Vulnerabilities in Plugins. So Can Everyone Else."
event: "WP Future Conclave 2026"
location: "Kozhikode, Kerala, India"
date: 2026-09-05
language: en
format: conference-talk
themes:
  - AI Security
  - Vulnerability Intelligence
  - Software Supply Chain
  - Open Source Security
  - GRC
summary: "Machine-assisted vulnerability discovery is now cheap for everyone, including attackers. Discovery is no longer the bottleneck — response is."
featured: true
draft: false
slidesUrl: https://assets.nestorangulo.pro/slides/kozhikode-2026-ai-finds-vulnerabilities-891a0069a9.pdf
eventUrl: https://events.wordpress.org/kozhikode/2026/wp-future/
sourceNote: "Delivered remotely to the venue in Kozhikode."
---

A field report from building a system that hunts vulnerability variants in WordPress plugins: what it actually was (a retrieval layer over a corpus of real vulnerabilities and proof-of-concepts, structured prompting, adversarial review, and a human at the end), what worked, and what it never managed to do. The honest conclusion is the uncomfortable one — nothing in that stack is exclusive, so anyone can build it, attackers included.

That changes which question matters. With more than 4,100 CVEs published in the WordPress ecosystem in 2024 alone, discovery has stopped being the bottleneck; response is. The talk reframes the problem around three clocks — how fast you *know*, how fast you *decide*, and how fast you *ship* — and lays out five practices that move them: know what you ship, keep a door open for reporters, watch your dependencies, declare a support period, and be able to release quickly.

It closes on why this stops being optional: the EU Cyber Resilience Act's reporting duties, with their 24-hour, 72-hour and 14-day clocks, and the way European rules travel through contracts into markets that never voted on them.
