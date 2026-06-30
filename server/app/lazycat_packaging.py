"""LazyCat second-dev packaging contracts (fixtures validation)."""

from __future__ import annotations

from pathlib import Path
import re

import yaml

FIXTURES_DIR = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "lazycat-second-dev"
    / "fixtures"
)
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_yaml(path: Path) -> dict:
    assert path.exists(), f"missing yaml: {path}"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict), f"{path.name} must be a mapping"
    return data


def _load_fixture(name: str) -> dict:
    return _load_yaml(FIXTURES_DIR / name)


REQUIRED_DEPLOY_PARAM_IDS = frozenset(
    {
        "mimo_api_key",
        "agora_app_id",
        "agora_app_certificate",
        "backend_api_secret",
    }
)

REQUIRED_PACKAGE_PERMISSIONS = frozenset(
    {
        "net.internet",
        "document.read",
        "media.read",
    }
)

SECRET_PATTERN = re.compile(r"sk-[a-zA-Z0-9]{20,}")
DEVICE_PATTERN = re.compile(r"[a-z0-9]{4,}\.heiyu\.space", re.IGNORECASE)


def load_project_manifest() -> dict:
    return _load_yaml(PROJECT_ROOT / "lzc-manifest.yml")


def load_project_package() -> dict:
    return _load_yaml(PROJECT_ROOT / "package.yml")


def load_project_deploy_params() -> dict:
    return _load_yaml(PROJECT_ROOT / "lzc-deploy-params.yml")


def deploy_param_ids(data: dict) -> set[str]:
    params = data.get("params") or []
    return {str(item.get("id")) for item in params if isinstance(item, dict) and item.get("id")}


def package_permissions(data: dict) -> set[str]:
    perms = data.get("permissions") or {}
    required = perms.get("required") or []
    return {str(p) for p in required}


def fixtures_contain_no_real_secrets() -> list[str]:
    violations: list[str] = []
    paths = list(FIXTURES_DIR.glob("*.yml"))
    for name in ("lzc-manifest.yml", "lzc-deploy-params.yml", "package.yml", "lzc-build.yml"):
        path = PROJECT_ROOT / name
        if path.exists():
            paths.append(path)
    for path in paths:
        text = path.read_text(encoding="utf-8")
        if SECRET_PATTERN.search(text):
            violations.append(f"{path.name}: looks like real sk- key")
        if DEVICE_PATTERN.search(text):
            violations.append(f"{path.name}: looks like real heiyu device")
    return violations


def manifest_inject_ids(data: dict) -> set[str]:
    app = data.get("application") or {}
    injects = app.get("injects") or []
    ids: set[str] = set()
    for item in injects:
        if isinstance(item, dict) and item.get("id"):
            ids.add(str(item["id"]))
    return ids
