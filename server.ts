import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'compta_secret_jwt_key_2024';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_oeph3GaIH6MV@ep-long-sun-am9hupb6-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(100) NOT NULL,
        whatsapp VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(20) DEFAULT 'free',
        plan_activated_at TIMESTAMP,
        plan_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`INSERT INTO admin_config (key, value) VALUES ('whatsapp_number', '22900000000') ON CONFLICT (key) DO NOTHING;`);
    await client.query(`INSERT INTO admin_config (key, value) VALUES ('app_name', 'Compta') ON CONFLICT (key) DO NOTHING;`);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
  } finally {
    client.release();
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'compta_salt_2024').digest('hex');
}

function generateToken(userId: string): string {
  return (jwt as any).sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return (jwt as any).verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide' });
  req.userId = payload.userId;
  next();
}

app.post('/api/auth/register', async (req, res) => {
  const { firstName, companyName, whatsapp, email, password } = req.body;
  if (!firstName || !companyName || !whatsapp || !password) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE whatsapp=$1', [whatsapp]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Ce numéro WhatsApp est déjà utilisé' });
    const hash = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (first_name, company_name, whatsapp, email, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, first_name, company_name, whatsapp, email, plan, plan_expires_at`,
      [firstName, companyName, whatsapp, email || null, hash]
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    return res.json({ token, user: { ...user, isPro: user.plan === 'pro' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { whatsapp, password } = req.body;
  if (!whatsapp || !password) return res.status(400).json({ error: 'Champs obligatoires manquants' });
  try {
    const hash = hashPassword(password);
    const result = await pool.query(
      `SELECT id, first_name, company_name, whatsapp, email, plan, plan_expires_at FROM users WHERE whatsapp=$1 AND password_hash=$2`,
      [whatsapp, hash]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Numéro WhatsApp ou mot de passe incorrect' });
    const user = result.rows[0];
    const token = generateToken(user.id);
    const isPro = user.plan === 'pro' && (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    return res.json({ token, user: { ...user, isPro } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, company_name, whatsapp, email, plan, plan_activated_at, plan_expires_at, created_at FROM users WHERE id=$1`,
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const user = result.rows[0];
    const isPro = user.plan === 'pro' && (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());
    return res.json({ ...user, isPro });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/config/whatsapp', async (_req, res) => {
  const r = await pool.query('SELECT value FROM admin_config WHERE key=$1', ['whatsapp_number']);
  return res.json({ whatsapp: r.rows[0]?.value || '22900000000' });
});

app.post('/api/validate-license', async (_req, res) => {
  return res.json({ valid: false, error: 'Utilisez le compte Pro.' });
});

app.get('/api/admin/users', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, first_name, company_name, whatsapp, email, plan, plan_activated_at, plan_expires_at, created_at FROM users ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/set-plan', async (req, res) => {
  const { userId, plan, months } = req.body;
  if (!userId || !plan) return res.status(400).json({ error: 'Paramètres manquants' });
  try {
    let expiresAt = null;
    let activatedAt = null;
    if (plan === 'pro') {
      activatedAt = new Date();
      if (months) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(months));
      }
    }
    await pool.query(`UPDATE users SET plan=$1, plan_activated_at=$2, plan_expires_at=$3, updated_at=NOW() WHERE id=$4`, [plan, activatedAt, expiresAt, userId]);
    const updated = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    return res.json({ success: true, user: updated.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/config', async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM admin_config');
    const config: Record<string, string> = {};
    result.rows.forEach(r => { config[r.key] = r.value; });
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/config', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'Paramètres manquants' });
  try {
    await pool.query(`INSERT INTO admin_config (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`, [key, value]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/checkmode', (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compta Admin</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0f0f0f;--s:#1a1a1a;--s2:#242424;--b:#2e2e2e;--t:#f0f0f0;--t2:#888;--g:#22c55e;--r:#ef4444;--bl:#3b82f6;--y:#eab308}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--t);min-height:100vh}.hdr{background:var(--s);border-bottom:1px solid var(--b);padding:18px 28px;display:flex;align-items:center;justify-content:space-between}.hdr h1{font-size:17px;font-weight:700}.badge{background:var(--t);color:#000;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}.wrap{max-width:1100px;margin:0 auto;padding:28px}.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:28px}.sc{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:18px}.sc .lbl{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}.sc .val{font-size:30px;font-weight:700}.green{color:var(--g)}.blue{color:var(--bl)}.sec{background:var(--s);border:1px solid var(--b);border-radius:14px;margin-bottom:20px;overflow:hidden}.sh{padding:18px 22px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between}.sh h2{font-size:13px;font-weight:600}table{width:100%;border-collapse:collapse}th{text-align:left;padding:11px 22px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--t2);border-bottom:1px solid var(--b)}td{padding:14px 22px;border-bottom:1px solid var(--b);font-size:13px}tr:last-child td{border-bottom:none}tr:hover td{background:var(--s2)}.pb{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}.pb.pro{background:rgba(34,197,94,.15);color:var(--g)}.pb.free{background:rgba(136,136,136,.15);color:var(--t2)}.btn{padding:7px 14px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;transition:opacity .2s}.btn:hover{opacity:.8}.btn-g{background:rgba(34,197,94,.2);color:var(--g)}.btn-r{background:rgba(239,68,68,.2);color:var(--r)}.btn-bl{background:rgba(59,130,246,.2);color:var(--bl)}.btn-p{background:var(--t);color:#000}.btn-sm{padding:5px 10px;font-size:11px}.fg{margin-bottom:14px}.fg label{display:block;font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}.fg input,.fg select{width:100%;background:var(--s2);border:1px solid var(--b);border-radius:8px;padding:9px 12px;color:var(--t);font-size:13px;outline:none}.fg input:focus,.fg select:focus{border-color:var(--t)}.cfs{padding:22px}.row{display:flex;gap:10px;align-items:flex-end;margin-bottom:10px}.row .fg{flex:1;margin:0}.toast{position:fixed;bottom:20px;right:20px;background:var(--s);border:1px solid var(--b);padding:12px 18px;border-radius:10px;font-size:13px;display:none;z-index:99}.toast.ok{border-color:var(--g);color:var(--g)}.toast.err{border-color:var(--r);color:var(--r)}.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:50;align-items:center;justify-content:center}.modal.open{display:flex}.mb{background:var(--s);border:1px solid var(--b);border-radius:18px;padding:28px;width:380px;max-width:90vw}.mb h3{font-size:15px;font-weight:700;margin-bottom:20px}.ma{display:flex;gap:8px;margin-top:18px;justify-content:flex-end}.empty{padding:40px;text-align:center;color:var(--t2)}.tag{font-size:11px;color:var(--t2)}select option{background:#1a1a1a}</style></head><body><div class="hdr"><h1>⚙️ Panel Admin — Compta</h1><span class="badge">CHECKMODE</span></div><div class="wrap"><div class="stats"><div class="sc"><div class="lbl">Total</div><div class="val" id="st">—</div></div><div class="sc"><div class="lbl">Pro</div><div class="val green" id="sp">—</div></div><div class="sc"><div class="lbl">Gratuit</div><div class="val" id="sf">—</div></div><div class="sc"><div class="lbl">Ce mois</div><div class="val blue" id="sm">—</div></div></div><div class="sec"><div class="sh"><h2>⚙️ Configuration</h2></div><div class="cfs"><div class="row"><div class="fg"><label>Numéro WhatsApp (paiements)</label><input type="text" id="cw" placeholder="22900000000"/></div><button class="btn btn-p" onclick="sc('whatsapp_number',document.getElementById('cw').value)">Enregistrer</button></div><div class="row"><div class="fg"><label>Nom de l'application</label><input type="text" id="ca" placeholder="Compta"/></div><button class="btn btn-p" onclick="sc('app_name',document.getElementById('ca').value)">Enregistrer</button></div></div></div><div class="sec"><div class="sh"><h2>👤 Utilisateurs</h2><button class="btn btn-bl btn-sm" onclick="lu()">↻ Actualiser</button></div><div id="uc"><div class="empty">Chargement...</div></div></div></div><div class="modal" id="pm"><div class="mb"><h3>✏️ Modifier le plan</h3><input type="hidden" id="mui"/><div id="minfo" style="margin-bottom:14px;padding:10px;background:var(--s2);border-radius:8px;font-size:12px;"></div><div class="fg"><label>Plan</label><select id="mp"><option value="free">🆓 Gratuit</option><option value="pro">⭐ Pro</option></select></div><div class="fg" id="mmg"><label>Durée (mois — vide = illimité)</label><input type="number" id="mm" placeholder="1, 3, 12..." min="1"/></div><div class="ma"><button class="btn" onclick="cp()">Annuler</button><button class="btn btn-p" onclick="sv()">Enregistrer</button></div></div></div><div class="toast" id="toast"></div><script>const A='';function st(m,t='ok'){const e=document.getElementById('toast');e.textContent=m;e.className='toast '+t;e.style.display='block';setTimeout(()=>e.style.display='none',3000)}async function lc(){const r=await fetch(A+'/api/admin/config');const c=await r.json();if(c.whatsapp_number)document.getElementById('cw').value=c.whatsapp_number;if(c.app_name)document.getElementById('ca').value=c.app_name}async function sc(k,v){if(!v.trim())return st('Valeur vide','err');const r=await fetch(A+'/api/admin/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:k,value:v})});const d=await r.json();d.success?st('Enregistré !'):st('Erreur: '+d.error,'err')}async function lu(){const uc=document.getElementById('uc');uc.innerHTML='<div class="empty">Chargement...</div>';const r=await fetch(A+'/api/admin/users');const u=await r.json();document.getElementById('st').textContent=u.length;document.getElementById('sp').textContent=u.filter(x=>x.plan==='pro').length;document.getElementById('sf').textContent=u.filter(x=>x.plan==='free').length;const now=new Date();document.getElementById('sm').textContent=u.filter(x=>{const d=new Date(x.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length;if(!u.length){uc.innerHTML='<div class="empty">Aucun utilisateur</div>';return}const rows=u.map(u=>{const pro=u.plan==='pro';const exp=u.plan_expires_at?new Date(u.plan_expires_at).toLocaleDateString('fr-FR'):'∞';const cr=new Date(u.created_at).toLocaleDateString('fr-FR');return '<tr><td><div style="font-weight:600">'+u.first_name+'</div><div class="tag">'+u.company_name+'</div></td><td><div>'+u.whatsapp+'</div>'+(u.email?'<div class="tag">'+u.email+'</div>':'')+'</td><td><span class="pb '+u.plan+'">'+(pro?'⭐ PRO':'🆓 Gratuit')+'</span>'+(pro?'<div class="tag" style="margin-top:4px">Expire: '+exp+'</div>':'')+'</td><td class="tag">'+cr+'</td><td><button class="btn '+(pro?'btn-r':'btn-g')+' btn-sm" onclick=\'op('+JSON.stringify(u)+')\'>→ '+(pro?'Passer Gratuit':'Passer Pro')+'</button></td></tr>'}).join('');uc.innerHTML='<table><thead><tr><th>Utilisateur</th><th>Contact</th><th>Plan</th><th>Inscrit</th><th>Action</th></tr></thead><tbody>'+rows+'</tbody></table>'}function op(u){document.getElementById('mui').value=u.id;document.getElementById('minfo').innerHTML='<strong>'+u.first_name+'</strong> — '+u.company_name+'<br><span class="tag">'+u.whatsapp+'</span>';document.getElementById('mp').value=u.plan==='pro'?'free':'pro';document.getElementById('mm').value='';document.getElementById('pm').classList.add('open')}function cp(){document.getElementById('pm').classList.remove('open')}document.getElementById('mp').addEventListener('change',function(){document.getElementById('mmg').style.display=this.value==='pro'?'block':'none'});async function sv(){const uid=document.getElementById('mui').value;const pl=document.getElementById('mp').value;const mo=document.getElementById('mm').value;const r=await fetch(A+'/api/admin/set-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:uid,plan:pl,months:mo||null})});const d=await r.json();if(d.success){st('Plan mis à jour !');cp();lu()}else st('Erreur: '+d.error,'err')}lc();lu();</script></body></html>`);
});

initDB().catch(err => console.warn("DB init failed (will retry on first request):", err?.message)).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:' + PORT);
    console.log('Admin panel: http://localhost:' + PORT + '/checkmode');
  });
});
