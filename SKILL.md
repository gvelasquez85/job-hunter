---
name: job-hunter
description: Analyze a person's CV/resume and run an AI-powered remote job search, then rank matches and deliver an interactive tracker. Use this skill whenever the user uploads or points to a CV/resume and wants to find jobs, asks to "search for jobs", "find me a role", "match me to openings", "build a job tracker", or mentions looking for work (remote or otherwise), even if they don't explicitly say the word "skill". Also use it when the user wants to refine an existing job search, add openings to a tracker, or re-score opportunities against their profile.
---

# Job Hunter

Turn a CV into a running, self-service job search: read the CV, build a search profile, search real job portals on the web, score each opening against the profile, and hand the user an interactive tracker artifact they can keep using.

## The flow at a glance

1. **Ingest the CV** — read the uploaded file and extract a structured profile.
2. **Draft the search profile** — a short, editable description of what the person wants (and does not want).
3. **Confirm with the user** — show the profile and the portal list, let them adjust before searching.
4. **Search** — run several targeted web searches across the selected portals.
5. **Score & present** — rank openings by fit and generate the interactive tracker artifact.

Work through these in order, but stay flexible: if the user already has a profile written, skip to searching; if they just want to re-score, skip to step 5.

---

## Step 1 — Ingest the CV

The user will provide a CV as `.pdf`, `.docx`, `.md`, or plain text.

- For `.docx`, read `references/reading-cvs.md` for the extraction approach.
- For `.pdf`, extract the text (use the environment's PDF reading tooling).
- If the CV is already visible in context as text, use it directly — don't re-read from disk.

Extract into a structured summary: **years of experience, seniority, core skills/stack, domains, languages spoken, location, and any stated preferences** (remote, salary, industries to avoid). Keep it factual — do not inflate.

If no CV is provided, ask the user to paste their background or upload a file. Do not fabricate a profile.

## Step 2 — Draft the search profile

Write a concise search profile (roughly 4–8 sentences) in two parts:

- **Seeking**: role types, seniority, work mode (remote/hybrid), regions, and the strongest 2–3 angles from their CV that make them competitive.
- **Not seeking**: role types or contexts to exclude (e.g., pure research, on-site, unrelated domains).

Write it in the person's own language (match the CV's language unless they ask otherwise). This profile is what drives the search, so make it specific and honest about their level.

## Step 3 — Confirm profile and portals

Show the user the drafted profile and the default portal list (see `references/portals.md`). Ask them to confirm or edit both before searching. Respect two things:

- **Free-to-apply only unless the user opts in.** Some portals charge a fee to apply (e.g., RemoteRocketship). Mark these clearly and leave them **off by default**.
- **Region eligibility.** Flag portals or roles that may require residency/work authorization the user may not have.

## Step 4 — Search the web

Run **4–8 targeted searches**, mixing English and Spanish (or the user's languages), and include portal names in some queries (e.g., `AI automation engineer remote site:weworkremotely.com`). Prioritize:

- Roles matching the "seeking" angles
- Openings actually hosted on the selected portals
- Recent postings (filter out anything clearly stale)

Read `references/scoring.md` for how to search efficiently and avoid dead links. Quality over quantity — 5–8 strong matches beat 20 weak ones.

## Step 5 — Score and present

For each opening, assign a **fit score of 1–5** using the rubric in `references/scoring.md`. Capture: title, company, location/mode, salary (if shown), fit score, source portal, direct URL, and a one-sentence reason it fits.

De-duplicate against anything the user already has, then deliver results **as the interactive tracker artifact**. Read `references/tracker-template.md` for how to generate it — it is a self-contained React artifact with persistent storage, status tracking, an editable search profile, a portal selector, and a built-in "search again" agent so the user can keep hunting on their own after this session.

Always end by pointing the user to the tracker and reminding them to verify each link before applying (postings close).

---

## Guardrails

- **Never invent openings, companies, or URLs.** Every opening must come from a real search result. If a search returns nothing, say so.
- **Be honest about fit.** Do not score everything a 5. A useful tracker is discriminating.
- **Respect cost and eligibility.** Don't push paid portals or roles the user can't legally take without flagging it.
- **The person owns decisions.** Present and rank; let them choose what to pursue.
