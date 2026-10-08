// Motion design des fonctionnalités de Cadranote.
// Chaque scène dure 10 s et se calcule entièrement à partir du temps t :
// `seek(t)` produit toujours la même image, ce qui permet le rendu image par image.

const DURATION = 10;
const BASE_SCALE = 0.75;
const WORLD = { width: 1440, height: 1061 };
const VIEW = { width: 1080, height: 795 };

const $ = (selector, root = document) => root.querySelector(selector);
const world = $("#world");
let ui; // ShadowRoot du panneau

// ---------- Interpolation ----------

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const progress = (t, a, b, ease = easeInOut) => ease(clamp((t - a) / (b - a)));
const lerp = (a, b, p) =>
  Array.isArray(a) ? a.map((value, i) => value + (b[i] - value) * p) : a + (b - a) * p;
const resolve = (value) => (typeof value === "function" ? value() : value);

/** Interpole une suite de clés [temps, valeur] ; une valeur peut être calculée à la volée. */
function track(keys, t) {
  if (t <= keys[0][0]) return resolve(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(resolve(v0), resolve(v1), easeInOut((t - t0) / (t1 - t0)));
    }
  }
  return resolve(keys[keys.length - 1][1]);
}

/** Dernière valeur dont le temps est atteint. */
function step(keys, t) {
  let value = keys[0][1];
  for (const [time, next] of keys) if (t >= time) value = next;
  return value;
}

// ---------- Géométrie dans le repère de la page (1440 × 1061) ----------

function rect(element) {
  const r = element.getBoundingClientRect();
  const w = world.getBoundingClientRect();
  const s = w.width / WORLD.width;
  return [(r.left - w.left) / s, (r.top - w.top) / s, r.width / s, r.height / s];
}
const at =
  (getElement, fx = 0.5, fy = 0.5) =>
  () => {
    const [x, y, w, h] = rect(getElement());
    return [x + w * fx, y + h * fy];
  };
const box = (getElement) => () => rect(getElement());

const page = {
  h1: () => $("#page h1"),
  card: (i) => () => document.querySelectorAll("#page article")[i],
  cards: () => $("#page .cards"),
  main: () => $("#page main"),
  ess: () => $('[data-k="lumen"]'),
  team: () => $('[data-k="rivage"]'),
  studio: () => $('[data-k="atlas"]'),
  corp: () => $('[data-k="fauve"]'),
};
const inPanel = (selector) => () => $(selector, ui);

// ---------- Caméra ----------

/** Cadre la page sur un point [x, y] avec un zoom relatif à la vue d’ensemble. */
function camera([fx, fy, zoom]) {
  const s = BASE_SCALE * zoom;
  const tx = clamp(VIEW.width / 2 - fx * s, VIEW.width - WORLD.width * s, 0);
  const ty = clamp(VIEW.height / 2 - fy * s, VIEW.height - WORLD.height * s, 0);
  world.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
}
const WIDE = [720, 530, 1];

// ---------- Curseur et clics ----------

function cursor(position, clicks, t) {
  const [x, y] = position;
  const pressed = clicks.some((c) => t >= c && t < c + 0.14);
  $("#cursor").style.transform = `translate(${x - 3}px, ${y - 3}px) scale(${pressed ? 0.85 : 1})`;
  const ripple = $("#ripple");
  const last = clicks.filter((c) => t >= c).pop();
  const age = last === undefined ? 1 : (t - last) / 0.55;
  ripple.style.opacity = age < 1 ? 1 - age : 0;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.transform = `scale(${0.3 + age * 1.1})`;
}

// ---------- Surlignages ----------

function highlight(element, r, label) {
  if (!r) {
    element.style.display = "none";
    return;
  }
  const [x, y, w, h] = r;
  Object.assign(element.style, {
    display: "block",
    left: `${x - 2}px`,
    top: `${y - 2}px`,
    width: `${w + 4}px`,
    height: `${h + 4}px`,
  });
  const tag = $(".tag", element);
  if (tag) {
    tag.textContent = label ?? "";
    tag.style.display = label ? "block" : "none";
  }
}
const tagOf = (element) => {
  const [, , w, h] = rect(element);
  return `${element.localName} · ${Math.round(w)} × ${Math.round(h)}`;
};

function components(list) {
  document.querySelectorAll(".comp").forEach((element, i) => {
    const item = list[i];
    if (!item || item.opacity <= 0) {
      element.style.display = "none";
      return;
    }
    const [x, y, w, h] = rect(item.element());
    const pad = item.pad;
    Object.assign(element.style, {
      display: "block",
      left: `${x - pad}px`,
      top: `${y - pad}px`,
      width: `${w + pad * 2}px`,
      height: `${h + pad * 2}px`,
      opacity: item.opacity,
      transform: `scale(${1.04 - 0.04 * item.opacity})`,
    });
    $("span", element).textContent = item.name;
  });
}

// ---------- Panneau (vrai balisage et vraies feuilles de style de l’extension) ----------

const INSTRUCTION =
  "Donner au bouton du projet Lumen le même style que ceux des projets Rivage et Atlas.";
const SELECTOR = 'button[data-testid="open-lumen"]';
const PATH = "main > section.cards > article:nth-of-type(1) > button";
const HTML_SNIPPET = '<button data-testid="open-lumen">Découvrir Lumen</button>';
const INSPECTION = [
  "React : ProjectLink → ProjectCard → ProjectGrid → PortfolioPage",
  "Source exposée : src/portfolio/ProjectCard.tsx:42",
  "Classes compatibles Tailwind : w-full rounded-lg bg-violet-600 py-3 font-semibold text-white",
];
const size = (element) => rect(element).slice(2).map(Math.round).join(" × ");

const PANEL_DEFAULTS = {
  visible: 1,
  offset: [0, 0],
  phase: "selecting-primary",
  primary: false,
  selector: SELECTOR,
  instruction: "",
  caret: false,
  focus: false,
  supplements: [],
  attachmentsOpen: true,
  feedback: "",
  inspectorsOpen: false,
  inspection: "",
  tools: true,
  pressed: null,
  glow: null,
  hint: true,
};

function setText(selector, text) {
  const element = $(selector, ui);
  if (element.textContent !== text) element.textContent = text;
}
function show(selector, visible) {
  $(selector, ui).hidden = !visible;
}

function panel(options) {
  const state = { ...PANEL_DEFAULTS, ...options };
  const root = $(".panel", ui);
  root.dataset.phase = state.phase;
  root.style.opacity = state.visible;
  const [dx, dy] = state.offset;
  root.style.transform = `translate(${dx + (1 - state.visible) * 80}px, ${dy}px)`;

  if (state.phase === "selecting-supplement") {
    setText("#status", "Ajout d’un élément supplémentaire");
    setText(
      "#hint",
      "Cliquez sur l’élément à ajouter. Le principal et votre demande sont conservés. Échap pour annuler l’ajout.",
    );
  } else if (!state.primary) {
    setText("#status", "Sélection de l’élément principal");
    setText("#hint", "Survolez la page, puis cliquez sur l’élément principal. Échap pour quitter.");
  } else {
    setText("#status", "Élément principal sélectionné");
    setText(
      "#hint",
      "Rédigez votre demande, puis ajoutez des éléments supplémentaires si nécessaire.",
    );
  }

  show("#hint", state.hint);
  show("#result", state.primary);
  setText("#meta", `button · ${size(page.ess())} px`);
  setText("#selector-label", "Sélecteur CSS unique");
  setText("#selector", state.selector);
  setText("#path", PATH);
  setText("#html", HTML_SNIPPET);
  $("#inspectors", ui).open = state.inspectorsOpen;
  setText("#inspection", state.inspection);

  const textarea = $("#instruction", ui);
  const value = state.instruction + (state.caret ? "|" : "");
  if (textarea.value !== value) textarea.value = value;
  textarea.classList.toggle("fake-focus", state.focus);

  const supplements = state.supplements;
  show("#supplement-actions", state.primary);
  show("#attachments", supplements.length > 0);
  $("#attachments", ui).open = state.attachmentsOpen;
  setText("#attachment-count", String(supplements.length));
  const list = $("#attachment-list", ui);
  const rows = supplements
    .map(
      (name, i) =>
        `<li><button class="attachment-name">${i + 1}. button · ${name}</button><button data-remove><svg class="icon" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></li>`,
    )
    .join("");
  if (list.dataset.rows !== rows) {
    list.innerHTML = rows;
    list.dataset.rows = rows;
  }
  show("#empty-supplements", supplements.length === 0);
  const adding = state.phase === "selecting-supplement";
  $("#attach", ui).disabled = adding;
  show("#cancel-add", adding);

  show("#principal-actions", state.primary && state.tools);
  show("#copy-ai", state.primary);
  setText(".feedback", state.feedback);

  for (const element of ui.querySelectorAll(".pressed, .glow"))
    element.classList.remove("pressed", "glow");
  if (state.pressed) $(state.pressed, ui).classList.add("pressed");
  if (state.glow) $(state.glow, ui).classList.add("glow");
}

const typed = (text, t, a, b) => text.slice(0, Math.round(text.length * clamp((t - a) / (b - a))));
const blink = (t) => t % 0.8 < 0.45;

// ---------- Légendes, en français et en anglais ----------
// Seules les légendes changent : le panneau et la page restent tels que l’extension les affiche.

const CAPTIONS = {
  fr: {
    tagline: "De la page à la consigne.",
    assistant: "Votre assistant IA",
    hello: "Que voulez-vous modifier aujourd’hui ?",
    placeholder: "Écrivez ou collez votre message…",
    scenes: [
      {
        label: "Cibler",
        title: "Visez l’élément,<br><em>Cadranote</em><br>fait le reste.",
        lead: "Alt+C, survolez, cliquez : sélecteur unique, chemin et extrait HTML en un seul geste.",
      },
      {
        label: "Décrire",
        title: "Dites ce que<br>vous voulez <em>changer</em>.",
        lead: "Votre demande voyage avec l’élément ciblé : l’IA sait exactement de quoi vous parlez.",
      },
      {
        label: "Référencer",
        title: "Montrez<br>l’<em>exemple</em> à suivre.",
        lead: "Ajoutez des éléments de référence, numérotés en vert, sans perdre la cible ni la demande.",
      },
      {
        label: "Copier",
        title: "Un clic,<br>un contexte <em>prêt pour l’IA</em>.",
        lead: "Sélecteurs, chemins, HTML et consigne réunis dans un seul message à coller.",
      },
      {
        label: "Inspecter",
        title: "Remontez<br>jusqu’au <em>composant</em>.",
        lead: "Composants, fichiers sources et classes utilitaires : de quoi retrouver le code.",
        pills: ["React", "Vue", "Angular", "Tailwind"],
      },
      {
        label: "Garder la main",
        title: "Un panneau<br>qui se fait <em>discret</em>.",
        lead: "Glissez-le hors du chemin. Tout reste dans votre navigateur.",
        pills: ["Traitement local", "Aucun envoi", "Aucun historique"],
      },
    ],
  },
  en: {
    tagline: "From the page to the prompt.",
    assistant: "Your AI assistant",
    hello: "What would you like to change today?",
    placeholder: "Type or paste your message…",
    scenes: [
      {
        label: "Target",
        title: "Point at it.<br><em>Cadranote</em><br>does the rest.",
        lead: "Alt+C, hover, click: unique selector, DOM path and HTML snippet in one move.",
      },
      {
        label: "Describe",
        title: "Say what<br>you want <em>changed</em>.",
        lead: "Your request travels with the targeted element, so the AI knows exactly what you mean.",
      },
      {
        label: "Reference",
        title: "Show the<br><em>example</em> to follow.",
        lead: "Add reference elements, numbered in green, without losing the target or the request.",
      },
      {
        label: "Copy",
        title: "One click,<br>context<br><em>ready for AI</em>.",
        lead: "Selectors, paths, HTML and your request in a single message to paste.",
      },
      {
        label: "Inspect",
        title: "Trace it back<br>to the <em>component</em>.",
        lead: "Components, source files and utility classes: clues to find the code.",
        pills: ["React", "Vue", "Angular", "Tailwind"],
      },
      {
        label: "Stay in control",
        title: "A panel that<br><em>stays out</em><br>of the way.",
        lead: "Drag it aside. Everything stays in your browser.",
        pills: ["Local processing", "Nothing sent", "No history"],
      },
    ],
  },
};
let lang = "fr";

// ---------- Textes ----------

const CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';

function copy(scene, t) {
  const caption = CAPTIONS[lang].scenes[scene.index];
  $("#chip-num").textContent = String(scene.index + 1).padStart(2, "0");
  $("#chip-label").textContent = caption.label;
  $("#progress").innerHTML = SCENES.map((_, i) => `<i class="${i === scene.index ? "on" : ""}"></i>`).join("");
  $("#title").innerHTML = caption.title;
  $("#lead").textContent = caption.lead;
  const extra = $("#extra");
  if (extra.dataset.scene !== String(scene.index)) {
    extra.innerHTML = (caption.pills ?? []).map((pill) => `<span class="pill">${CHECK}${pill}</span>`).join("");
    extra.dataset.scene = String(scene.index);
  }

  const reveal = (element, start) => {
    const p = progress(t, start, start + 0.7, easeOut);
    element.style.opacity = p;
    element.style.transform = `translateY(${(1 - p) * 26}px)`;
  };
  reveal($(".chip"), 0.15);
  reveal($("#progress"), 0.25);
  reveal($("#title"), 0.3);
  reveal($("#lead"), 0.5);
  [...extra.children].forEach((pill, i) => reveal(pill, (scene.pillsAt ?? 6) + i * 0.35));
  reveal($("#brand"), 0.6);
}

// ---------- Scènes ----------

const SELECTED = { phase: "editing-request", primary: true, tools: false };

const SCENES = [
  {
    render(t) {
      $("#page").className = "page";
      const keysOn = progress(t, 0.7, 1.0) * (1 - progress(t, 2.0, 2.3));
      keys(["Alt", "C"], keysOn, t >= 1.35 && t < 1.7);

      const selected = t >= 5.4;
      panel({
        visible: progress(t, 1.6, 2.2, easeOut),
        ...(selected ? SELECTED : {}),
        selector: typed(SELECTOR, t, 5.5, 6.3),
        glow: t > 6.3 && t < 8.6 ? "#selector" : null,
        tools: false,
      });

      const hoverKeys = [
        [2.9, box(page.h1)],
        [3.4, box(page.h1)],
        [3.85, box(page.card(0))],
        [4.4, box(page.card(0))],
        [4.85, box(page.ess)],
      ];
      const hovering = t >= 2.9 && !selected;
      const hoverTarget = t < 3.6 ? page.h1() : t < 4.6 ? page.card(0)() : page.ess();
      highlight($("#hover"), hovering ? track(hoverKeys, t) : null, tagOf(hoverTarget));
      highlight($("#primary"), selected ? rect(page.ess()) : null, tagOf(page.ess()));

      cursor(
        track(
          [
            [0, [560, 760]],
            [2.4, [560, 760]],
            [2.9, at(page.h1, 0.55, 0.6)],
            [3.4, at(page.h1, 0.6, 0.62)],
            [3.85, at(page.card(0), 0.62, 0.42)],
            [4.4, at(page.card(0), 0.6, 0.45)],
            [5.0, at(page.ess, 0.55, 0.55)],
            [7.0, at(page.ess, 0.55, 0.55)],
            [7.8, [700, 960]],
          ],
          t,
        ),
        [5.35],
        t,
      );

      camera(
        track(
          [
            [0, WIDE],
            [5.6, WIDE],
            [6.6, at(inPanel("#result"))().concat(1.6)],
            [8.8, at(inPanel("#result"))().concat(1.68)],
            [9.6, WIDE],
          ],
          t,
        ),
      );
    },
  },
  {
    render(t) {
      $("#page").className = "page";
      keys([], 0);
      const focus = t >= 1.6;
      const text = typed(INSTRUCTION, t, 1.9, 6.4);
      panel({
        ...SELECTED,
        instruction: text,
        caret: focus && t < 7.6 && (t < 6.4 || blink(t)),
        focus: focus && t < 7.6,
        glow: t >= 7.6 && t < 9 ? "#result" : null,
      });
      highlight($("#hover"), null);
      highlight($("#primary"), rect(page.ess()), tagOf(page.ess()));
      cursor(
        track(
          [
            [0, [700, 960]],
            [0.7, [700, 960]],
            [1.5, at(inPanel("#instruction"), 0.4, 0.5)],
            [2.2, at(inPanel("#instruction"), 0.4, 0.5)],
            [2.8, at(inPanel("#instruction"), 0.85, 1.4)],
          ],
          t,
        ),
        [1.55],
        t,
      );
      const textareaFocus = at(inPanel("#instruction"), 0.5, 0.3);
      camera(
        track(
          [
            [0, WIDE],
            [0.4, WIDE],
            [1.4, () => textareaFocus().concat(1.9)],
            [6.8, () => textareaFocus().concat(2.0)],
            [7.8, WIDE],
          ],
          t,
        ),
      );
    },
  },
  {
    render(t) {
      $("#page").className = "page";
      keys([], 0);
      const clicks = [1.6, 3.0, 4.5, 5.9];
      const supplements = t >= 5.9 ? ["Découvrir Rivage", "Découvrir Atlas"] : t >= 3.0 ? ["Découvrir Rivage"] : [];
      const adding = (t >= 1.6 && t < 3.0) || (t >= 4.5 && t < 5.9);
      panel({
        ...SELECTED,
        phase: adding ? "selecting-supplement" : "editing-request",
        instruction: INSTRUCTION,
        supplements,
        feedback:
          supplements.length && !adding
            ? "Élément supplémentaire ajouté. Le principal et votre demande sont conservés."
            : "",
      });
      highlight($("#primary"), rect(page.ess()), null);
      const hoverTarget = t < 4 ? page.team : page.studio;
      highlight($("#hover"), adding && t > (t < 4 ? 2.3 : 5.2) ? rect(hoverTarget()) : null, tagOf(hoverTarget()));
      $("#hover").classList.toggle("green", true);
      const supplementBoxes = document.querySelectorAll(".hl[data-s]");
      highlight(supplementBoxes[0], supplements.length >= 1 ? rect(page.team()) : null);
      highlight(supplementBoxes[1], supplements.length >= 2 ? rect(page.studio()) : null);

      cursor(
        track(
          [
            [0, [700, 960]],
            [0.6, [700, 960]],
            [1.4, at(inPanel("#attach"))],
            [1.75, at(inPanel("#attach"))],
            [2.6, at(page.team, 0.5, 0.55)],
            [3.3, at(page.team, 0.5, 0.55)],
            [4.2, at(inPanel("#attach"))],
            [4.65, at(inPanel("#attach"))],
            [5.6, at(page.studio, 0.5, 0.55)],
            [6.6, at(page.studio, 0.5, 0.55)],
            [7.4, [940, 1000]],
          ],
          t,
        ),
        clicks,
        t,
      );
      camera(
        track(
          [
            [0, WIDE],
            [6.3, WIDE],
            [7.3, at(page.cards, 0.5, 0.7)().concat(1.3)],
            [8.6, at(page.cards, 0.5, 0.7)().concat(1.34)],
            [9.5, WIDE],
          ],
          t,
        ),
      );
    },
  },
  {
    render(t) {
      $("#page").className = "page";
      const clicked = t >= 1.6;
      panel({
        ...SELECTED,
        instruction: INSTRUCTION,
        supplements: ["Découvrir Rivage", "Découvrir Atlas"],
        attachmentsOpen: false,
        feedback: clicked ? "Contexte copié : le principal et 2 élément(s) supplémentaire(s)." : "",
        pressed: t >= 1.6 && t < 1.8 ? "#copy-ai" : null,
        glow: t >= 1.6 && t < 2.6 ? ".feedback" : null,
      });
      highlight($("#hover"), null);
      highlight($("#primary"), rect(page.ess()), null);
      const supplementBoxes = document.querySelectorAll(".hl[data-s]");
      highlight(supplementBoxes[0], rect(page.team()));
      highlight(supplementBoxes[1], rect(page.studio()));
      cursor(
        track(
          [
            [0, [700, 760]],
            [0.5, [700, 760]],
            [1.4, at(inPanel("#copy-ai"), 0.4, 0.55)],
          ],
          t,
        ),
        [1.6],
        t,
      );
      const footer = at(inPanel("#copy-ai"), 0.5, 0.2);
      camera(
        track(
          [
            [0, WIDE],
            [0.3, WIDE],
            [1.2, () => footer().concat(1.7)],
            [2.4, () => footer().concat(1.75)],
            [3.2, WIDE],
          ],
          t,
        ),
      );

      keys(["Ctrl", "V"], progress(t, 3.5, 3.8) * (1 - progress(t, 4.5, 4.8)), t >= 3.95 && t < 4.3);
      assistant(t);
    },
  },
  {
    pillsAt: 6.4,
    render(t) {
      $("#page").className = "page";
      keys([], 0);
      const open = t >= 1.7;
      const lines = INSPECTION.filter((_, i) => t >= 2.5 + i * 0.6);
      panel({
        ...SELECTED,
        instruction: INSTRUCTION,
        inspectorsOpen: open,
        inspection: !open ? "" : lines.length ? lines.join("\n") : "Inspection en cours…",
        glow: t >= 2.5 && t < 5 ? "#inspection" : null,
      });
      highlight($("#hover"), null);
      highlight($("#primary"), rect(page.ess()), null);

      const names = ["ProjectLink", "ProjectCard", "ProjectGrid", "PortfolioPage"];
      const targets = [page.ess, page.card(0), page.cards, page.main];
      const pads = [6, 8, 12, 4];
      components(
        names.map((name, i) => ({
          name: `<${name}>`,
          element: targets[i],
          pad: pads[i],
          opacity: progress(t, 5.0 + i * 0.45, 5.4 + i * 0.45, easeOut) * (1 - progress(t, 9.2, 9.6)),
        })),
      );

      cursor(
        track(
          [
            [0, [700, 960]],
            [0.6, [700, 960]],
            [1.5, at(inPanel("#inspectors summary"), 0.25, 0.5)],
            [2.3, at(inPanel("#inspectors summary"), 0.25, 0.5)],
            [3.0, [1180, 1010]],
          ],
          t,
        ),
        [1.7],
        t,
      );
      const result = at(inPanel("#inspection"), 0.5, 0.3);
      camera(
        track(
          [
            [0, WIDE],
            [0.3, WIDE],
            [1.2, at(inPanel("#result"), 0.5, 0.75)().concat(1.6)],
            [2.2, () => result().concat(1.7)],
            [4.4, () => result().concat(1.75)],
            [5.4, [560, 640, 1.12]],
            [8.6, [560, 640, 1.15]],
            [9.4, WIDE],
          ],
          t,
        ),
      );
    },
  },
  {
    pillsAt: 6.6,
    render(t) {
      $("#page").className = "page wide";
      keys([], 0);
      // Cible : coin supérieur gauche, à 20 px des bords comme la position par défaut.
      const height = $(".panel", ui).offsetHeight;
      const offset = track(
        [
          [1.6, [0, 0]],
          [3.2, [-980, height - 1005]],
        ],
        t,
      );
      const added = t >= 5.5;
      const adding = t >= 4.1 && !added;
      panel({
        ...SELECTED,
        phase: adding ? "selecting-supplement" : "editing-request",
        instruction: INSTRUCTION,
        offset,
        supplements: added ? ["Découvrir Fauve"] : [],
        attachmentsOpen: false,
        hint: false,
        glow: t >= 6.8 && t < 9.2 ? ".footer" : null,
      });
      $(".panel", ui).toggleAttribute("data-dragging", t >= 1.5 && t < 3.3);
      highlight($("#primary"), rect(page.ess()), null);
      highlight($("#hover"), adding && t > 4.9 ? rect(page.corp()) : null, tagOf(page.corp()));
      $("#hover").classList.toggle("green", true);
      const supplementBoxes = document.querySelectorAll(".hl[data-s]");
      highlight(supplementBoxes[0], added ? rect(page.corp()) : null);
      highlight(supplementBoxes[1], null);

      const grip = at(inPanel(".panel header"), 0.45, 0.5);
      cursor(
        track(
          [
            [0, [1100, 980]],
            [0.6, [1100, 980]],
            [1.4, grip],
            [3.6, grip],
            [4.0, at(inPanel("#attach"))],
            [4.4, at(inPanel("#attach"))],
            [5.2, at(page.corp, 0.5, 0.55)],
            [6.2, at(page.corp, 0.5, 0.55)],
            [7.0, [1250, 1030]],
          ],
          t,
        ),
        [1.5, 4.1, 5.5],
        t,
      );
      const footer = at(inPanel(".footer"), 0.3, 0.5);
      camera(
        track(
          [
            [0, WIDE],
            [6.4, WIDE],
            [7.4, () => footer().concat(2.1)],
            [8.9, () => footer().concat(2.15)],
            [9.6, WIDE],
          ],
          t,
        ),
      );
    },
  },
];

SCENES.forEach((scene, index) => (scene.index = index));

// ---------- Raccourcis et assistant ----------

function keys(labels, visible, down = false) {
  const element = $("#keys");
  const html = labels.map((label) => `<span class="key${down ? " down" : ""}">${label}</span>`).join("<span>+</span>");
  if (element.dataset.html !== html) {
    element.innerHTML = html;
    element.dataset.html = html;
  }
  element.style.opacity = visible;
  element.style.transform = `translateX(-50%) translateY(${(1 - visible) * 20}px) scale(${0.94 + visible * 0.06})`;
}

const CONTEXT = [
  "3 éléments HTML à cibler — instantanés pris lors de leur ajout ou de la copie.",
  "",
  "<h>## Élément principal</h>",
  "Page : https://oree.studio/projets",
  "Titre : Orée — Projets",
  `Sélecteur CSS : <s>${SELECTOR}</s>`,
  `Chemin HTML : ${PATH}`,
  "Texte : Découvrir Lumen",
  "Dimensions : {size} px",
  "Extrait HTML (DOM rendu, éventuellement tronqué) :",
  "```html",
  HTML_SNIPPET,
  "```",
  "",
  "<g>## Élément supplémentaire 1</g>",
  'Sélecteur CSS : <s>button[data-testid="open-rivage"]</s>',
  "Texte : Découvrir Rivage",
  "Extrait HTML (DOM rendu, éventuellement tronqué) :",
  '<button class="secondary" data-testid="open-rivage">Découvrir Rivage</button>',
  "",
  "<g>## Élément supplémentaire 2</g>",
  'Sélecteur CSS : <s>button[data-testid="open-atlas"]</s>',
  "Texte : Découvrir Atlas",
  "",
  `Modification demandée : <r>${INSTRUCTION}</r>`,
  "Retrouve le composant ou le template qui produit l’élément principal et applique la modification dans le code source.",
];

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const contextHtml = () =>
  CONTEXT.map((line) =>
    escapeHtml(line.replace("{size}", size(page.ess()))).replace(
      /&lt;(h|s|g|r)&gt;(.*?)&lt;\/\1&gt;/g,
      '<span class="$1">$2</span>',
    ),
  ).join("\n");

function assistant(t) {
  const element = $("#ai");
  const visible = progress(t, 2.6, 3.3, easeOut);
  element.style.display = visible > 0 ? "block" : "none";
  element.style.opacity = visible;
  element.style.transform = `translateY(${(1 - visible) * 60}px) scale(${0.96 + visible * 0.04})`;

  const pasted = t >= 4.0;
  $("#ai-placeholder").style.display = pasted ? "none" : "block";
  const text = $("#ai-text");
  if (text.dataset.pasted !== String(pasted)) {
    text.innerHTML = pasted ? contextHtml() : "";
    text.dataset.pasted = String(pasted);
  }
  const maxScroll = Math.max(0, text.scrollHeight - 560 + 20);
  text.style.opacity = progress(t, 4.0, 4.25);
  text.style.transform = `translateY(${-maxScroll * progress(t, 4.7, 8.4)}px)`;
  const pulse = progress(t, 8.6, 9.0) * (1 - progress(t, 9.2, 9.6));
  $("#ai-send").style.boxShadow = `0 0 0 ${pulse * 10}px #0866eb44`;
}

// ---------- Démarrage ----------

let scene = SCENES[0];

function seek(t) {
  copy(scene, t);
  $("#ai").style.display = "none";
  components([]);
  $("#hover").classList.remove("green");
  scene.render(t);
  $("#fade").style.opacity = 1 - progress(t, 0, 0.35) + progress(t, DURATION - 0.4, DURATION);
}

async function setup() {
  const [css, html, logo] = await Promise.all(
    ["../../src/ui/panel.css", "../../src/ui/panel.html", "../../src/ui/logo.svg"].map((path) =>
      fetch(path).then((response) => response.text()),
    ),
  );
  ui = $("#host").attachShadow({ mode: "open" });
  ui.innerHTML = `<style>${css}
    .panel { max-height: 1021px; }
    .fake-focus { outline: 2px solid var(--target); outline-offset: 3px; }
    .pressed { filter: brightness(0.8); transform: scale(0.98); }
    .glow { box-shadow: 0 0 0 4px #72b5ff66, 0 0 28px #72b5ff55 !important; border-radius: 8px; }
  </style>${html}`;
  $(".logo", ui).innerHTML = logo;

  const params = new URLSearchParams(location.search);
  scene = SCENES[clamp(Number(params.get("scene") ?? 1) - 1, 0, SCENES.length - 1)];
  lang = params.get("lang") === "en" ? "en" : "fr";
  document.documentElement.lang = lang;
  for (const element of document.querySelectorAll("[data-caption]"))
    element.textContent = CAPTIONS[lang][element.dataset.caption];
  window.seek = seek;
  window.sceneCount = SCENES.length;
  window.ready = true;

  if (params.has("render")) return;
  if (params.has("t")) return seek(Number(params.get("t")));
  const start = performance.now();
  const frame = (now) => {
    seek(((now - start) / 1000) % DURATION);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

setup();
