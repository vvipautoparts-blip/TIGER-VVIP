import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { observeLocalPlanes } from './phoenix-observer.mjs';

const POLICY_KEYS = new Set(['schema_version','status','safety_factor','minimums','operations']);
const MINIMUM_KEYS = new Set(['free_bytes','free_bytes_ratio','free_inodes','free_inodes_ratio']);
const OP_KEYS = new Set(['category','default_growth_bytes','default_inode_growth']);
function unknownKeys(obj, allowed, label){for(const k of Object.keys(obj??{})) if(!allowed.has(k)) throw new Error(`${label}_UNKNOWN_KEY:${k}`);}
function finiteNonNegative(v){return Number.isFinite(v)&&v>=0;}

export function loadStoragePressurePolicy(policyPath){
  const p=JSON.parse(fs.readFileSync(policyPath,'utf8'));
  unknownKeys(p,POLICY_KEYS,'PRESSURE_POLICY');
  if(p.schema_version!=='TIGER-PHOENIX-STORAGE-PRESSURE-1'||p.status!=='CURRENT_ONLY') throw new Error('PRESSURE_POLICY_IDENTITY_INVALID');
  if(!Number.isFinite(p.safety_factor)||p.safety_factor<1) throw new Error('PRESSURE_POLICY_SAFETY_FACTOR_INVALID');
  unknownKeys(p.minimums,MINIMUM_KEYS,'PRESSURE_MINIMUMS');
  const m=p.minimums??{};
  if(!finiteNonNegative(m.free_bytes)||!finiteNonNegative(m.free_inodes)||!Number.isFinite(m.free_bytes_ratio)||m.free_bytes_ratio<0||m.free_bytes_ratio>=1||!Number.isFinite(m.free_inodes_ratio)||m.free_inodes_ratio<0||m.free_inodes_ratio>=1) throw new Error('PRESSURE_POLICY_MINIMUMS_INVALID');
  if(!p.operations||typeof p.operations!=='object'||Array.isArray(p.operations)||Object.keys(p.operations).length===0) throw new Error('PRESSURE_POLICY_OPERATIONS_REQUIRED');
  for(const [name,op] of Object.entries(p.operations)){unknownKeys(op,OP_KEYS,`PRESSURE_OPERATION_${name}`);if(!op.category||!finiteNonNegative(op.default_growth_bytes)||!finiteNonNegative(op.default_inode_growth)) throw new Error(`PRESSURE_OPERATION_INVALID:${name}`);}
  return Object.freeze(p);
}

export function checkHeadroom(observation, operationType, projection={}, policy){
  if(!policy?.operations?.[operationType]) return Object.freeze({state:'BLOCKED_UNKNOWN_OPERATION',operation:operationType});
  const cap=observation?.filesystem?.capacity, ino=observation?.filesystem?.inodes;
  if(cap?.available!==true||ino?.available!==true) return Object.freeze({state:'BLOCKED_INSUFFICIENT_OBSERVATION',operation:operationType});
  const nums=[cap.total_bytes,cap.free_bytes,ino.total_inodes,ino.free_inodes];
  if(!nums.every(finiteNonNegative)||cap.total_bytes<=0||ino.total_inodes<=0) return Object.freeze({state:'BLOCKED_INSUFFICIENT_OBSERVATION',operation:operationType});
  const op=policy.operations[operationType];
  if(projection.category!==undefined&&projection.category!==op.category) return Object.freeze({state:'BLOCKED_CATEGORY_MISMATCH',operation:operationType,expected_category:op.category});
  const growthBytes=projection.projected_growth_bytes??op.default_growth_bytes;
  const growthInodes=projection.projected_inode_growth??op.default_inode_growth;
  if(!finiteNonNegative(growthBytes)||!finiteNonNegative(growthInodes)) return Object.freeze({state:'BLOCKED_INVALID_PROJECTION',operation:operationType});
  const reserveBytes=Math.ceil(growthBytes*policy.safety_factor), reserveInodes=Math.ceil(growthInodes*policy.safety_factor);
  const postFreeBytes=cap.free_bytes-reserveBytes, postFreeInodes=ino.free_inodes-reserveInodes;
  const postByteRatio=postFreeBytes/cap.total_bytes, postInodeRatio=postFreeInodes/ino.total_inodes;
  const reasons=[];
  if(postFreeBytes<policy.minimums.free_bytes) reasons.push('FREE_BYTES_FLOOR');
  if(postByteRatio<policy.minimums.free_bytes_ratio) reasons.push('FREE_BYTES_RATIO');
  if(postFreeInodes<policy.minimums.free_inodes) reasons.push('FREE_INODES_FLOOR');
  if(postInodeRatio<policy.minimums.free_inodes_ratio) reasons.push('FREE_INODES_RATIO');
  return Object.freeze({state:reasons.length?'BLOCKED_STORAGE_PRESSURE':'GREEN_HEADROOM',operation:operationType,category:op.category,projected_growth_bytes:growthBytes,projected_inode_growth:growthInodes,reserved_growth_bytes:reserveBytes,reserved_inode_growth:reserveInodes,post_free_bytes:postFreeBytes,post_free_inodes:postFreeInodes,reasons});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const root=path.resolve(arg('--root')??process.cwd());
  const policyPath=path.resolve(arg('--policy')??path.join(root,'project-control/cleanup/phoenix-storage-pressure-policy.v1.json'));
  const operation=arg('--operation');
  if(!operation){console.error('HEADROOM_OPERATION_REQUIRED');process.exit(64);}
  const projected=arg('--projected-growth-bytes'); const projectedInodes=arg('--projected-inode-growth'); const category=arg('--category');
  const projection={}; if(projected!==null) projection.projected_growth_bytes=Number(projected); if(projectedInodes!==null) projection.projected_inode_growth=Number(projectedInodes); if(category!==null) projection.category=category;
  const observation=observeLocalPlanes({root,includeRepositoryObjects:false});
  const result=checkHeadroom(observation,operation,projection,loadStoragePressurePolicy(policyPath));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exit(result.state==='GREEN_HEADROOM'?0:78);
}
