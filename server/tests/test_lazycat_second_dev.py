"""Contract tests for LazyCat second-dev fixtures (M0)."""

from app.lazycat_packaging import (
    REQUIRED_DEPLOY_PARAM_IDS,
    REQUIRED_PACKAGE_PERMISSIONS,
    _load_fixture,
    deploy_param_ids,
    fixtures_contain_no_real_secrets,
    load_project_deploy_params,
    load_project_manifest,
    load_project_package,
    manifest_inject_ids,
    package_permissions,
)


def test_deploy_params_reference_has_required_secrets():
    data = _load_fixture("lzc-deploy-params.reference.yml")
    ids = deploy_param_ids(data)
    assert REQUIRED_DEPLOY_PARAM_IDS <= ids


def test_package_reference_has_netdisk_permissions():
    data = _load_fixture("package.reference.yml")
    perms = package_permissions(data)
    assert REQUIRED_PACKAGE_PERMISSIONS <= perms


def test_manifest_reference_has_injects():
    data = _load_fixture("lzc-manifest.reference.yml")
    ids = manifest_inject_ids(data)
    assert "netdisk-file-picker" in ids
    assert "passwordless-entry" in ids


def test_manifest_reference_declares_web_and_agent():
    data = _load_fixture("lzc-manifest.reference.yml")
    services = data.get("services") or {}
    assert "web" in services
    assert "agent" in services
    routes = (data.get("application") or {}).get("routes") or []
    assert any("web:3000" in str(route) for route in routes)


def test_build_reference_lists_images():
    data = _load_fixture("lzc-build.reference.yml")
    images = data.get("images") or []
    names = {img.get("name") for img in images if isinstance(img, dict)}
    assert {"web", "agent"} <= names


def test_fixtures_contain_no_real_secrets():
    assert fixtures_contain_no_real_secrets() == []


def test_root_manifest_matches_contract():
    data = load_project_manifest()
    ids = manifest_inject_ids(data)
    assert "netdisk-file-picker" in ids
    assert "passwordless-entry" in ids
    services = data.get("services") or {}
    assert "web" in services and "agent" in services


def test_root_package_matches_contract():
    data = load_project_package()
    assert REQUIRED_PACKAGE_PERMISSIONS <= package_permissions(data)


def test_root_deploy_params_matches_contract():
    data = load_project_deploy_params()
    assert REQUIRED_DEPLOY_PARAM_IDS <= deploy_param_ids(data)
