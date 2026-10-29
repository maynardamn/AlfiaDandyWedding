// Cloudflare Pages Function. Needs: D1 binding "DB"; env vars SECRET_CODE, AFTER_PARTY_INFO.
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
const cut=(v,n)=>String(v||'').trim().slice(0,n);

export async function onRequest({request:r,env}){
  const p=new URL(r.url).pathname.replace(/^\/api\//,'');
  const post=r.method==='POST';
  const b=post?await r.json().catch(()=>({})):{};

  if(p==='rsvp'&&post){
    const name=cut(b.name,80); if(!name) return J({ok:false},400);
    await env.DB.prepare('INSERT INTO rsvp(name,attending,guests,message) VALUES(?,?,?,?)')
      .bind(name,b.attending==='no'?'no':'yes',b.attending==='no'?0:Math.min(Math.max(+b.guests||1,1),10),cut(b.message,300)).run();
    return J({ok:true});
  }
  if(p==='wishes'){
    const {results}=await env.DB.prepare("SELECT name,message FROM rsvp WHERE message!='' ORDER BY id DESC LIMIT 30").all();
    return J(results);
  }
  if(p==='gifts'&&!post){
    const {results}=await env.DB.prepare('SELECT id FROM gifts').all();
    return J(results.map(x=>x.id));
  }
  if(p==='gifts'&&post){
    try{ await env.DB.prepare('INSERT INTO gifts(id,claimed_by) VALUES(?,?)').bind(cut(b.id,40),cut(b.by,80)).run(); return J({ok:true}); }
    catch(e){ return J({ok:false},409); } // already claimed
  }
  if(p==='secret'&&post){
    const ok=env.SECRET_CODE&&cut(b.code,60).toLowerCase()===String(env.SECRET_CODE).toLowerCase();
    return ok?J({ok:true,info:env.AFTER_PARTY_INFO||''}):J({ok:false},401);
  }
  return J({error:'not found'},404);
}
