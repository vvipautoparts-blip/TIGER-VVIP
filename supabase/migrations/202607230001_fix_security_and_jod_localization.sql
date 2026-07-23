-- 1. JO Localization
UPDATE project_control.country_capabilities SET default_currency = 'JOD', supported_languages = ARRAY['ar', 'en'], data_region = 'me-south-1' WHERE country_code = 'JO';

-- 2. RLS Enable
ALTER TABLE project_control.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.task_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.scale_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.search_facets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_control.evidence_records ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Allow read for authenticated users" ON project_control.source_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.task_acceptance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.task_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.scale_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.search_facets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.test_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated users" ON project_control.evidence_records FOR SELECT TO authenticated USING (true);
