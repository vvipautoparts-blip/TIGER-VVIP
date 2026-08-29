export const CAPABILITY_STATES=Object.freeze(['READ_WRITE','READ_ONLY','UNAVAILABLE','BLOCKED_CAPABILITY']);
export function capabilityFor(client,listAction,deleteAction){
  if(client?.unavailable===true)return 'UNAVAILABLE';
  if(!client||typeof client[listAction]!=='function')return 'BLOCKED_CAPABILITY';
  return typeof client[deleteAction]==='function'?'READ_WRITE':'READ_ONLY';
}
export async function collectPages(action,params={}){
  const objects=[];let cursor=null;const seen=new Set();
  do{
    if(cursor!==null&&seen.has(cursor))throw new Error('REMOTE_PAGINATION_LOOP');
    if(cursor!==null)seen.add(cursor);
    const page=await action({...params,cursor});
    if(!page||!Array.isArray(page.items))throw new Error('REMOTE_PAGE_INVALID');
    objects.push(...page.items);
    cursor=page.next_cursor??null;
  }while(cursor!==null);
  return objects;
}
export function requireAionDisposalEvidence(evidence,expectedTargetId){
  if(!evidence||evidence.verified_stage!=='VERIFY'||evidence.requires_aion_disposal_gate!==true||!evidence.lease_digest)throw new Error('REMOTE_AION_EVIDENCE_REQUIRED');
  if(evidence.target_id!==expectedTargetId)throw new Error('REMOTE_AION_TARGET_MISMATCH');
  return true;
}
export function createRemotePlaneAdapter({plane,client,listAction,deleteAction,normalize}){
  const capability=()=>capabilityFor(client,listAction,deleteAction);
  return Object.freeze({
    plane,
    capability,
    async observe(){
      const state=capability();
      if(!['READ_ONLY','READ_WRITE'].includes(state))return Object.freeze({plane,state,objects:[]});
      const raw=await collectPages(args=>client[listAction](args));
      return Object.freeze({plane,state,objects:raw.map(normalize).sort((a,b)=>String(a.id).localeCompare(String(b.id)))});
    },
    async disposeWithAionEvidence(targetId,evidence){
      const state=capability();
      if(state!=='READ_WRITE')return Object.freeze({plane,state,disposed:false,target_id:targetId});
      requireAionDisposalEvidence(evidence,targetId);
      const result=await client[deleteAction]({target_id:targetId,evidence_ref:evidence.lease_digest});
      return Object.freeze({plane,state:'DISPOSAL_REQUESTED',disposed:true,target_id:targetId,result:result??null});
    }
  });
}
