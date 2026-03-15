import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3001;

// ─── PostgreSQL ─────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_oeph3GaIH6MV@ep-long-sun-am9hupb6-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      whatsapp VARCHAR(50) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      company_name VARCHAR(200),
      email VARCHAR(200),
      password VARCHAR(255),
      is_pro BOOLEAN DEFAULT FALSE,
      plan VARCHAR(20) DEFAULT 'free',
      activated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    );

    INSERT INTO admin_settings (key, value) VALUES ('whatsapp_number', '241XXXXXXXX') ON CONFLICT (key) DO NOTHING;
    INSERT INTO admin_settings (key, value) VALUES ('admin_key', 'CHECKMODE2024') ON CONFLICT (key) DO NOTHING;
  `);
  console.log('✅ Base de données initialisée');
}

initDB().catch(err => console.error('❌ Erreur init DB:', err));

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getAdminKey(): Promise<string> {
  const r = await pool.query(`SELECT value FROM admin_settings WHERE key = 'admin_key'`);
  return r.rows[0]?.value || 'CHECKMODE2024';
}

async function getSettings(): Promise<Record<string, string>> {
  const r = await pool.query(`SELECT key, value FROM admin_settings`);
  const map: Record<string, string> = {};
  r.rows.forEach((row: any) => { map[row.key] = row.value; });
  return map;
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { firstName, companyName, whatsapp, email, password } = req.body;
  if (!whatsapp || !password) return res.status(400).json({ success: false, error: 'Champs manquants' });
  try {
    const result = await pool.query(
      `INSERT INTO users (whatsapp, first_name, company_name, email, password)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (whatsapp) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         company_name = EXCLUDED.company_name,
         email = EXCLUDED.email,
         password = EXCLUDED.password
       RETURNING id, whatsapp, first_name, company_name, email, is_pro, plan, activated_at`,
      [whatsapp, firstName || '', companyName || '', email || null, password]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { whatsapp, password } = req.body;
  if (!whatsapp || !password) return res.status(400).json({ success: false, error: 'Champs manquants' });
  try {
    const result = await pool.query(
      `SELECT id, whatsapp, first_name, company_name, email, is_pro, plan, activated_at
       FROM users WHERE whatsapp = $1 AND password = $2`,
      [whatsapp, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Numéro WhatsApp ou mot de passe incorrect' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/user/status', async (req, res) => {
  const { whatsapp } = req.query;
  if (!whatsapp) return res.status(400).json({ error: 'WhatsApp requis' });
  try {
    const result = await pool.query(
      `SELECT is_pro, plan, activated_at FROM users WHERE whatsapp = $1`,
      [whatsapp]
    );
    if (result.rows.length === 0) return res.json({ isPro: false, plan: 'free' });
    const u = result.rows[0];
    res.json({ isPro: u.is_pro, plan: u.plan, activatedAt: u.activated_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payment/whatsapp', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT value FROM admin_settings WHERE key = 'whatsapp_number'`);
    res.json({ number: r.rows[0]?.value || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.post('/api/admin/users/set-status', async (req, res) => {
  const adminKey = await getAdminKey();
  if (req.query.key !== adminKey) return res.status(403).json({ error: 'Non autorisé' });
  const { userId, isPro, plan } = req.body;
  try {
    await pool.query(
      `UPDATE users SET is_pro = $1, plan = $2, activated_at = $3 WHERE id = $4`,
      [isPro, isPro ? (plan || 'monthly') : 'free', isPro ? new Date() : null, userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  const adminKey = await getAdminKey();
  if (req.query.key !== adminKey) return res.status(403).json({ error: 'Non autorisé' });
  try {
    for (const [k, v] of Object.entries(req.body)) {
      await pool.query(
        `INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [k, String(v)]
      );
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CheckMode Admin Panel ────────────────────────────────────────────────────
app.get('/checkmode', async (req, res) => {
  const adminKey = await getAdminKey();
  const { key } = req.query;

  if (key !== adminKey) {
    return res.send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CheckMode</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#111;border:1px solid #222;border-radius:20px;padding:40px;width:100%;max-width:360px;text-align:center}
h2{font-size:22px;font-weight:700;margin-bottom:8px}
p{color:#555;font-size:14px;margin-bottom:24px}
input{width:100%;padding:12px 16px;background:#1a1a1a;border:1px solid #333;border-radius:10px;color:white;font-size:15px;margin-bottom:12px;outline:none}
input:focus{border-color:#555}
button{width:100%;padding:14px;background:white;color:#0a0a0a;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
button:hover{background:#e5e5e5}
.lock{font-size:40px;margin-bottom:16px}
</style></head>
<body>
<div class="card">
  <div class="lock">🔐</div>
  <h2>Accès restreint</h2>
  <p>Entrez votre clé d'accès admin</p>
  <form method="GET" action="/checkmode">
    <input type="password" name="key" placeholder="••••••••••••" autofocus />
    <button type="submit">Accéder au panneau</button>
  </form>
</div>
</body></html>`);
  }

  // Fetch all data
  const usersResult = await pool.query(`SELECT * FROM users ORDER BY created_at DESC`);
  const settings = await getSettings();
  const users = usersResult.rows;
  const proCount = users.filter((u: any) => u.is_pro).length;
  const freeCount = users.filter((u: any) => !u.is_pro).length;

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = { monthly: '#3b82f6', quarterly: '#8b5cf6', yearly: '#f59e0b', free: '#444' };
    const labels: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel', free: 'Free' };
    return `<span style="background:${colors[plan]||'#444'};color:white;padding:2px 8px;border-radius:99px;font-size:11px">${labels[plan]||plan}</span>`;
  };

  const usersHTML = users.map((u: any) => `
    <tr>
      <td>${u.id}</td>
      <td>${u.first_name || '—'}</td>
      <td>${u.company_name || '—'}</td>
      <td><a href="https://wa.me/${u.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:#25d366">${u.whatsapp}</a></td>
      <td>${u.email || '—'}</td>
      <td><span class="badge ${u.is_pro ? 'pro' : 'free'}">${u.is_pro ? '✓ PRO' : 'FREE'}</span></td>
      <td>${planBadge(u.plan || 'free')}</td>
      <td>${u.activated_at ? new Date(u.activated_at).toLocaleDateString('fr-FR') : '—'}</td>
      <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          ${!u.is_pro
            ? `<button class="action-btn green" onclick="setStatus(${u.id},true)">→ PRO</button>`
            : `<button class="action-btn red" onclick="setStatus(${u.id},false)">→ FREE</button>`
          }
          <select id="plan_${u.id}" class="plan-sel">
            <option value="monthly" ${u.plan==='monthly'?'selected':''}>Mensuel</option>
            <option value="quarterly" ${u.plan==='quarterly'?'selected':''}>Trimestriel</option>
            <option value="yearly" ${u.plan==='yearly'?'selected':''}>Annuel</option>
            <option value="free" ${u.plan==='free'?'selected':''}>Free</option>
          </select>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:32px;color:#444">Aucun utilisateur inscrit</td></tr>`;

  res.send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CheckMode — Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh}
.topbar{background:#111;border-bottom:1px solid #1e1e1e;padding:16px 28px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
.topbar h1{font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px}
.topbar span{font-size:12px;color:#444;background:#1a1a1a;padding:4px 12px;border-radius:99px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;padding:24px 28px}
.stat{background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:20px}
.stat .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:6px}
.stat .val{font-size:30px;font-weight:800}
.section{padding:0 28px 28px}
.section h2{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#555;margin-bottom:14px;padding-top:4px}
.overflow{overflow-x:auto;border-radius:14px;border:1px solid #1e1e1e}
table{width:100%;border-collapse:collapse;background:#111;font-size:13px}
th{background:#141414;padding:11px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#555;white-space:nowrap}
td{padding:11px 14px;border-bottom:1px solid #1a1a1a;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover{background:#131313}
.badge{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
.badge.pro{background:#16a34a22;color:#4ade80;border:1px solid #16a34a44}
.badge.free{background:#33333355;color:#888;border:1px solid #2a2a2a}
.action-btn{padding:5px 12px;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;transition:.15s}
.action-btn.green{background:#16a34a;color:white}.action-btn.green:hover{background:#15803d}
.action-btn.red{background:#dc2626;color:white}.action-btn.red:hover{background:#b91c1c}
.plan-sel{padding:5px 8px;background:#1a1a1a;border:1px solid #333;border-radius:7px;color:#e5e5e5;font-size:12px;cursor:pointer}
.settings-box{background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:24px;max-width:560px}
.form-row{margin-bottom:16px}
.form-row label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:7px}
.form-row input{width:100%;padding:11px 14px;background:#1a1a1a;border:1px solid #333;border-radius:9px;color:white;font-size:14px;outline:none}
.form-row input:focus{border-color:#555}
.save-btn{padding:11px 24px;background:white;color:#0a0a0a;border:none;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;transition:.15s}
.save-btn:hover{background:#e5e5e5}
.toast{position:fixed;top:20px;right:20px;background:#16a34a;color:white;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;display:none;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.divider{height:1px;background:#1a1a1a;margin:0 28px 28px}
</style>
</head>
<body>
<div id="toast" class="toast">✓ Effectué</div>

<div class="topbar">
  <h1>🔐 CheckMode <span style="font-size:14px;color:#666;font-weight:400">Panneau Administrateur</span></h1>
  <span>compta-app</span>
</div>

<div class="stats-grid">
  <div class="stat"><div class="lbl">Total utilisateurs</div><div class="val">${users.length}</div></div>
  <div class="stat"><div class="lbl">Abonnés PRO</div><div class="val" style="color:#4ade80">${proCount}</div></div>
  <div class="stat"><div class="lbl">Plan Free</div><div class="val" style="color:#f59e0b">${freeCount}</div></div>
  <div class="stat"><div class="lbl">Revenu mensuel estimé</div><div class="val" style="color:#60a5fa">${(proCount * 10000).toLocaleString('fr-FR')}<span style="font-size:14px;font-weight:400;color:#555"> FCFA</span></div></div>
</div>

<div class="section">
  <h2>Tous les utilisateurs</h2>
  <div class="overflow">
    <table>
      <thead><tr><th>ID</th><th>Prénom</th><th>Entreprise</th><th>WhatsApp</th><th>Email</th><th>Statut</th><th>Plan</th><th>Activé</th><th>Inscrit</th><th>Actions</th></tr></thead>
      <tbody>${usersHTML}</tbody>
    </table>
  </div>
</div>

<div class="divider"></div>

<div class="section">
  <h2>Paramètres</h2>
  <div class="settings-box">
    <div class="form-row">
      <label>Numéro WhatsApp de paiement <span style="color:#444;text-transform:none;letter-spacing:0">(sans le +, ex: 24101234567)</span></label>
      <input type="text" id="waNumber" value="${settings.whatsapp_number || ''}" placeholder="24101234567" />
    </div>
    <div class="form-row">
      <label>Clé d'accès admin <span style="color:#444;text-transform:none;letter-spacing:0">(utilisée dans /checkmode?key=XXX)</span></label>
      <input type="text" id="adminKey" value="${settings.admin_key || ''}" />
    </div>
    <button class="save-btn" onclick="saveSettings()">💾 Sauvegarder les paramètres</button>
  </div>
</div>

<script>
const KEY = ${JSON.stringify(adminKey)};
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',3000)}
async function setStatus(userId,isPro){
  const sel=document.getElementById('plan_'+userId);
  const plan=sel?sel.value:(isPro?'monthly':'free');
  const r=await fetch('/api/admin/users/set-status?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,isPro,plan})});
  if(r.ok){toast(isPro?'✓ Passé en PRO':'✓ Passé en FREE');setTimeout(()=>location.reload(),1200)}
  else toast('❌ Erreur');
}
async function saveSettings(){
  const waNumber=document.getElementById('waNumber').value.trim();
  const adminKey=document.getElementById('adminKey').value.trim();
  if(!waNumber||!adminKey){toast('❌ Champs requis');return}
  const r=await fetch('/api/admin/settings?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({whatsapp_number:waNumber,admin_key:adminKey})});
  if(r.ok)toast('✓ Paramètres sauvegardés');
  else toast('❌ Erreur');
}
</script>
</body></html>`);
});

// ─── Legacy license validation ────────────────────────────────────────────────
app.post('/api/validate-license', async (req, res) => {
  res.json({ valid: false, error: 'Service de licence non configuré' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
  console.log(`🔐 Panel admin: http://localhost:${PORT}/checkmode?key=CHECKMODE2024`);
});
