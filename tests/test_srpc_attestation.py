import json
from pathlib import Path
import pytest

try:
    from tools.srpc.attestation import prepare_attestation
except ModuleNotFoundError:
    prepare_attestation = None

H0='e4124031d68dba24faea7c0ed7e6c8ef1e09a4d0'
DIGEST='9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9'
CONTROL='a'*40
ROOT=Path(__file__).parents[1]
SOURCE=ROOT/'source'
EVIDENCE=ROOT/'reports/srpc/phase-b'/H0/'staging-evidence.json'

def require_preparer(): assert prepare_attestation is not None, 'tools.srpc.attestation must exist'
def static_proof(tmp_path: Path, *, status='PASS', digest=DIGEST):
    p=tmp_path/'static-proof.json'; p.write_text(json.dumps({'status':status,'tests':10,'sha256':digest}), encoding='utf-8'); return p

def test_preparer_builds_evidence_complete_capsule_and_predicate(tmp_path: Path):
    require_preparer(); out=prepare_attestation(ROOT,SOURCE,CONTROL,EVIDENCE,static_proof(tmp_path),tmp_path/'out')
    manifest=json.loads(Path(out['manifest']).read_text()); predicate=json.loads(Path(out['predicate']).read_text())
    assert manifest['source']['commit']==H0 and manifest['source']['migration_sha256']==DIGEST and manifest['source']['control_plane_commit']==CONTROL
    assert manifest['decision']=={'state':'EVIDENCE_COMPLETE','steel_shield_pin':'NOT_PERFORMED','production':'BLOCKED'}
    assert predicate['source_commit']==H0 and predicate['migration_sha256']==DIGEST and predicate['control_plane_commit']==CONTROL
    assert predicate['staging']['project_ref']=='mduummtnlupktjaujgyx' and predicate['classification']=='STATE_A'
    assert predicate['execution']['pending_queue_runner_used'] is False and predicate['runtime_status']=='PASS' and predicate['phase_a_regression_status']=='PASS'
    assert predicate['synthetic_residue']=={'audit_rows':0,'country_rows':0,'listing_rows':0,'principal_rows':0}
    assert predicate['material_security_findings']==0 and predicate['decision']=='EVIDENCE_COMPLETE' and 'security_approved' not in predicate

def test_preparer_is_deterministic_for_identical_inputs(tmp_path: Path):
    require_preparer(); proof=static_proof(tmp_path)
    a=prepare_attestation(ROOT,SOURCE,CONTROL,EVIDENCE,proof,tmp_path/'a'); b=prepare_attestation(ROOT,SOURCE,CONTROL,EVIDENCE,proof,tmp_path/'b')
    assert a['capsule_sha256']==b['capsule_sha256']

def test_preparer_rejects_invalid_control_sha(tmp_path: Path):
    require_preparer()
    with pytest.raises(ValueError, match='control-plane SHA'): prepare_attestation(ROOT,SOURCE,'branch-name',EVIDENCE,static_proof(tmp_path),tmp_path/'out')

def test_preparer_rejects_wrong_static_digest(tmp_path: Path):
    require_preparer()
    with pytest.raises(ValueError, match='static proof'): prepare_attestation(ROOT,SOURCE,CONTROL,EVIDENCE,static_proof(tmp_path,digest='0'*64),tmp_path/'out')

def test_preparer_rejects_failed_static_proof(tmp_path: Path):
    require_preparer()
    with pytest.raises(ValueError, match='static proof'): prepare_attestation(ROOT,SOURCE,CONTROL,EVIDENCE,static_proof(tmp_path,status='FAIL'),tmp_path/'out')
