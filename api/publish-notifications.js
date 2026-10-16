import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

const sql=neon(process.env.DATABASE_URL);
const json=(res,status,data)=>res.status(status).setHeader('Cache-Control','no-store').json(data);
export default async function handler(req,res){
 if(!process.env.DATABASE_URL)return json(res,500,{error:'Base de données non configurée.'});
 const cron=req.method==='GET';
 if(cron&&process.env.CRON_SECRET&&req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return json(res,401,{error:'Non autorisé.'});
 if(!cron&&req.method!=='POST')return json(res,405,{error:'Méthode non autorisée.'});
 try{
  if(!cron){
   const session=String(req.body?.session||'');
   if(!session)return json(res,401,{error:'Session administrateur requise.'});
   const auth=await sql`SELECT public.cana_api('admin_me','{}'::jsonb,${session}) AS data`;
   if(!auth[0]?.data?.authenticated)return json(res,401,{error:'Session administrateur invalide.'});
  }
  const settings=await sql`SELECT key,value FROM public.app_settings WHERE key IN ('vapid_public_key','vapid_private_key','vapid_subject')`;
  const config=Object.fromEntries(settings.map(x=>[x.key,x.value]));
  if(!config.vapid_public_key||!config.vapid_private_key||!config.vapid_subject)return json(res,500,{error:'Clés de notification non configurées.'});
  webpush.setVapidDetails(config.vapid_subject,config.vapid_public_key,config.vapid_private_key);
  const menuId=String(req.body?.menu_id||'');
  const menus=menuId
   ? await sql`SELECT m.id,m.title,m.service_date FROM public.menus m WHERE m.id=${menuId}::uuid AND m.status IN ('scheduled','published') AND m.publish_at<=now() AND m.service_date=current_date`
   : await sql`SELECT m.id,m.title,m.service_date FROM public.menus m LEFT JOIN public.push_notification_log l ON l.menu_id=m.id WHERE m.status IN ('scheduled','published') AND m.publish_at<=now() AND m.service_date=current_date AND l.menu_id IS NULL ORDER BY m.publish_at`;
  if(!menus.length)return json(res,200,{ok:true,sent:0,reason:'Aucun menu publié à notifier.'});
  const subscribers=await sql`SELECT endpoint,p256dh,auth FROM public.push_subscriptions WHERE endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL`;
  if(!subscribers.length)return json(res,200,{ok:true,sent:0,reason:'Aucun appareil inscrit.'});
  let totalSent=0;
  for(const menu of menus){
   const dishes=await sql`SELECT name FROM public.menu_items WHERE menu_id=${menu.id}::uuid ORDER BY position,name LIMIT 4`;
   const names=dishes.map(d=>d.name).filter(Boolean);
   const payload=JSON.stringify({title:'Les Délices de CANA',body:names.length?'Le menu du jour est disponible : '+names.join(', ')+(dishes.length>4?'…':''):'Le menu du jour vient d’être publié.',url:'/',tag:'cana-menu-'+menu.id});
   let sent=0;
   for(const sub of subscribers){
    try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:86400});sent++;totalSent++}
    catch(e){if(e.statusCode===404||e.statusCode===410){try{await sql`DELETE FROM public.push_subscriptions WHERE endpoint=${sub.endpoint}`}catch{}}else console.error('CANA push delivery failed',e.statusCode||e.message)}
   }
   if(sent>0)await sql`INSERT INTO public.push_notification_log(menu_id,sent_at,recipient_count) VALUES(${menu.id}::uuid,now(),${sent}) ON CONFLICT(menu_id) DO NOTHING`;
  }
  return json(res,200,{ok:true,sent:totalSent,menus:menus.length});
 }catch(e){console.error('CANA push notification error',e);return json(res,500,{error:'Échec de l’envoi des notifications.'})}
}
