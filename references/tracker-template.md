# Generating the Tracker Artifact

The final deliverable is an interactive React artifact: a job tracker with a built-in search agent. A working template lives at `assets/tracker-template.jsx`. Use it as the base and customize it for the person.

## What the tracker does

- **Tracker tab**: cards for each opening with title, company, location, salary, a 1–5 fit bar, source, and direct link. Tapping the status pill cycles the opening through `Nueva → Por aplicar → Aplicada → Entrevista → Oferta → Descartada`. Filter chips by status. Per-card notes. All state persists across sessions via `window.storage`.
- **Search agent tab**: an editable search profile, a portal selector (paid portals marked and off by default), and a "search now" button that calls the Anthropic API with web search to find fresh openings, filters duplicates, and lets the user add results with one tap.

## How to customize it for the person

Edit two things in the template before delivering:

1. **`DEFAULT_PROFILE`** — replace with the search profile you drafted in Step 2, in the user's language.
2. **`SEED`** — replace the array with the openings you found and scored in this session. Each entry:
   ```js
   { id: "s1", titulo: "", empresa: "", ubicacion: "", salario: "",
     fit: 4, fuente: "", url: "", nota: "", status: "Nueva" }
   ```
   Mark the strongest matches as `"Por aplicar"` and the rest as `"Nueva"`.

Optionally adjust the `PORTALS` array if the user chose a custom portal set.

## Technical notes (keep these intact)

- The artifact uses `window.storage` for persistence — **do not** substitute `localStorage`/`sessionStorage`; they are not supported in the artifact runtime.
- The search agent calls the Anthropic API at `https://api.anthropic.com/v1/messages` with the `web_search_20250305` tool. No API key is passed — the runtime handles it. The model is not hardcoded: on load, the artifact queries `GET https://api.anthropic.com/v1/models` to list what the running account can actually call, and presents a dropdown (falling back to `FALLBACK_MODELS` if that call fails). `max_tokens` defaults to 4000 and is adjustable via the token-budget slider (1000–8000).
- The API response is parsed tolerantly: it first tries the full JSON array, then salvages individual objects, then (if needed) makes a second no-search call to reformat prose into JSON, and finally preserves the raw text so the user never loses what the agent found.
- Keep `max_tokens` at 4000 or higher. The original bug that dropped all results was a 1000-token cap truncating the JSON.

## Delivering

Create the artifact as a `.jsx` file, present it, and give a short plain-language tour: the two tabs, how status cycling works, that everything saves automatically, and that they can keep searching on their own with the agent. Remind them to verify links before applying.
