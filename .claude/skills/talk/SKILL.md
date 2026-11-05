---
name: talk
description: Add, update, feature or host the slides of a talk on nestorangulo.pro — verify the talk's facts, create the card, process and upload the deck PDF to R2, wire the slides link, decide featuring, and prepare the PR. Use for "add this talk", "host these slides", "publish the deck", "feature this talk", "new WordCamp talk", "add the video", "add the deck", or when a talk PPTX has just been exported to PDF. Spanish — sube este PDF a speaking, monta esta charla, destaca esta charla, añade el vídeo, publica las diapositivas.
---

# Talk

Everything about a talk on the Speaking section: the card in `src/content/talks/`, its
deck on Cloudflare R2, whether it sits on the featured shelf.

The mechanics are in `npm run talk -- <verb>` (run it without a verb for the list; every
verb that writes takes `--dry-run`). This file is the order of operations and the
judgement the script cannot make. The reasons behind the rules are in
[documentation/SPEAKING.md](../../../documentation/SPEAKING.md) (card conventions) and
[documentation/SLIDES-R2.md](../../../documentation/SLIDES-R2.md) (R2). The schema is
`src/content.config.ts` and the themes are `src/data/themes.ts`; read them, do not
restate them.

## 0. Honesty gate (non-negotiable, do this first)

Never invent or approximate a talk's `title`, `date`, `event` or abstract. This is the
first brand rule.

- **Verify every field from a real source**: the event's own page (wordcamp.org,
  events.wordpress.org, wordfest.live, wpsessions.com…), wordpress.tv, the YouTube
  premiere date, or a calendar invite. Check the links the owner gives; do not derive
  from file names. The deck's own title slide is a valid source for the title.
- **Session day, not upload date.** WordCamps schedule talks on the session day (usually
  Saturday), not the Contributor or Workshop day. A file's modified date and a YouTube
  upload date are not the talk date.
- **Unverifiable means draft and empty.** Set `draft: true` and leave the field or
  abstract empty; empty beats fabricated. Never write a `summary` or body that the model
  made up.
- **Never delivered means no entry at all**, and the venue is not cited anywhere.
- **Paraphrase official abstracts** into the owner's own words; do not paste third-party
  copy verbatim.
- **A talk given days ago has no video and no public slides yet.** That is normal and
  never a reason to hold the card back: publish without `videoUrl` and add it later.
  Never set `slidesUrlExt` to a private edit URL (a Google Slides `/edit` link).

Then state back to the owner the source of each field (title, event with year, location,
date, language, format, themes, abstract) and wait for agreement. If the talk already has
a card, you are only adding or replacing the deck: keep the verified metadata there.

Remote delivery to a physical event: `location` is the venue's city and country, plus
`sourceNote: "Delivered remotely to the venue in <city>."` Not "Online".

## 1. Isolate

Work on a branch off `origin/main` in a worktree, as AGENTS.md says; name it
`content/<slug>`. A card edit and a `featured` flip belong in the same branch.

## 2. The card

New talk: `npm run talk -- new …` with only verified values. It creates a draft with no
summary and no themes. Then, with the owner, fill themes (from `src/data/themes.ts`) and
the abstract, and un-draft by hand once everything is verified.

Slug: `<city-or-venue>-<year>-<short-topic>`, as the existing files
(`vienna-2024-bermuda-triangle`, `granada-2025-coste-web-hackeada`): the host city for a
conference, `webinar-<host>-<topic>` for a webinar.

Video later: `npm run talk -- video <slug> <url>`.

The English card: a talk delivered in Spanish carries an English translation of the
abstract, the standard accessibility blockquote (copy it from
`granada-2025-coste-web-hackeada.md` rather than retyping it), then `**Original (Español)**`
followed by the original. A talk delivered in English carries the abstract only.

The Spanish page: every published talk also needs `src/content/talks-es/<slug>.md`, its
Spanish overlay. Its shape is the `i18n` skill's (New talk); do not restate it here.
`check:content` fails on a published talk without one, so write it before un-drafting.

## 3. The deck

Order matters; each step is a verb.

1. `deck prepare` (compress only if it helps, metadata, hash-name). It needs
   `--event-short`, which is judgement, derived from the card's `event` for the PDF
   title only:
   - drop a marketing suffix after a colon: "WordPress Day Granada 2025: Seguridad
     Digital 360" becomes "WordPress Day Granada 2025";
   - strip vendor framing in parentheses: "Patchstack × Libyan Spider (webinar)"
     becomes "Patchstack × Libyan Spider";
   - keep the year already in the name; add "Month YYYY" (from `date`) only for events
     that recur within a year, or whose name has no year (webinars, interviews):
     "WordPress Meetup Valencia" on 2025-04-01 becomes "WordPress Meetup Valencia, April
     2025". Annual WordCamps get no month;
   - a colon inside the talk title stays; the rules apply to the event string only.
2. Report the sizes and which variant was kept. Metadata-only is a fine outcome; say so.
   If fine text or code looks blurred after a real shrink, flag it for a spot-check. Do
   not try to rescue a broken, huge export by downsampling: that needs a fresh export.
3. `deck upload` prints a plan. **Run it with `--yes` only on the owner's explicit
   go-ahead: it writes to production.** Without Cloudflare auth on the machine (probe
   it, see AGENTS.md "Environments"), the upload is the owner's step: leave the
   hash-named file ready and hand over the exact command from the plan, flag included,
   with the path pasted in full.
4. `deck link <slug> <url>` once the object is live.

**Ordering:** the R2 object must be live before the PR merges. A merged card whose
`slidesUrl` has no object puts a 404 button into production; if the merge happened first
anyway, say so and treat the upload as urgent.

The dual link: `slidesUrl` is always the self-hosted R2 copy; `slidesUrlExt` keeps the
official event or Slideshare/Drive copy, if public, so provenance survives. The detail
page renders one "View slides ↗" button for `slidesUrl` and, only when `slidesUrlExt`
exists, a muted "Slides also available on the event site ↗" note under it. Never offer a
second button. An entry with only `slidesUrlExt` gets the single button pointing there.

## 4. Featuring: propose a judgement, then confirm

The shelf (`npm run talk -- shelf`) is at the top of `/speaking` and holds six. Come
with a recommendation and its reasoning; ask the owner to confirm rather than asking
cold. Adding one usually means demoting one (`feature … --swap`).

Judge the substance of the talk, in this order:

1. **Systemic or procedural?** Vulnerability economics, AI-assisted discovery,
   regulation (CRA/NIS2), supply chain, vulnerability lifecycle, what a breach costs a
   business travel to any audience. A step-by-step "how to clean a hacked site"
   walkthrough does not.
2. **Venue tier**: flagship conference > regional conference > vendor webinar > local
   meetup. A weaker venue needs a stronger idea to stay featured.
3. **Recency and non-duplication.** Two featured talks on the same ground is the
   strongest demotion signal: demote the older or weaker-venue one. Age alone does not
   disqualify an idea nothing has superseded.
4. **Language mix.** The shelf should not be all Spanish or all English; Spanish talks
   at good venues belong on it.

**WordPress is not a disqualifier.** The owner is displacing the WordPress-security label
gradually and selectively, not renouncing it: it is where most of his working life
happened and it is real proof of depth. Never treat "it's a WordPress talk" as a reason
to demote, or to hesitate before featuring. The line is topic _level_, not ecosystem: a
WordPress talk about vulnerability economics, regulation or AI is featured material; a
WordPress talk that is a remediation walkthrough is archive material. The same test
applies to any other ecosystem. Erasing the WordPress footprint is not the goal and
never was.

When recommending a demotion, name the criterion that decided it (duplication, venue
tier, procedural topic) and offer the runner-up, so the owner can overrule with context
you do not have.

**Covers.** A featured talk with a `cover` renders as an image card; without one it is
the same text-only card as the archive. Text-only is the house style, so do not block
featuring on a stage photo; offer to wire one if the owner has it. Covers live under
`src/` (never `public/`: Astro's `image()` only processes assets under `src/`), with an
honest `coverAlt` describing what is actually in the photo.

## 5. Verify, commit, hand over

- `npm run gate`, then `npm run preview` on the build (not `npm run dev`: CSP and headers
  differ there). If this shell cannot build, say so plainly and name it the owner's
  step; never claim a build passed.
- `npm run talk -- deck verify <slug>`: the only proof the upload landed.
- On the built `/speaking/<slug>/`: a single "View slides ↗", the provenance note only
  when `slidesUrlExt` exists, no dangling empty note. On `/speaking/`: the featured
  section shows the intended set, and only that set.
- The page is in the built sitemap (a non-draft talk is added by the build). The PDF is
  on another origin and is deliberately not.
- Do not hardcode a talk count anywhere; it is derived.
- Commit only the files this task touched (the card, plus any `featured` flip; the schema
  only if a needed field is missing, which is normally not the case), conventional message, e.g.
  `content(speaking): host <slug> deck on R2` (add `, un-draft` or `+ featured` as apt).
- No push, PR or merge without the owner's confirmation. Cloudflare publishes `main` on
  merge whether or not CI passed, so the PR is what protects production.

Finish by telling the owner what changed, the source of each verified field, the state
of the R2 object, and any step left for them.
