'use strict';

/* ─── DEFAULT SCRIPT ──────────────────────────────────────────────────────── */
const DEFAULT_NODES = [
  {
    title: "Accroche",
    script: "Bonjour [Prénom], c'est [Ton Nom] de [Ta Société] — je vous dérange pas trop 30 secondes ?",
    branches: [
      { label: "Oui vas-y",         reply: "Parfait ! Je serai bref." },
      { label: "Non rappelle-moi",  reply: "Pas de souci, je vous rappelle quand ?" },
      { label: "C'est qui ?",       reply: "Je suis [Ton Nom], de [Ta Société] — on aide des équipes comme la vôtre à [bénéfice clé]." }
    ]
  },
  {
    title: "Pitch express",
    script: "On aide des équipes RH à réduire leur temps de paie de 60% avec notre logiciel. C'est un sujet qui vous parle en ce moment ?",
    branches: [
      { label: "Oui c'est intéressant", reply: "Super ! Vous faites comment actuellement ?" },
      { label: "Pas vraiment",          reply: "Je comprends. C'est quoi la priorité côté RH en ce moment ?" },
      { label: "On a déjà un outil",    reply: "Tout à fait normal. Et vous êtes satisfait de ce qu'il vous apporte ?" }
    ]
  },
  {
    title: "Découverte",
    script: "Actuellement vous gérez la paie comment — outil interne, prestataire ? Et c'est combien de bulletins par mois environ ?",
    branches: [
      { label: "Partage l'info",                 reply: "Intéressant. Et ça vous prend combien de temps par cycle ?" },
      { label: "Reste vague",                    reply: "Je comprends. Sans entrer dans les détails — vous avez des douleurs sur le process actuel ?" },
      { label: "Pas le bon interlocuteur",       reply: "Pas de problème — c'est qui la bonne personne pour ce sujet ?" }
    ]
  },
  {
    title: "Proposition RDV",
    script: "Est-ce que ça vous dirait qu'on se retrouve 20 minutes la semaine prochaine pour vous montrer ce qu'on fait — sans engagement bien sûr ?",
    branches: [
      { label: "Oui volontiers",           reply: "Parfait ! Mardi 10h ou jeudi 14h, c'est quoi le mieux pour vous ?" },
      { label: "Non merci",                reply: "Je comprends. C'est quoi le frein principal ?" },
      { label: "Envoyez un email d'abord", reply: "Bien sûr. C'est quelle adresse ? Je vous envoie ça dans la journée." }
    ]
  },
  {
    title: "Confirmation créneau",
    script: "Super ! Je vous propose mardi 10h ou jeudi 14h — qu'est-ce qui vous convient le mieux ?",
    branches: [
      { label: "Mardi 10h",      reply: "Noté. Je vous envoie une invitation à l'instant." },
      { label: "Jeudi 14h",      reply: "Parfait, je bloque le créneau et vous envoie l'invite." },
      { label: "Aucun des deux", reply: "Pas de souci — c'est quelle semaine qui serait mieux pour vous ?" }
    ]
  }
];

/* ─── STATE ────────────────────────────────────────────────────────────────── */
const S = {
  nodes: [],
  runNodes: [],
  step: 0,
  elapsed: 0,
  tick: null,
  log: []
};

/* ─── EDITOR ───────────────────────────────────────────────────────────────── */
const Editor = {
  init() {
    S.nodes = DEFAULT_NODES.map(n => ({
      title: n.title,
      script: n.script,
      branches: n.branches.map(b => ({ ...b }))
    }));
    this.render();
  },

  render() {
    const list = document.getElementById('nodesList');
    list.innerHTML = '';
    S.nodes.forEach((node, i) => {
      const card = document.createElement('div');
      card.className = 'node-card';
      card.innerHTML = `
        <div class="node-head">
          <div class="node-num">${i + 1}</div>
          <input class="node-title-inp" type="text" value="${esc(node.title)}" placeholder="Titre de l'étape"
            oninput="S.nodes[${i}].title=this.value"/>
          <button class="btn-del" onclick="Editor.del(${i})" title="Supprimer">×</button>
        </div>
        <div class="node-body">
          <div>
            <div class="sec-label">Script — ce que tu dis</div>
            <textarea oninput="S.nodes[${i}].script=this.value">${esc(node.script)}</textarea>
          </div>
          <div>
            <div class="sec-label">Réponses du prospect → ta réplique</div>
            <div class="branches" id="branches-${i}">
              ${node.branches.map((b, bi) => this.branchHTML(i, bi, b)).join('')}
            </div>
            <button class="btn-add-branch" onclick="Editor.addBranch(${i})">+ Ajouter une réponse</button>
          </div>
        </div>`;
      list.appendChild(card);
    });
  },

  branchHTML(ni, bi, b) {
    return `<div class="branch-row" id="br-${ni}-${bi}">
      <div class="branch-dot bd-${bi % 4}"></div>
      <div class="branch-fields">
        <input class="branch-label-inp" type="text" value="${esc(b.label)}" placeholder="Réponse du prospect (ex: Oui, pas de problème)"
          oninput="S.nodes[${ni}].branches[${bi}].label=this.value"/>
        <textarea class="branch-reply-inp" placeholder="Ta réplique dans ce cas…"
          oninput="S.nodes[${ni}].branches[${bi}].reply=this.value">${esc(b.reply)}</textarea>
      </div>
    </div>`;
  },

  addBranch(ni) {
    S.nodes[ni].branches.push({ label: '', reply: '' });
    this.render();
  },

  addNode() {
    S.nodes.push({ title: `Étape ${S.nodes.length + 1}`, script: '', branches: [{ label: 'Oui', reply: '' }, { label: 'Non', reply: '' }] });
    this.render();
    document.querySelectorAll('.node-card').pop()?.scrollIntoView({ behavior: 'smooth' });
  },

  del(i) {
    if (S.nodes.length <= 1) return;
    S.nodes.splice(i, 1);
    this.render();
  }
};

/* ─── APP ──────────────────────────────────────────────────────────────────── */
const App = {

  launch() {
    const name = document.getElementById('cfg-name').value.trim() || 'Prospect';
    const company = document.getElementById('cfg-company').value.trim();

    S.runNodes = S.nodes.map(n => ({ ...n, branches: n.branches.map(b => ({ ...b })), chosen: null }));
    S.step = 0;
    S.elapsed = 0;
    S.log = [];

    document.getElementById('c-prospect').textContent = name + (company ? ' · ' + company : '');

    showScreen('call');
    this.buildFrise();
    this.startTimer();
    this.showStep(0);
  },

  buildFrise() {
    const frise = document.getElementById('c-frise');
    frise.innerHTML = '';
    S.runNodes.forEach((node, i) => {
      const isLast = i === S.runNodes.length - 1;
      const wrap = document.createElement('div');
      wrap.className = 'frise-node';
      wrap.innerHTML = `
        <div class="fn-bubble" id="fn-${i}">
          <div class="fn-dot pending" id="fndot-${i}"></div>
          <div class="fn-label pending" id="fnlbl-${i}">${esc(node.title)}</div>
          <div class="fn-choice-tag" id="fntag-${i}" style="display:none"></div>
        </div>
        ${!isLast ? '<div class="fn-connector"><div class="fn-line" id="fnline-'+i+'"></div></div>' : ''}`;
      frise.appendChild(wrap);
    });
  },

  showStep(idx) {
    if (idx >= S.runNodes.length) { this.end(); return; }
    S.step = idx;
    const node = S.runNodes[idx];

    // update frise
    document.getElementById(`fndot-${idx}`).className = 'fn-dot active';
    document.getElementById(`fnlbl-${idx}`).className = 'fn-label active';

    // progress
    const pct = Math.round((idx / S.runNodes.length) * 100);
    document.getElementById('c-progress').style.width = pct + '%';

    // scroll frise to current dot
    const dot = document.getElementById(`fn-${idx}`);
    dot?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    // current card
    document.getElementById('c-label').textContent = `${idx + 1} / ${S.runNodes.length} — ${node.title}`;
    document.getElementById('c-label').className = 'current-label active-lbl';
    document.getElementById('c-script').textContent = node.script;

    const choicesDiv = document.getElementById('c-choices');
    choicesDiv.innerHTML = '';

    node.branches.forEach((b, bi) => {
      if (!b.label) return;
      const pill = document.createElement('button');
      pill.className = `choice-pill cp-${bi % 4}`;
      pill.innerHTML = `<span class="cp-label">${esc(b.label)}</span>${b.reply ? `<span class="cp-reply">${esc(b.reply)}</span>` : ''}`;
      pill.onclick = () => this.pick(idx, bi);
      choicesDiv.appendChild(pill);
    });

    const skipPill = document.createElement('button');
    skipPill.className = 'choice-pill-skip';
    skipPill.textContent = 'Passer cette étape';
    skipPill.onclick = () => this.pick(idx, -1);
    choicesDiv.appendChild(skipPill);
  },

  pick(idx, bi) {
    const node = S.runNodes[idx];
    const branch = bi >= 0 ? node.branches[bi] : null;
    node.chosen = bi;

    S.log.push({ idx, title: node.title, bi, label: branch?.label || '—' });

    // frise update
    const dot = document.getElementById(`fndot-${idx}`);
    dot.className = 'fn-dot done';
    document.getElementById(`fnlbl-${idx}`).className = 'fn-label done';
    if (idx > 0) {
      const prevLine = document.getElementById(`fnline-${idx - 1}`);
      if (prevLine) prevLine.classList.add('done');
    }

    const tag = document.getElementById(`fntag-${idx}`);
    tag.style.display = 'block';
    tag.className = `fn-choice-tag ${bi >= 0 ? 'tag-' + (bi % 4) : 'tag-skip'}`;
    tag.textContent = branch?.label || '—';

    // flash reply in current card
    if (branch?.reply) {
      const choicesDiv = document.getElementById('c-choices');
      choicesDiv.innerHTML = `<div class="reply-flash">${esc(branch.reply)}</div>`;
      setTimeout(() => this.showStep(idx + 1), 1400);
    } else {
      this.showStep(idx + 1);
    }
  },

  /* timer */
  startTimer() {
    clearInterval(S.tick);
    S.elapsed = 0;
    const el = document.getElementById('c-timer');
    S.tick = setInterval(() => {
      S.elapsed++;
      const m = String(Math.floor(S.elapsed / 60)).padStart(2, '0');
      const s = String(S.elapsed % 60).padStart(2, '0');
      el.textContent = m + ':' + s;
    }, 1000);
  },

  end() {
    clearInterval(S.tick);
    document.getElementById('c-progress').style.width = '100%';

    const m = Math.floor(S.elapsed / 60);
    const sec = S.elapsed % 60;
    const dur = m > 0 ? `${m}min ${sec}s` : `${sec}s`;
    document.getElementById('e-meta').textContent = `Durée : ${dur} · ${S.log.length} étapes couvertes sur ${S.runNodes.length}`;

    const logHtml = S.log.map(l => {
      const cls = l.bi === 0 ? 'lc-0' : l.bi === 1 ? 'lc-1' : l.bi === 2 ? 'lc-2' : l.bi === 3 ? 'lc-3' : 'lc-skip';
      return `<div class="log-row">
        <span class="log-n">${l.idx + 1}</span>
        <span class="log-title">${esc(l.title)}</span>
        <span class="log-choice ${cls}">${esc(l.label)}</span>
      </div>`;
    }).join('');
    document.getElementById('e-log').innerHTML = logHtml;

    showScreen('end');
  },

  restart() {
    showScreen('call');
    S.runNodes = S.nodes.map(n => ({ ...n, branches: n.branches.map(b => ({ ...b })), chosen: null }));
    S.log = [];
    this.buildFrise();
    this.startTimer();
    this.showStep(0);
  },

  backToSetup() {
    showScreen('setup');
    Editor.render();
  }
};

/* ─── UTILS ────────────────────────────────────────────────────────────────── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + name).classList.add('active');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── BOOT ─────────────────────────────────────────────────────────────────── */
Editor.init();
