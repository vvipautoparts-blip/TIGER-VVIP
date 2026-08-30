import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const FORBIDDEN = /\b(prune|rm|remove|delete|stop|down|reset|destroy)\b|--volumes\b|--force\b/i;
function safeRun(cmd, args, options = {}) {
  const joined = [cmd, ...args].join(' ');
  if (FORBIDDEN.test(joined)) throw new Error(`OBSERVER_DESTRUCTIVE_COMMAND_BLOCKED:${joined}`);
  try {
    return {ok:true, stdout:execFileSync(cmd, args, {cwd: options.cwd, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim()};
  } catch (error) {
    return {ok:false, error_code:error.code ?? 'COMMAND_FAILED', stderr:String(error.stderr ?? '').trim()};
  }
}
function parseDf(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  const row = lines.at(-1)?.trim().split(/\s+/) ?? [];
  if (row.length < 6) return {available:false, reason:'MALFORMED_DF'};
  const blocks = Number(row[1]); const used = Number(row[2]); const available = Number(row[3]);
  if (![blocks,used,available].every(Number.isFinite)) return {available:false, reason:'MALFORMED_DF'};
  return {available:true,total_bytes:blocks*1024,used_bytes:used*1024,free_bytes:available*1024,mount:row.at(-1)};
}
function parseDfInodes(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  const row = lines.at(-1)?.trim().split(/\s+/) ?? [];
  if (row.length < 6) return {available:false, reason:'MALFORMED_DF_INODES'};
  const total = Number(row[1]); const used = Number(row[2]); const free = Number(row[3]);
  if (![total,used,free].every(Number.isFinite)) return {available:false, reason:'MALFORMED_DF_INODES'};
  return {available:true,total_inodes:total,used_inodes:used,free_inodes:free,mount:row.at(-1)};
}
function sha256File(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function walk(root, limit = 5000) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const current = stack.pop();
    let entries; try { entries = fs.readdirSync(current, {withFileTypes:true}); } catch { continue; }
    entries.sort((a,b)=>b.name.localeCompare(a.name));
    for (const entry of entries) {
      if (['.git','node_modules'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      let stat; try { stat = fs.lstatSync(full); } catch { continue; }
      const rel = path.relative(root, full).replaceAll(path.sep, '/');
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push({id:`file:${rel}`,plane:'repository',path:rel,size_bytes:stat.size,sha256:sha256File(full),mtime_ms:Math.trunc(stat.mtimeMs)});
    }
  }
  return out.sort((a,b)=>a.id.localeCompare(b.id));
}

export function observeLocalPlanes(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const run = options.run ?? ((cmd,args)=>safeRun(cmd,args,{cwd:root}));
  const df = run('df',['-Pk',root]);
  const dfi = run('df',['-Pi',root]);
  const gitHead = run('git',['rev-parse','HEAD']);
  const gitStatus = run('git',['status','--porcelain=v1']);
  const dockerImages = run('docker',['image','ls','--no-trunc','--format','{{json .}}']);
  const dockerContainers = run('docker',['container','ls','-a','--no-trunc','--format','{{json .}}']);
  const dockerVolumes = run('docker',['volume','ls','--format','{{json .}}']);
  const buildkit = run('docker',['buildx','version']);
  const supabase = run('supabase',['status','--output','json']);
  return {
    schema_version:'TIGER-PHOENIX-OBSERVATION-1',
    environment_identity: options.environmentIdentity ?? `${os.hostname()}:${root}`,
    observed_at: options.observedAt ?? new Date().toISOString(),
    filesystem:{capacity:df.ok?parseDf(df.stdout):{available:false,reason:'DF_UNAVAILABLE'},inodes:dfi.ok?parseDfInodes(dfi.stdout):{available:false,reason:'DF_INODE_UNAVAILABLE'}},
    git:{available:gitHead.ok,head:gitHead.ok?gitHead.stdout:null,status:gitStatus.ok?gitStatus.stdout:null},
    docker:{available:dockerImages.ok||dockerContainers.ok||dockerVolumes.ok,images:dockerImages,containers:dockerContainers,volumes:dockerVolumes},
    buildkit:{available:buildkit.ok,detail:buildkit.ok?buildkit.stdout:null},
    supabase_local:{available:supabase.ok,detail:supabase.ok?supabase.stdout:null},
    objects: options.includeRepositoryObjects === false ? [] : walk(root, options.objectLimit ?? 5000),
    plane_coverage:[
      {plane:'repository',state:'OBSERVED'},
      {plane:'codespace_filesystem',state:df.ok?'OBSERVED':'UNAVAILABLE'},
      {plane:'docker_and_buildkit',state:(dockerImages.ok||buildkit.ok)?'OBSERVED':'UNAVAILABLE'},
      {plane:'supabase_local',state:supabase.ok?'OBSERVED':'UNAVAILABLE'},
      {plane:'github_actions_artifacts_and_logs',state:'BLOCKED_CAPABILITY'},
      {plane:'github_actions_cache',state:'BLOCKED_CAPABILITY'},
      {plane:'codespaces_and_prebuilds',state:'BLOCKED_CAPABILITY'}
    ]
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(observeLocalPlanes(), null, 2) + '\n');
}
