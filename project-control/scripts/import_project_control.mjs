/**
 * VVIP TIGER Project Control importer using a direct PostgreSQL connection.
 * Run on a trusted machine/server only. Never expose DATABASE_URL in a browser.
 * Usage:
 *   npm i postgres
 *   DATABASE_URL=postgresql://... node scripts/import_project_control.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Missing DATABASE_URL');
const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
const read = async (name) => JSON.parse(await fs.readFile(path.join(root, 'data', name), 'utf8'));
const phases = await read('phases.json');
const tasks = await read('tasks.json');
const deps = await read('task_dependencies.json');

const phaseRows = phases.map(p => ({
  code: p.code, title: p.title, order_index: p.order,
  goal: p.meta['هدف المرحلة'] ?? null,
  duration_text: p.meta['المدة المتوقعة'] ?? null,
  cumulative_percent: Number((p.meta['الإنجاز التراكمي بعد الإغلاق'] ?? '').replace(/[^0-9.]/g,'')) || null,
  responsibility: p.meta['المسؤولية'] ?? null,
  transition_gate: p.meta['بوابة الانتقال'] ?? null,
  wave: p.wave, priority: p.priority, workflow_status: p.workflow_status,
  baseline_status: p.baseline_status,
}));
const taskRows = tasks.map(t => ({
  code: t.code, phase_code: t.phase_code, order_index: t.order, title: t.title,
  goal: t.meta['الهدف'] ?? null,
  user_benefit: t.meta['فائدة المستخدم'] ?? null,
  platform_benefit: t.meta['فائدة المنصة'] ?? null,
  prerequisites: t.meta['المتطلبات السابقة'] ?? null,
  responsible_roles: t.meta['الدور المسؤول'] ?? null,
  estimate_text: t.meta['تقدير المهمة'] ?? null,
  reference_path: t.meta['المسار المرجعي'] ?? null,
  wave: t.wave, priority: t.priority, workflow_status: t.workflow_status,
  baseline_status: t.baseline_status, source_document: t.source_document,
  source_heading: t.source_heading, metadata: { tags: t.tags },
}));
const depRows = deps.map(d => ({
  task_code: d.task_code,
  depends_on_task_code: d.depends_on_task_code,
  dependency_type: d.type,
}));

await sql.begin(async tx => {
  if (phaseRows.length) await tx`
    insert into project_control.phases ${tx(phaseRows)}
    on conflict (code) do update set
      title=excluded.title, order_index=excluded.order_index, goal=excluded.goal,
      duration_text=excluded.duration_text, cumulative_percent=excluded.cumulative_percent,
      responsibility=excluded.responsibility, transition_gate=excluded.transition_gate,
      wave=excluded.wave, priority=excluded.priority, baseline_status=excluded.baseline_status`;
  if (taskRows.length) await tx`
    insert into project_control.tasks ${tx(taskRows)}
    on conflict (code) do update set
      phase_code=excluded.phase_code, order_index=excluded.order_index, title=excluded.title,
      goal=excluded.goal, user_benefit=excluded.user_benefit, platform_benefit=excluded.platform_benefit,
      prerequisites=excluded.prerequisites, responsible_roles=excluded.responsible_roles,
      estimate_text=excluded.estimate_text, reference_path=excluded.reference_path,
      wave=excluded.wave, priority=excluded.priority, baseline_status=excluded.baseline_status,
      source_document=excluded.source_document, source_heading=excluded.source_heading, metadata=excluded.metadata`;
  if (depRows.length) await tx`
    insert into project_control.task_dependencies ${tx(depRows)}
    on conflict (task_code, depends_on_task_code) do update set
      dependency_type=excluded.dependency_type`;
});
await sql.end();
console.log(`Imported ${phaseRows.length} phases, ${taskRows.length} tasks, and ${depRows.length} dependencies.`);
console.log('Use database/002_project_control_seed.sql to import all detailed steps and acceptance rows.');
