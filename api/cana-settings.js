import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const headers = {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'};
export default async function handler(req,res){
 Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!process.env.DATABASE_URL)return res.status(500).json({error:'DATABASE_URL non configurée.'});
 try{
  if(req.method==='GET'){
   const rows=await sql`SELECT contact_phone,contact_email,address,latitude,longitude,CASE WHEN logo_data<>'' THEN true ELSE false END AS has_logo,updated_at FROM public.cana_site_settings WHERE id=true`;
   return res.status(200).json(rows[0]||{contact_phone:'',contact_email:'',address:'',latitude:null,longitude:null,has_logo:false});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  const {p_session,settings}=req.body||{};
  if(!p_session||typeof p_session!=='string')return res.status(401).json({error:'Connexion administrateur requise.'});
  const auth=await sql`SELECT public.cana_api('admin_me','{}'::jsonb,${p_session}) AS data`;
  if(!auth[0]?.data?.authenticated)return res.status(401).json({error:'Session administrateur invalide.'});
  const s=settings||{};
  const phone=String(s.contact_phone||'').slice(0,80),email=String(s.contact_email||'').slice(0,200),address=String(s.address||'').slice(0,500);
  const lat=s.latitude===''||s.latitude==null?null:Number(s.latitude),lon=s.longitude===''||s.longitude==null?null:Number(s.longitude);
  if((lat!==null&&(!Number.isFinite(lat)||lat < -90||lat > 90))||(lon!==null&&(!Number.isFinite(lon)||lon < -180||lon > 180)))return res.status(400).json({error:'Coordonnées géographiques invalides.'});
  let logo=typeof s.logo_data==='string'?s.logo_data:'';let mime=String(s.logo_mime||'image/jpeg');
  if(logo && (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo)||logo.length>5500000))return res.status(400).json({error:'Logo invalide ou trop volumineux (maximum 4 Mo conseillé).'});
  if(!['image/jpeg','image/png','image/webp','image/svg+xml'].includes(mime))return res.status(400).json({error:'Format de logo non pris en charge.'});
  await sql`INSERT INTO public.cana_site_settings(id,contact_phone,contact_email,address,latitude,longitude,logo_data,logo_mime,updated_at)
   VALUES(true,${phone},${email},${address},${lat},${lon},${logo},${mime},now())
   ON CONFLICT(id) DO UPDATE SET contact_phone=excluded.contact_phone,contact_email=excluded.contact_email,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,logo_data=CASE WHEN excluded.logo_data<>'' THEN excluded.logo_data ELSE public.cana_site_settings.logo_data END,logo_mime=CASE WHEN excluded.logo_data<>'' THEN excluded.logo_mime ELSE public.cana_site_settings.logo_mime END,updated_at=now()`;
  return res.status(200).json({ok:true,message:'Paramètres du site enregistrés.'});
 }catch(e){console.error('CANA settings error',e);return res.status(500).json({error:e?.message||'Erreur paramètres du site.'});}
}