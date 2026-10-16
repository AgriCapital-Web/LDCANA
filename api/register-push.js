import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Headers','content-type');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 if(!process.env.DATABASE_URL)return res.status(500).json({error:'Base de données non configurée.'});
 try{
  const sub=req.body?.subscription;
  const endpoint=String(sub?.endpoint||'');
  const p256dh=String(sub?.keys?.p256dh||'');
  const auth=String(sub?.keys?.auth||'');
  if(!endpoint.startsWith('https://')||!p256dh||!auth)return res.status(400).json({error:'Abonnement de notification invalide.'});
  if(endpoint.length>3000||p256dh.length>500||auth.length>500)return res.status(400).json({error:'Abonnement trop volumineux.'});
  await sql`INSERT INTO public.push_subscriptions(admin_user_id,phone,endpoint,p256dh,auth,last_seen_at)
   VALUES(NULL,NULL,${endpoint},${p256dh},${auth},now())
   ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,last_seen_at=now()`;
  return res.status(200).json({ok:true});
 }catch(e){console.error('CANA push registration failed',e);return res.status(500).json({error:'Impossible d’enregistrer les notifications.'})}
}
