import { useState, useEffect, useRef } from "react";

// ---------- Design tokens ----------
const C = {
  bg: "#FAFAF8",
  card: "#FFFFFF",
  ink: "#1C2430",
  navy: "#1F3A5F",
  slate: "#6B7686",
  line: "#E5E4E0",
  green: "#2E7D5B",
  amber: "#B07A1E",
  red: "#A33B3B",
  navySoft: "#EEF2F7",
};

const STATUSES = ["Nueva", "Por aplicar", "Aplicada", "Entrevista", "Oferta", "Descartada"];
const STATUS_COLOR = {
  "Nueva": { bg: "#EEF2F7", fg: C.navy },
  "Por aplicar": { bg: "#FBF4E4", fg: C.amber },
  "Aplicada": { bg: "#E9F3EE", fg: C.green },
  "Entrevista": { bg: "#1F3A5F", fg: "#FFFFFF" },
  "Oferta": { bg: "#2E7D5B", fg: "#FFFFFF" },
  "Descartada": { bg: "#F3F1EE", fg: "#9AA1AB" },
};

const STORAGE_KEY = "jobtracker-v1";

// Used only if the account running this artifact can't be queried for its model list.
const FALLBACK_MODELS = [
  { id: "claude-sonnet-5", display_name: "Claude Sonnet 5" },
  { id: "claude-opus-4-8", display_name: "Claude Opus 4.8" },
  { id: "claude-haiku-4-5-20251001", display_name: "Claude Haiku 4.5" },
];

const DEFAULT_PROFILE = `Perfil: profesional senior (X+ años) que construye soluciones end-to-end con IA. Stack: [tu stack — lenguajes, plataformas, herramientas]. Idiomas: [tus idiomas y nivel].
Busco: roles 100% remotos ([tus regiones]) de [tipos de rol que buscas]. No busco: [roles o contextos a excluir].`;

const PORTALS = [
  { id: "linkedin", label: "LinkedIn Jobs", hint: "linkedin.com/jobs", paid: false, on: true },
  { id: "weworkremotely", label: "We Work Remotely", hint: "weworkremotely.com", paid: false, on: true },
  { id: "remotive", label: "Remotive", hint: "remotive.com", paid: false, on: true },
  { id: "nodesk", label: "NoDesk", hint: "nodesk.co", paid: false, on: true },
  { id: "wellfound", label: "Wellfound (AngelList)", hint: "wellfound.com", paid: false, on: true },
  { id: "workingnomads", label: "Working Nomads", hint: "workingnomads.com", paid: false, on: true },
  { id: "getonboard", label: "Get on Board", hint: "getonbrd.com · LATAM", paid: false, on: true },
  { id: "torre", label: "Torre.ai", hint: "torre.ai · LATAM", paid: false, on: true },
  { id: "computrabajo", label: "Computrabajo", hint: "co.computrabajo.com · LATAM", paid: false, on: true },
  { id: "elempleo", label: "elempleo", hint: "elempleo.com · Colombia", paid: false, on: true },
  { id: "upwork", label: "Upwork", hint: "upwork.com · freelance", paid: false, on: true },
  { id: "ycombinator", label: "Y Combinator Jobs", hint: "ycombinator.com/jobs", paid: false, on: false },
  { id: "builtin", label: "Built In", hint: "builtin.com", paid: false, on: false },
  { id: "himalayas", label: "Himalayas", hint: "himalayas.app", paid: false, on: false },
  { id: "remoteok", label: "Remote OK", hint: "remoteok.com", paid: false, on: false },
  { id: "remoterocketship", label: "RemoteRocketship", hint: "requiere pago para aplicar", paid: true, on: false },
];

const SEED = [
  { id: "s1", titulo: "Ejemplo: AI Automation Engineer", empresa: "Empresa Ejemplo S.A.", ubicacion: "Remoto · LATAM", salario: "", fit: 5, fuente: "We Work Remotely", url: "https://weworkremotely.com/", nota: "Ejemplo de oferta con alto ajuste al perfil — reemplaza esto con resultados reales de tu búsqueda.", status: "Por aplicar" },
  { id: "s2", titulo: "Ejemplo: Data & AI Solutions Architect", empresa: "Otra Empresa Inc.", ubicacion: "Remoto · Global", salario: "", fit: 4, fuente: "Remotive", url: "https://remotive.com/", nota: "Ejemplo de oferta con ajuste moderado — reemplaza con resultados reales de tu búsqueda.", status: "Nueva" },
  { id: "s3", titulo: "Ejemplo: Automation Specialist (freelance)", empresa: "Cliente Freelance", ubicacion: "Remoto · proyectos", salario: "", fit: 3, fuente: "Upwork", url: "https://www.upwork.com/", nota: "Ejemplo de oferta como referencia de piso de mercado — reemplaza con resultados reales de tu búsqueda.", status: "Nueva" },
];

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

async function loadState() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) { /* first run */ }
  return { jobs: SEED, profile: DEFAULT_PROFILE, lastSearch: null, portals: PORTALS.filter((p) => p.on).map((p) => p.id), maxTokens: 4000, model: null };
}
async function saveState(state) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}

function FitBar({ n }) {
  return (
    <div style={{ display: "flex", gap: 3 }} aria-label={`Ajuste ${n} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{
          width: 14, height: 4, borderRadius: 2,
          background: i <= n ? C.navy : C.line,
        }} />
      ))}
    </div>
  );
}

function StatusPill({ status, onNext }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR["Nueva"];
  return (
    <button onClick={onNext} title="Toca para cambiar estado" style={{
      background: s.bg, color: s.fg, border: "none", cursor: "pointer",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      padding: "4px 10px", borderRadius: 99, textTransform: "uppercase",
    }}>{status}</button>
  );
}

export default function JobAgent() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("tracker");
  const [filter, setFilter] = useState("Todas");
  const [searching, setSearching] = useState(false);
  const [log, setLog] = useState([]);
  const [found, setFound] = useState([]);
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const emptyManual = { titulo: "", empresa: "", ubicacion: "", salario: "", fit: 3, fuente: "", url: "", nota: "" };
  const [manual, setManual] = useState(emptyManual);
  const [models, setModels] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    loadState().then((s) => {
      if (!s.portals) s.portals = PORTALS.filter((p) => p.on).map((p) => p.id);
      if (!s.maxTokens) s.maxTokens = 4000;
      if (!s.model) s.model = null;
      setState(s);
    });
  }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  // Ask the account running this artifact which models it can actually call.
  useEffect(() => {
    fetch("https://api.anthropic.com/v1/models")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data && data.data) && data.data.length > 0 ? data.data : FALLBACK_MODELS;
        setModels(list);
      })
      .catch(() => setModels(FALLBACK_MODELS));
  }, []);

  useEffect(() => {
    if (state && !state.model && models.length > 0) {
      const preferred = models.find((m) => /sonnet/i.test(m.id)) || models[0];
      persist({ ...state, model: preferred.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, models]);

  if (!state) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "ui-sans-serif, system-ui", color: C.slate }}>
      Cargando tu tracker…
    </div>
  );

  const persist = (next) => { setState(next); saveState(next); };

  const cycleStatus = (id) => {
    const jobs = state.jobs.map((j) => {
      if (j.id !== id) return j;
      const idx = STATUSES.indexOf(j.status);
      return { ...j, status: STATUSES[(idx + 1) % STATUSES.length] };
    });
    persist({ ...state, jobs });
  };

  const removeJob = (id) => persist({ ...state, jobs: state.jobs.filter((j) => j.id !== id) });

  const updateNote = (id, nota) => {
    persist({ ...state, jobs: state.jobs.map((j) => (j.id === id ? { ...j, nota } : j)) });
  };

  const addFound = (job) => {
    const newJob = { ...job, id: uid(), status: "Nueva" };
    persist({ ...state, jobs: [newJob, ...state.jobs] });
    setFound(found.filter((f) => f !== job));
  };

  const submitManual = () => {
    if (!manual.titulo.trim() || !manual.empresa.trim()) return;
    const newJob = {
      ...manual,
      titulo: manual.titulo.trim(),
      empresa: manual.empresa.trim(),
      fit: Math.max(1, Math.min(5, Number(manual.fit) || 3)),
      fuente: manual.fuente.trim() || "Manual",
      id: uid(),
      status: "Nueva",
    };
    persist({ ...state, jobs: [newJob, ...state.jobs] });
    setManual(emptyManual);
    setShowManual(false);
  };

  const pushLog = (m) => setLog((l) => [...l, m]);

  const togglePortal = (id) => {
    const has = state.portals.includes(id);
    const portals = has ? state.portals.filter((p) => p !== id) : [...state.portals, id];
    persist({ ...state, portals });
  };

  // Robust wrapper around the Anthropic API: validates HTTP status, guards
  // against non-JSON bodies, retries transient failures, and surfaces clear errors.
  const callAPI = async (payload, onRetry) => {
    const attempts = 3;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      let response;
      try {
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (netErr) {
        lastErr = new Error("No se pudo conectar con el servicio.");
        if (i < attempts - 1) {
          if (onRetry) onRetry(i + 1);
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
          continue;
        }
        throw new Error("No se pudo conectar tras varios intentos. Recarga el artifact e intenta de nuevo; si sigue, prueba en una pestaña sin bloqueadores.");
      }

      const raw = await response.text();

      // Retry once on transient server-side statuses
      if ((response.status === 429 || response.status >= 500) && i < attempts - 1) {
        lastErr = new Error(`HTTP ${response.status}`);
        if (onRetry) onRetry(i + 1);
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch (parseErr) {
        throw new Error(
          `Respuesta inesperada del servicio (${response.status}). ` +
          (raw ? `Detalle: ${raw.slice(0, 160)}` : "Sin cuerpo de respuesta.")
        );
      }

      if (!response.ok || data.error) {
        const msg = (data.error && (data.error.message || data.error.type)) || `HTTP ${response.status}`;
        throw new Error(`El servicio devolvió un error: ${msg}`);
      }
      if (!Array.isArray(data.content)) {
        throw new Error("La respuesta no trae contenido procesable. Intenta de nuevo.");
      }
      return data;
    }
    throw lastErr || new Error("Error de conexión.");
  };

  // Tolerant extraction of an array of job objects from arbitrary model text
  const extractJobs = (text) => {
    if (!text) return [];
    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    // First try: the whole bracketed array
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(clean.slice(start, end + 1)); } catch (e) { /* fall through */ }
    }
    // Second try: salvage individual {...} objects that carry a "titulo"
    const objs = [];
    const re = /\{[^{}]*"titulo"[^{}]*\}/g;
    let m;
    while ((m = re.exec(clean)) !== null) {
      try { objs.push(JSON.parse(m[0])); } catch (e) { /* skip broken */ }
    }
    return objs;
  };

  const runAgent = async () => {
    setSearching(true); setError(""); setFound([]); setLog([]);
    pushLog("Iniciando búsqueda con tu perfil…");
    const existing = state.jobs.map((j) => `${j.titulo} @ ${j.empresa}`).join("; ");
    const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    const chosen = PORTALS.filter((p) => state.portals.includes(p.id));
    const portalList = chosen.map((p) => p.label + " (" + p.hint.replace(/ ·.*/, "") + ")").join(", ");
    const model = state.model || FALLBACK_MODELS[0].id;

    if (chosen.length === 0) {
      setError("Selecciona al menos un portal antes de buscar.");
      setSearching(false);
      return;
    }

    const prompt = `Eres un agente de búsqueda de empleo. Fecha: ${today}.

${state.profile}

PORTALES A PRIORIZAR (busca ofertas alojadas en estos sitios; son todos gratuitos para aplicar): ${portalList}.

TAREA: usa la búsqueda web (haz entre 4 y 8 búsquedas dirigidas, combinando términos en inglés y español, e incluye el nombre del portal en algunas queries, p.ej. "AI automation engineer remote site:weworkremotely.com"). Encuentra entre 5 y 8 ofertas REALES y VIGENTES que encajen con el perfil y que estén publicadas en los portales priorizados. Enfócate en calidad sobre cantidad.

YA ESTÁN EN EL TRACKER (no las repitas): ${existing}

FORMATO DE SALIDA — muy importante: después de tus búsquedas, tu ÚLTIMO mensaje debe ser SÓLO un array JSON válido, empezando con [ y terminando con ]. Sin texto antes ni después, sin markdown. Máximo 8 elementos. Cada elemento debe ser compacto:
{"titulo":"","empresa":"","ubicacion":"","salario":"","fit":4,"fuente":"","url":"","nota":""}
Donde fit es 1-5 (ajuste al perfil), fuente es el portal, url es el link directo, y nota es UNA frase corta.`;

    try {
      pushLog(`Buscando en ${chosen.length} portal(es) seleccionado(s)…`);
      pushLog(`Presupuesto de respuesta: ${state.maxTokens} tokens.`);
      pushLog("El agente está buscando en la web (esto puede tardar 1-2 minutos)…");

      const data = await callAPI({
        model,
        max_tokens: state.maxTokens,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }, (n) => pushLog(`Reintentando conexión (intento ${n + 1})…`));

      const searches = (data.content || []).filter((b) => b.type === "server_tool_use" || b.type === "tool_use").length;
      if (searches > 0) pushLog(`Realizó ${searches} búsqueda(s) en la web.`);

      const stop = data.stop_reason;
      if (stop === "max_tokens") {
        pushLog("⚠ La respuesta se cortó por límite de tokens. Sube el presupuesto para resultados completos.");
      }

      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      pushLog("Procesando resultados…");
      let arr = extractJobs(text);

      // If parsing failed but we got prose, ask the model to reformat (no search, cheap)
      if (arr.length === 0 && text.trim().length > 0) {
        pushLog("Reformateando la respuesta del agente…");
        const fixData = await callAPI({
          model,
          max_tokens: state.maxTokens,
          messages: [{ role: "user", content: `Convierte el siguiente texto en un array JSON válido de ofertas de empleo. Responde SÓLO con el array [ ... ], sin texto adicional. Cada objeto: {"titulo":"","empresa":"","ubicacion":"","salario":"","fit":4,"fuente":"","url":"","nota":""}.\n\nTEXTO:\n${text}` }],
        });
        const fixText = (fixData.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
        arr = extractJobs(fixText);
      }

      if (arr.length === 0) {
        // Preserve whatever the agent said so the user can see it
        persist({ ...state, lastSearch: new Date().toISOString(), lastRaw: text.slice(0, 4000) || "(el agente no devolvió texto)" });
        pushLog("No se pudieron estructurar resultados. Abajo puedes ver el texto crudo que trajo el agente.");
        setError("El agente buscó pero no devolvió un formato limpio. Revisa el texto crudo o intenta de nuevo.");
        return;
      }

      const known = new Set(state.jobs.map((j) => norm(j.titulo) + "|" + norm(j.empresa)));
      const fresh = arr.filter((j) => j && j.titulo && !known.has(norm(j.titulo) + "|" + norm(j.empresa)));

      pushLog(`Encontró ${arr.length} oferta(s); ${fresh.length} nueva(s) tras filtrar duplicados.`);
      setFound(fresh);
      persist({ ...state, lastSearch: new Date().toISOString(), lastRaw: null });
      if (fresh.length === 0) pushLog("Nada nuevo hoy. Vuelve a intentarlo mañana o ajusta tu perfil/portales.");
    } catch (e) {
      setError(e.message || "Error inesperado");
      pushLog("La búsqueda falló: " + (e.message || ""));
    } finally {
      setSearching(false);
    }
  };

  const jobs = filter === "Todas" ? state.jobs : state.jobs.filter((j) => j.status === filter);
  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: state.jobs.filter((j) => j.status === s).length }), {});
  const active = state.jobs.filter((j) => j.status !== "Descartada").length;

  const font = "'Avenir Next', 'Segoe UI', ui-sans-serif, system-ui, sans-serif";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, color: C.ink }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: C.slate, textTransform: "uppercase" }}>
            Búsqueda de empleo · IA & Automatización
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px", letterSpacing: "-0.01em" }}>
            Radar de oportunidades
          </h1>
          <div style={{ fontSize: 13, color: C.slate }}>
            {active} oportunidades activas · {counts["Aplicada"] + counts["Entrevista"] + counts["Oferta"]} en proceso
            {state.lastSearch && <> · última búsqueda: {new Date(state.lastSearch).toLocaleDateString("es-CO")}</>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.line}` }}>
          {[["tracker", "Tracker"], ["agente", "Agente de búsqueda"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 14px", fontSize: 14, fontFamily: font,
              fontWeight: tab === k ? 700 : 500,
              color: tab === k ? C.navy : C.slate,
              borderBottom: tab === k ? `2px solid ${C.navy}` : "2px solid transparent",
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {tab === "tracker" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {["Todas", ...STATUSES].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  fontSize: 12, padding: "5px 11px", borderRadius: 99, cursor: "pointer", fontFamily: font,
                  border: `1px solid ${filter === f ? C.navy : C.line}`,
                  background: filter === f ? C.navy : C.card,
                  color: filter === f ? "#fff" : C.slate, fontWeight: 600,
                }}>
                  {f}{f !== "Todas" ? ` · ${counts[f]}` : ""}
                </button>
              ))}
            </div>

            {/* Add manual */}
            <div style={{ marginBottom: 16 }}>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} style={{
                  background: C.card, border: `1px dashed ${C.navy}`, color: C.navy, cursor: "pointer",
                  borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: font, width: "100%",
                }}>+ Agregar oferta manualmente</button>
              ) : (
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, marginBottom: 12 }}>
                    Nueva oferta manual
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["titulo", "Cargo *", "Ej. AI Automation Engineer"],
                      ["empresa", "Empresa *", "Ej. Nombre de la empresa"],
                      ["ubicacion", "Ubicación / modo", "Ej. Remoto · Colombia"],
                      ["salario", "Salario (opcional)", "Ej. $4,000 USD/mes"],
                      ["fuente", "Fuente / portal", "Ej. LinkedIn, elempleo"],
                      ["url", "Link a la oferta", "https://…"],
                    ].map(([k, label, ph]) => (
                      <div key={k} style={{ gridColumn: (k === "url" || k === "nota") ? "1 / -1" : "auto" }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>{label}</label>
                        <input
                          value={manual[k]}
                          onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
                          placeholder={ph}
                          style={{
                            width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13,
                            border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", color: C.ink, background: C.bg,
                          }}
                        />
                      </div>
                    ))}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Nota (opcional)</label>
                      <textarea
                        value={manual.nota}
                        onChange={(e) => setManual({ ...manual, nota: e.target.value })}
                        rows={2}
                        placeholder="Por qué encaja, contacto, próximos pasos…"
                        style={{
                          width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13,
                          border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", color: C.ink, background: C.bg, resize: "vertical",
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.slate }}>Ajuste:</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => setManual({ ...manual, fit: n })} style={{
                            width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 700,
                            border: `1px solid ${manual.fit >= n ? C.navy : C.line}`,
                            background: manual.fit >= n ? C.navy : C.card,
                            color: manual.fit >= n ? "#fff" : C.slate,
                          }}>{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={submitManual} disabled={!manual.titulo.trim() || !manual.empresa.trim()} style={{
                      background: (!manual.titulo.trim() || !manual.empresa.trim()) ? C.slate : C.green,
                      color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px",
                      fontSize: 13, fontWeight: 700, fontFamily: font,
                      cursor: (!manual.titulo.trim() || !manual.empresa.trim()) ? "not-allowed" : "pointer",
                    }}>Guardar oferta</button>
                    <button onClick={() => { setShowManual(false); setManual(emptyManual); }} style={{
                      background: "none", border: "none", color: C.slate, cursor: "pointer", fontSize: 13, fontFamily: font, fontWeight: 600,
                    }}>Cancelar</button>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: C.slate, alignSelf: "center" }}>* obligatorio</span>
                  </div>
                </div>
              )}
            </div>

            {/* Job cards */}
            {jobs.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: C.slate, fontSize: 14 }}>
                No hay oportunidades con este filtro. Usa el Agente de búsqueda para encontrar nuevas.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.map((j) => (
                <div key={j.id} style={{
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
                  padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{j.titulo}</div>
                      <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
                        {j.empresa} · {j.ubicacion}{j.salario ? ` · ${j.salario}` : ""}
                      </div>
                    </div>
                    <StatusPill status={j.status} onNext={() => cycleStatus(j.id)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                    <FitBar n={j.fit} />
                    <span style={{ fontSize: 11, color: C.slate }}>ajuste</span>
                    <span style={{ fontSize: 11, color: C.slate }}>· {j.fuente}</span>
                    <div style={{ flex: 1 }} />
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: C.navy, textDecoration: "none" }}>
                        Ver oferta ↗
                      </a>
                    )}
                    <button onClick={() => setExpandedId(expandedId === j.id ? null : j.id)} style={{
                      background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.slate, fontFamily: font,
                    }}>{expandedId === j.id ? "Cerrar" : "Notas"}</button>
                  </div>
                  {expandedId === j.id && (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={j.nota || ""}
                        onChange={(e) => updateNote(j.id, e.target.value)}
                        rows={3}
                        style={{
                          width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13,
                          border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, color: C.ink,
                          background: C.bg, resize: "vertical",
                        }}
                        placeholder="Notas: contacto, fecha de aplicación, próximos pasos…"
                      />
                      <button onClick={() => removeJob(j.id)} style={{
                        marginTop: 6, background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: C.red, fontFamily: font, padding: 0,
                      }}>Eliminar del tracker</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "agente" && (
          <div>
            {/* Profile */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate }}>
                  Perfil de búsqueda del agente
                </div>
                <button onClick={() => setEditingProfile(!editingProfile)} style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.navy, fontFamily: font,
                }}>{editingProfile ? "Guardar" : "Editar"}</button>
              </div>
              {editingProfile ? (
                <textarea
                  value={state.profile}
                  onChange={(e) => persist({ ...state, profile: e.target.value })}
                  rows={8}
                  style={{
                    width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13, lineHeight: 1.5,
                    border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, background: C.bg, color: C.ink, resize: "vertical",
                  }}
                />
              ) : (
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{state.profile}</div>
              )}
            </div>

            {/* Portal selector */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate }}>
                  Portales donde buscar
                </div>
                <span style={{ fontSize: 12, color: C.slate }}>{state.portals.length} activos</span>
              </div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 12 }}>
                El agente priorizará estos sitios. Todos son gratuitos para aplicar salvo los marcados.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PORTALS.map((p) => {
                  const on = state.portals.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePortal(p.id)} title={p.hint} style={{
                      display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: font,
                      border: `1px solid ${on ? C.navy : C.line}`,
                      background: on ? C.navySoft : C.card,
                      color: on ? C.navy : C.slate,
                      borderRadius: 99, padding: "6px 12px", fontSize: 12.5, fontWeight: 600,
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${on ? C.navy : C.line}`,
                        background: on ? C.navy : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 10, lineHeight: 1,
                      }}>{on ? "✓" : ""}</span>
                      {p.label}
                      {p.paid && <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>· pago</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model selector */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, marginBottom: 8 }}>
                Modelo del agente
              </div>
              <select
                value={state.model || ""}
                onChange={(e) => persist({ ...state, model: e.target.value })}
                style={{
                  width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13,
                  border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", color: C.ink, background: C.bg,
                }}
              >
                {(models.length > 0 ? models : FALLBACK_MODELS).map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: C.slate, marginTop: 8 }}>
                Modelos disponibles en la cuenta que ejecuta este tracker.
              </div>
            </div>

            {/* Token budget */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate }}>
                  Presupuesto de tokens
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{state.maxTokens.toLocaleString()} tokens</span>
              </div>
              <div style={{ fontSize: 12, color: C.slate, marginBottom: 12 }}>
                Cuánto puede "escribir" el agente por búsqueda. Más tokens = respuestas más completas pero mayor costo. Recomendado: 4.000.
              </div>
              <input
                type="range" min={1000} max={8000} step={500}
                value={state.maxTokens}
                onChange={(e) => persist({ ...state, maxTokens: Number(e.target.value) })}
                style={{ width: "100%", accentColor: C.navy, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: C.slate }}>1.000 · mínimo</span>
                <span style={{ fontSize: 11, color: C.slate }}>8.000 · máximo</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                {[
                  { v: 2000, l: "Económico" },
                  { v: 4000, l: "Equilibrado" },
                  { v: 6000, l: "Completo" },
                ].map((p) => (
                  <button key={p.v} onClick={() => persist({ ...state, maxTokens: p.v })} style={{
                    flex: 1, cursor: "pointer", fontFamily: font, fontSize: 12, fontWeight: 600,
                    padding: "7px 0", borderRadius: 8,
                    border: `1px solid ${state.maxTokens === p.v ? C.navy : C.line}`,
                    background: state.maxTokens === p.v ? C.navySoft : C.card,
                    color: state.maxTokens === p.v ? C.navy : C.slate,
                  }}>{p.l}<div style={{ fontSize: 10, fontWeight: 500, marginTop: 1 }}>{p.v.toLocaleString()}</div></button>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button onClick={runAgent} disabled={searching} style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: searching ? "wait" : "pointer",
              background: searching ? C.slate : C.navy, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: font,
              letterSpacing: "0.01em",
            }}>
              {searching ? "Buscando ofertas…" : "Buscar ofertas ahora"}
            </button>
            <div style={{ fontSize: 12, color: C.slate, textAlign: "center", marginTop: 8 }}>
              El agente busca en la web con tu perfil, filtra lo que ya tienes y te muestra solo lo nuevo.
            </div>

            {/* Log */}
            {log.length > 0 && (
              <div ref={logRef} style={{
                background: C.ink, color: "#D9DEE6", borderRadius: 10, padding: "12px 14px",
                fontSize: 12, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                marginTop: 16, maxHeight: 140, overflowY: "auto", lineHeight: 1.7,
              }}>
                {log.map((m, i) => <div key={i}>› {m}</div>)}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 10, fontSize: 13, color: C.red }}>
                {error}
              </div>
            )}

            {/* Raw fallback: what the agent actually returned */}
            {found.length === 0 && state.lastRaw && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, marginBottom: 8 }}>
                  Texto crudo del agente
                </div>
                <div style={{
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14,
                  fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto",
                }}>{state.lastRaw}</div>
                <button onClick={() => persist({ ...state, lastRaw: null })} style={{
                  marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.slate, fontFamily: font, padding: 0,
                }}>Ocultar</button>
              </div>
            )}

            {/* Found results */}
            {found.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, marginBottom: 10 }}>
                  Nuevas oportunidades encontradas
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {found.map((j, i) => (
                    <div key={i} style={{ background: C.card, border: `1px solid ${C.navy}22`, borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{j.titulo}</div>
                          <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
                            {j.empresa} · {j.ubicacion}{j.salario ? ` · ${j.salario}` : ""}
                          </div>
                        </div>
                        <button onClick={() => addFound(j)} style={{
                          background: C.green, color: "#fff", border: "none", borderRadius: 99,
                          fontSize: 12, fontWeight: 700, padding: "6px 14px", cursor: "pointer", fontFamily: font, flexShrink: 0,
                        }}>+ Agregar</button>
                      </div>
                      <div style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 1.5 }}>{j.nota}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        <FitBar n={Math.max(1, Math.min(5, Number(j.fit) || 3))} />
                        <span style={{ fontSize: 11, color: C.slate }}>· {j.fuente}</span>
                        <div style={{ flex: 1 }} />
                        {j.url && <a href={j.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: C.navy, textDecoration: "none" }}>Ver oferta ↗</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
