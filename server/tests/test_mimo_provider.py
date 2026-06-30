from app.commentator_profiles import (
    resolve_commentator_profile,
    settings_for_commentator_profile,
)
from app.config import Settings


def _base_settings(**overrides: object) -> Settings:
    data = {
        "agora_app_id": "app-id",
        "agora_app_certificate": "app-cert",
        "vision_provider": "mimo",
        "mimo_api_key": "mimo-key",
        "tts_provider": "mimo",
    }
    data.update(overrides)
    return Settings(**data)


def test_default_settings_use_mimo_providers(monkeypatch):
    monkeypatch.delenv("VISION_PROVIDER", raising=False)
    monkeypatch.delenv("TTS_PROVIDER", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    monkeypatch.setenv("NEXT_PUBLIC_AGORA_APP_ID", "app-id")
    monkeypatch.setenv("NEXT_AGORA_APP_CERTIFICATE", "app-cert")
    monkeypatch.setenv("MIMO_API_KEY", "mimo-key")

    settings = get_settings()

    assert settings.vision_provider == "mimo"
    assert settings.tts_provider == "mimo"
    assert settings.mimo_api_key == "mimo-key"
    get_settings.cache_clear()


def test_profile_does_not_override_global_mimo_tts():
    settings = _base_settings()
    profile = resolve_commentator_profile("zh-cn-fish-meme")

    merged = settings_for_commentator_profile(settings, profile)

    assert merged.tts_provider == "mimo"


def test_profile_elevenlabs_when_global_not_locked():
    settings = _base_settings(tts_provider="elevenlabs", elevenlabs_api_key="eleven-key")
    profile = resolve_commentator_profile("en-us-sportscaster")

    merged = settings_for_commentator_profile(settings, profile)

    assert merged.tts_provider == "elevenlabs"
