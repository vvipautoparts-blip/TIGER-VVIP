from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

try:
    from .capsule import build_capsule
    from .constants import ACTION_PINS, H0, MIGRATION_PATH, MIGRATION_SHA256, REPOSITORY
    from .decision import evaluate
    from .validate_evidence import validate_document
except ImportError:
    from capsule import build_capsule
    from constants import ACTION_PINS, H0, MIGRATION_PATH, MIGRATION_SHA256, REPOSITORY
    from decision import evaluate
    from validate_evidence import validate_document

_CONTROL_SHA_RE = re.compile(r'^[0-9a-f]{40}$')


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def _verify_static_proof(path: Path) -> dict:
    proof = _load_json(path)
    if proof.get('status') != 'PASS' or proof.get('tests') != 10 or proof.get('sha256') != MIGRATION_SHA256:
        raise ValueError('static proof invalid or does not match frozen Phase B identity')
    return proof


def prepare_attestation(control_root: Path, source_root: Path, control_sha: str, staging_evidence_path: Path, static_proof_path: Path, output_root: Path) -> dict:
    control_root = Path(control_root)
    source_root = Path(source_root)
    staging_evidence_path = Path(staging_evidence_path)
    static_proof_path = Path(static_proof_path)
    output_root = Path(output_root)
    if not _CONTROL_SHA_RE.fullmatch(control_sha):
        raise ValueError('control-plane SHA must be an exact 40-character lowercase git SHA')
    migration = source_root / MIGRATION_PATH
    if not migration.is_file():
        raise ValueError(f'frozen migration missing: {MIGRATION_PATH}')
    migration_bytes = migration.read_bytes()
    migration_digest = hashlib.sha256(migration_bytes).hexdigest()
    if migration_digest != MIGRATION_SHA256:
        raise ValueError(f'frozen migration byte mismatch: {migration_digest}')
    static_proof = _verify_static_proof(static_proof_path)
    staging = _load_json(staging_evidence_path)
    validate_document('staging', staging)
    machine_flags = {
        'source_exact': True, 'byte_hash_match': True, 'static_tests_pass': static_proof['status'] == 'PASS',
        'staging_identity_valid': staging['staging_identity']['healthy'] is True and staging['staging_identity']['production_ref_equal'] is False,
        'ledger_precheck_valid': staging['classification']['state'] in ('STATE_A', 'STATE_C'),
        'schema_precheck_valid': staging['schema_before']['canonical'] is True, 'phase_b_only': True,
        'queue_execution_not_used': staging['execution']['pending_queue_runner_used'] is False,
        'ledger_postcheck_valid': staging['ledger_after']['phase_b_present'] is True and staging['ledger_after']['entry_count'] == 1,
        'schema_postcheck_valid': staging['schema_after']['canonical'] is True,
        'runtime_security_pass': staging['runtime']['status'] == 'PASS',
        'phase_a_regression_pass': staging['phase_a_regression']['status'] == 'PASS',
        'synthetic_residue_zero': all(value == 0 for value in staging['synthetic_residue'].values()), 'capsule_complete': True,
    }
    machine_decision = evaluate(machine_flags)
    if machine_decision['state'] != 'EVIDENCE_COMPLETE':
        raise ValueError(f'machine evidence incomplete: {machine_decision}')
    if output_root.exists(): shutil.rmtree(output_root)
    output_root.mkdir(parents=True)
    inputs = output_root / 'capsule-inputs'; inputs.mkdir()
    manifest = {
        'schema': 'vvip.tiger/release-capsule/v1', 'release_id': 'global-launch-phase-b',
        'source': {'repository': REPOSITORY, 'commit': H0, 'migration_path': MIGRATION_PATH, 'migration_sha256': MIGRATION_SHA256, 'control_plane_commit': control_sha},
        'target': {'environment': 'staging', 'resolved_project_ref': staging['staging_identity']['project_ref'], 'production_target': False},
        'execution': {'scope': 'single-migration', 'pending_queue_runner_used': False, 'manual_sql_mutation': False},
        'verification': {'static_contract': 'PASS', 'runtime': staging['runtime']['status'], 'security': 'PASS' if staging['advisors']['material_security_findings'] == 0 else 'FAIL', 'phase_a_regression': staging['phase_a_regression']['status'], 'synthetic_residue': 'ZERO'},
        'decision': {'state': 'EVIDENCE_COMPLETE', 'steel_shield_pin': 'NOT_PERFORMED', 'production': 'BLOCKED'},
    }
    validate_document('release', manifest)
    (inputs / 'migration.sql').write_bytes(migration_bytes)
    (inputs / 'source-commit.txt').write_text(H0 + '\n', encoding='utf-8')
    (inputs / 'control-plane-commit.txt').write_text(control_sha + '\n', encoding='utf-8')
    (inputs / 'migration.sha256').write_text(MIGRATION_SHA256 + '\n', encoding='utf-8')
    _write_json(inputs / 'release-manifest.json', manifest)
    _write_json(inputs / 'toolchain.json', {'python': '3.12', 'node': '22', 'postgres': '17', 'github_action_pins': ACTION_PINS})
    evidence_out = inputs / 'evidence'; evidence_out.mkdir()
    for evidence_file in sorted(staging_evidence_path.parent.glob('*.json')):
        _write_json(evidence_out / evidence_file.name, _load_json(evidence_file))
    _write_json(evidence_out / 'static-proof.json', static_proof)
    _write_json(evidence_out / 'machine-decision.json', machine_decision)
    capsule = build_capsule(inputs, output_root / 'phase-b-sovereign-release-capsule')
    predicate = {
        'schema': 'vvip.tiger/attestation/staging-promotion/v1', 'source_repository': REPOSITORY, 'source_commit': H0,
        'migration_path': MIGRATION_PATH, 'migration_sha256': MIGRATION_SHA256, 'control_plane_commit': control_sha,
        'capsule_sha256': capsule['sha256'],
        'staging': {'branch_name': staging['staging_identity']['branch_name'], 'project_ref': staging['staging_identity']['project_ref'], 'parent_project_ref': staging['staging_identity']['parent_project_ref'], 'production_ref_equal': staging['staging_identity']['production_ref_equal']},
        'classification': staging['classification']['state'], 'execution': staging['execution'], 'runtime_status': staging['runtime']['status'],
        'phase_a_regression_status': staging['phase_a_regression']['status'], 'synthetic_residue': staging['synthetic_residue'],
        'material_security_findings': staging['advisors']['material_security_findings'], 'decision': 'EVIDENCE_COMPLETE',
    }
    predicate_path = output_root / 'vvip-staging-predicate.json'; _write_json(predicate_path, predicate)
    manifest_path = output_root / 'release-manifest.json'; _write_json(manifest_path, manifest)
    return {'archive': capsule['archive'], 'capsule_sha256': capsule['sha256'], 'capsule_sha256_file': capsule['sha256_file'], 'manifest': str(manifest_path), 'predicate': str(predicate_path), 'machine_state': machine_decision['state']}


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description='Prepare deterministic SRPC Phase B capsule and custom predicate')
    parser.add_argument('--control-root', required=True); parser.add_argument('--source-root', required=True); parser.add_argument('--control-sha', required=True)
    parser.add_argument('--staging-evidence', required=True); parser.add_argument('--static-proof', required=True); parser.add_argument('--output-root', required=True)
    args = parser.parse_args()
    result = prepare_attestation(Path(args.control_root), Path(args.source_root), args.control_sha, Path(args.staging_evidence), Path(args.static_proof), Path(args.output_root))
    _write_json(Path(args.output_root) / 'preparation.json', result)
    return 0

if __name__ == '__main__': raise SystemExit(main())
