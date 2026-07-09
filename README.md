# Job Hunter — a Claude Skill

Turn a CV into a running, self-service job search. **Job Hunter** is an [Agent Skill](https://www.anthropic.com/news/skills) for Claude that reads your résumé, builds a search profile, searches real job portals, scores each opening against your background, and hands you an interactive tracker you can keep using on your own.

## What it does

1. **Reads your CV** (`.pdf`, `.docx`, `.md`, or pasted text) and extracts a structured profile.
2. **Drafts a search profile** — what you're looking for and what to avoid — in your own language.
3. **Confirms with you** — you review the profile and the list of job portals before anything runs.
4. **Searches the web** across free job portals (paid ones are off by default).
5. **Scores and delivers** an interactive tracker: fit scores, status tracking, notes, and a built-in "search again" agent so you can keep hunting after the first session.

## How to use it

Once installed, just talk to Claude naturally:

> "Here's my CV — help me find remote AI roles."

Claude will pick up the skill, walk you through the profile, and produce your tracker.

## Installing

**In Claude Code:** clone this repo into your skills directory (or point Claude Code at it) so the `job-hunter/` folder with its `SKILL.md` is discoverable.

```bash
git clone https://github.com/gvelasquez85/job-hunter.git
```

**In Claude.ai / Claude Desktop:** upload the skill folder per the current Skills instructions in the product.

## What's inside

```
job-hunter/
├── SKILL.md                        # the skill: workflow + guardrails
├── references/
│   ├── reading-cvs.md              # how to extract profiles from CVs
│   ├── portals.md                  # the job portal list (free vs paid)
│   ├── scoring.md                  # search strategy + 1–5 fit rubric
│   └── tracker-template.md         # how the tracker artifact is generated
├── assets/
│   └── tracker-template.jsx        # the interactive tracker (React)
├── README.md
└── LICENSE
```

## Design principles

- **Self-service.** You run it in your own Claude; nothing is centralized.
- **Free by default.** Portals that charge a fee to apply are clearly marked and off unless you opt in.
- **Honest scoring.** The fit score is meant to discriminate — not everything is a 5.
- **No hallucinated jobs.** Every opening traces to a real search result. Verify links before applying; postings close.

## Contributing

Issues and PRs welcome — especially new portals, better scoring heuristics, and localization. This skill is open source under the MIT License.

## License

MIT — see [LICENSE](LICENSE). Provided as-is; it helps you find and organize openings but makes no guarantee about job outcomes.
