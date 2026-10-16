import { neon } from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL);
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 try{
  const rows=await sql`SELECT logo_data,logo_mime,updated_at FROM public.cana_site_settings WHERE id=true`;
  const row=rows[0];
  if(row?.logo_data){
   const match=row.logo_data.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([\s\S]+)$/);
   if(match){const data=Buffer.from(match[2],'base64');res.setHeader('Content-Type',match[1]);res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=3600');res.setHeader('ETag','"cana-'+Buffer.from(String(row.updated_at)).toString('hex')+'"');return res.status(200).send(data);}
  }
  res.setHeader('Cache-Control','public, max-age=300, stale-while-revalidate=3600');return res.redirect(302,'/brand/cana-logo.png');
 }catch(e){console.error(e);return res.redirect(302,'/brand/cana-logo.png')}
}