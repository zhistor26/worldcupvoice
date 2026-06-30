import sys
import time
import types
from pathlib import Path

import pytest

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))


def _install_agora_test_shim() -> None:
    try:
        import agora.rtc.utils.audio_consumer  # noqa: F401
        return
    except ModuleNotFoundError:
        pass

    pcm_module = types.ModuleType("agora.rtc.audio_pcm_data_sender")

    class PcmAudioFrame:
        pass

    pcm_module.PcmAudioFrame = PcmAudioFrame

    class AudioConsumer:
        def __init__(self, pcm_sender, sample_rate, channels):
            self._pcm_sender = pcm_sender
            self._sample_rate = sample_rate
            self._channels = channels
            self._buffer = bytearray()

        def _frame_bytes(self) -> int:
            return int(self._sample_rate * self._channels * 2 * 10 / 1000)

        def _consume_bytes(self) -> int:
            return self._frame_bytes() * 10

        def push_pcm_data(self, pcm: bytes) -> None:
            self._buffer.extend(pcm)

        def len(self) -> int:
            return len(self._buffer)

        def consume(self) -> int:
            chunk_size = self._consume_bytes()
            frame_bytes = self._frame_bytes()
            if len(self._buffer) < frame_bytes:
                return -2
            chunk = bytes(self._buffer[:chunk_size])
            del self._buffer[:chunk_size]

            frame = PcmAudioFrame()
            frame.data = bytearray(chunk)
            frame.sample_rate = self._sample_rate
            frame.number_of_channels = self._channels
            frame.bytes_per_sample = 2
            frame.timestamp = 0
            frame.samples_per_channel = len(chunk) // (self._channels * 2)
            self._pcm_sender.send_audio_pcm_data(frame)
            return 0

        def clear(self) -> None:
            self._buffer.clear()

        def release(self) -> None:
            self._buffer.clear()

        def is_push_to_rtc_completed(self) -> int:
            return 1 if not self._buffer else 0

    audio_consumer_module = types.ModuleType("agora.rtc.utils.audio_consumer")
    audio_consumer_module.AudioConsumer = AudioConsumer

    utils_module = types.ModuleType("agora.rtc.utils")
    utils_module.audio_consumer = audio_consumer_module

    rtc_module = types.ModuleType("agora.rtc")
    rtc_module.utils = utils_module
    rtc_module.audio_pcm_data_sender = pcm_module

    agora_module = types.ModuleType("agora")
    agora_module.rtc = rtc_module

    sys.modules["agora"] = agora_module
    sys.modules["agora.rtc"] = rtc_module
    sys.modules["agora.rtc.utils"] = utils_module
    sys.modules["agora.rtc.utils.audio_consumer"] = audio_consumer_module
    sys.modules["agora.rtc.audio_pcm_data_sender"] = pcm_module


_install_agora_test_shim()

LOCAL_ENV_KEYS = {
    "AGORA_APP_ID",
    "AGORA_APP_CERTIFICATE",
    "NEXT_PUBLIC_AGORA_APP_ID",
    "NEXT_AGORA_APP_CERTIFICATE",
    "BACKEND_API_SECRET",
    "OPENAI_API_KEY",
    "NEXT_OPENAI_API_KEY",
    "NEXT_LLM_API_KEY",
    "MIMO_API_KEY",
    "MIMO_BASE_URL",
    "MIMO_VISION_MODEL",
    "MIMO_TTS_MODEL",
    "MIMO_TTS_VOICE",
    "VISION_PROVIDER",
    "TTS_PROVIDER",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "ELEVENLABS_VOICE_ID_EN_SPORTSCASTER",
    "ELEVENLABS_VOICE_ID_FR_SPORTSCASTER",
    "FISH_AUDIO_API_KEY",
    "FISH_AUDIO_VOICE_ID",
    "FISH_AUDIO_VOICE_ID_ZH_MEME",
    "FISH_AUDIO_VOICE_ID_ZH_TACTICAL",
}


@pytest.fixture(autouse=True)
def isolate_local_env(monkeypatch):
    for key in LOCAL_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
