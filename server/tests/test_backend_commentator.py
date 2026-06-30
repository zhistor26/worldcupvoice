import asyncio
import json
import time
import pytest

from app.backend_commentator import (
    _AgoraAudioConsumerPacer,
    BackendVisionCommentator,
    FrameSnapshot,
    _agora_i420_frame_to_image,
    _build_visual_prompt,
    _comfort_noise_frame,
    _extract_response_text,
    _is_demo_match_context,
    _is_no_call,
    _is_repetitive_commentary,
    _resample_pcm_mono,
    _sample_rate_from_pcm_output_format,
    _transcript_payload,
    _trim_pcm_to_millisecond_boundary,
    _vision_model_description,
)
from app.commentator_profiles import resolve_commentator_profile
from app.config import Settings
from app.models import MatchContext


def test_extract_response_text_prefers_output_text():
    assert _extract_response_text({"output_text": "  A guard drives left.  "}) == (
        "A guard drives left."
    )


def test_extract_response_text_falls_back_to_output_content():
    payload = {
        "output": [
            {
                "content": [
                    {"type": "output_text", "text": "The ball is swung"},
                    {"type": "output_text", "text": "to the corner."},
                ]
            }
        ]
    }

    assert _extract_response_text(payload) == "The ball is swung to the corner."


def test_trim_pcm_to_millisecond_boundary():
    pcm = b"x" * 100

    assert len(_trim_pcm_to_millisecond_boundary(pcm, sample_rate=24000)) == 96


def test_sample_rate_from_pcm_output_format():
    assert _sample_rate_from_pcm_output_format("pcm_16000") == 16000
    assert _sample_rate_from_pcm_output_format("PCM_24000") == 24000
    assert _sample_rate_from_pcm_output_format("mp3_44100") is None


def test_resample_pcm_mono_changes_duration_bytes_to_target_rate():
    pcm_24k_100ms = b"\x00\x00" * 2400

    converted = _resample_pcm_mono(
        pcm_24k_100ms,
        source_rate=24000,
        target_rate=16000,
    )

    assert len(converted) == 3200


def test_comfort_noise_frame_is_low_level_nonzero_pcm():
    frame = _comfort_noise_frame(8, amplitude=16)

    assert len(frame) == 8
    assert frame != bytes(8)
    assert frame[:2] == (-16).to_bytes(2, byteorder="little", signed=True)
    assert frame[2:4] == (16).to_bytes(2, byteorder="little", signed=True)


def test_transcript_payload_matches_agent_toolkit_shape():
    payload = json.loads(
        _transcript_payload(text="A player cuts through the lane.", agent_uid=123456, turn_id=7)
    )

    assert payload["object"] == "assistant.transcription"
    assert payload["text"] == "A player cuts through the lane."
    assert payload["user_id"] == "123456"
    assert payload["turn_id"] == 7
    assert payload["turn_status"] == 1


def test_visual_prompt_uses_multi_frame_play_by_play_constraints():
    prompt = _build_visual_prompt(
        MatchContext(
            sport="football",
            title="Argentina vs France",
            competition="FIFA World Cup Qatar 2022 - Final",
            venue="Lusail Stadium",
            homeTeam="Argentina",
            awayTeam="France",
            storyline="Mbappe leads France back late.",
        ),
        samples=[
            FrameSnapshot(video_time=12.0, captured_at=1.0, image_base64="old"),
            FrameSnapshot(video_time=13.1, captured_at=2.0, image_base64="new"),
        ],
        previous_calls=["Messi carries it toward the box."],
    )

    assert "oldest first and newest last" in prompt
    assert "natural live broadcast cadence" in prompt
    assert "4 to 16 words" in prompt


def test_visual_prompt_can_use_chinese_commentator_profile():
    profile = resolve_commentator_profile("zh-cn-fish-meme")
    prompt = _build_visual_prompt(
        MatchContext(
            sport="football",
            title="Argentina vs France",
            competition="FIFA World Cup Qatar 2022 - Final",
            venue="Lusail Stadium",
            homeTeam="Argentina",
            awayTeam="France",
            storyline="Mbappe leads France back late.",
        ),
        samples=[FrameSnapshot(video_time=13.1, captured_at=2.0, image_base64="new")],
        previous_calls=["梅西中路带球推进。"],
        profile=profile,
    )

    assert "用简体中文解说" in prompt
    assert "不要冒充真实公众人物本人" in prompt
    assert "通常 8 到 24 个汉字" in prompt
    assert "才只返回 NO_CALL" in prompt
    assert "俯拍远景" in prompt
    assert "除非最新画面明确支持" in prompt
    assert "梅西中路带球推进。" in prompt
    assert "13.1 秒" in prompt


def test_visual_prompt_can_use_french_commentator_profile():
    profile = resolve_commentator_profile("fr-fr-sportscaster")
    prompt = _build_visual_prompt(
        MatchContext(
            sport="football",
            title="Argentina vs France",
            competition="FIFA World Cup Qatar 2022 - Final",
            venue="Lusail Stadium",
            homeTeam="Argentina",
            awayTeam="France",
            storyline="Mbappe leads France back late.",
        ),
        samples=[FrameSnapshot(video_time=21.4, captured_at=2.0, image_base64="new")],
        previous_calls=["Mbappé accélère côté gauche."],
        profile=profile,
    )

    assert "Profil du commentateur : French Sportscaster" in prompt
    assert "phrases courtes quand ça va vite" in prompt
    assert "Retourne exactement NO_CALL" in prompt
    assert "Mbappé accélère côté gauche." in prompt
    assert "21.4 s" in prompt


def test_visual_prompt_includes_roster_map_and_identity_rules():
    prompt = _build_visual_prompt(
        MatchContext(
            sport="football",
            title="Argentina vs France",
            competition="FIFA World Cup Qatar 2022 - Final",
            venue="Lusail Stadium",
            homeTeam="Argentina",
            awayTeam="France",
            gameDate="2022-12-18",
            localTipTime="6:00 PM AST",
            finalScore="Argentina 3, France 3 - Argentina won 4-2 on penalties",
            homeTeamAbbr="ARG",
            awayTeamAbbr="FRA",
            homeJerseyColor="white and sky-blue striped Argentina shirts",
            awayJerseyColor="navy France shirts",
            homeRoster=[
                {
                    "number": "10",
                    "name": "Lionel Messi",
                    "shortName": "Messi",
                    "role": "starter",
                    "position": "FW",
                }
            ],
            awayRoster=[
                {
                    "number": "10",
                    "name": "Kylian Mbappe",
                    "shortName": "Mbappe",
                    "role": "starter",
                    "position": "LW",
                }
            ],
            playerIdentificationNotes=[
                "Use player names only when the shirt number or team kit is visually clear.",
            ],
            broadcastNotes=[
                "Use football vocabulary and keep the crowd audio breathing.",
            ],
            storyline="France chase the final late through Mbappe.",
        ),
        samples=[
            FrameSnapshot(video_time=22.0, captured_at=1.0, image_base64="frame"),
        ],
        previous_calls=[],
    )

    assert "Argentina uniforms: white and sky-blue striped Argentina shirts." in prompt
    assert "#10 Messi (Lionel Messi) [starter/FW]" in prompt
    assert "#10 Mbappe (Kylian Mbappe) [starter/LW]" in prompt
    assert "if a shirt number is readable" in prompt
    assert "use that player's short name" in prompt
    assert "Use player names only when the shirt number" in prompt
    assert "describe roles generically" in prompt
    assert "Broadcast notes:" in prompt
    assert "football vocabulary" in prompt


def test_no_call_detection_allows_model_to_stay_silent():
    assert _is_no_call("NO_CALL")
    assert _is_no_call("No call.")


def test_vision_model_description_reflects_provider():
    mimo = Settings(
        agora_app_id="app-id",
        agora_app_certificate="app-cert",
        vision_provider="mimo",
        mimo_vision_model="mimo-v2.5",
    )
    openai = Settings(
        agora_app_id="app-id",
        agora_app_certificate="app-cert",
        vision_provider="openai",
        openai_vision_model="gpt-5.4-mini",
    )

    assert _vision_model_description(mimo) == "mimo-v2.5"
    assert _vision_model_description(openai) == "gpt-5.4-mini"


def test_demo_match_context_detects_worldcupvoice_demo_metadata():
    assert _is_demo_match_context(
        MatchContext(
            sport="football",
            title="WorldCupVoice 踢球演示",
            competition="WorldCupVoice 足球演示（非正式比赛）",
            venue="训练场",
            homeTeam="Demo Red",
            awayTeam="Demo Blue",
            storyline="2026 年 WorldCupVoice 演示",
            broadcastNotes=["这是 WorldCupVoice 演示链路"],
        )
    )
    assert not _is_demo_match_context(
        MatchContext(
            sport="football",
            title="Argentina vs France",
            competition="FIFA World Cup Qatar 2022 - Final",
            venue="Lusail Stadium",
            homeTeam="Argentina",
            awayTeam="France",
            storyline="Mbappe leads France back late.",
        )
    )


def test_repetitive_commentary_detection_blocks_exact_repeat_within_window():
    last = "Messi carries it toward the box."

    assert _is_repetitive_commentary(
        last,
        [],
        last_spoken_text=last,
        last_spoken_monotonic=time.monotonic(),
    )
    assert not _is_repetitive_commentary(
        "Mbappe breaks down the left.",
        [],
        last_spoken_text=last,
        last_spoken_monotonic=time.monotonic(),
    )
    assert not _is_repetitive_commentary(
        last,
        [],
        last_spoken_text=last,
        last_spoken_monotonic=time.monotonic() - 10.0,
    )


def test_tts_description_reports_elevenlabs_provider():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            tts_provider="elevenlabs",
            elevenlabs_voice_id="voice-id",
            elevenlabs_model="eleven_flash_v2_5",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    assert commentator._tts_description() == "elevenlabs:eleven_flash_v2_5:voice-id"


def test_tts_description_reports_fish_audio_provider():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            tts_provider="fish_audio",
            fish_audio_voice_id="fish-voice",
            fish_audio_model="s2-pro",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    assert commentator._tts_description() == "fish_audio:s2-pro:fish-voice"


@pytest.mark.asyncio
async def test_fish_audio_tts_posts_pcm_request(monkeypatch):
    captured: dict[str, object] = {}

    class FakeResponse:
        content = b"x" * 480

        def raise_for_status(self) -> None:
            return None

    class FakeAsyncClient:
        def __init__(self, *, timeout: int):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, _exc_type, _exc, _tb):
            return None

        async def post(self, url: str, *, headers: dict, json: dict):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("app.backend_commentator.httpx.AsyncClient", FakeAsyncClient)
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            tts_provider="fish_audio",
            fish_audio_api_key="fish-key",
            fish_audio_voice_id="fish-demo-voice",
            fish_audio_model="s2-pro",
            fish_audio_format="pcm",
            fish_audio_sample_rate=24000,
            fish_audio_latency="balanced",
            fish_audio_chunk_length=150,
            fish_audio_speed=1.08,
            commentary_audio_sample_rate=24000,
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    pcm = await commentator._synthesize_speech_fish_audio("梅西带球推进。")

    assert pcm == b"x" * 480
    assert captured["url"] == "https://api.fish.audio/v1/tts"
    assert captured["timeout"] == 35
    headers = captured["headers"]
    assert headers["Authorization"] == "Bearer fish-key"
    assert headers["Content-Type"] == "application/json"
    assert headers["model"] == "s2-pro"
    body = captured["json"]
    assert body["text"] == "梅西带球推进。"
    assert body["reference_id"] == "fish-demo-voice"
    assert body["format"] == "pcm"
    assert body["sample_rate"] == 24000
    assert body["latency"] == "balanced"
    assert body["chunk_length"] == 150
    assert body["prosody"]["speed"] == 1.08
    assert body["prosody"]["normalize_loudness"] is True
    assert commentator.stats().tts_requests == 1


@pytest.mark.asyncio
async def test_publish_audio_sends_pcm_frames_sequentially():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            commentary_audio_sample_rate=24000,
            commentary_audio_consume_interval_ms=1000,
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )
    sent_chunks: list[tuple[bytes, int, int]] = []

    def fake_push_audio_chunk(
        _connection: object,
        chunk: bytes,
        sample_rate: int,
        *,
        present_time_ms: int,
    ) -> int:
        sent_chunks.append((bytes(chunk), sample_rate, present_time_ms))
        return 0

    async def no_sleep(_delay: float) -> None:
        return None

    commentator._push_audio_chunk = fake_push_audio_chunk  # type: ignore[method-assign]
    commentator._sleep_until_stop = no_sleep  # type: ignore[method-assign]

    pcm_2400ms = b"x" * int(24000 * 1 * 2 * 2400 / 1000)

    sent = await commentator._publish_audio(object(), pcm_2400ms)

    # Audio is paced as ~100ms PCM chunks (4800 bytes at 24kHz mono) sent in real
    # time, with a constant present_time_ms of 0 so the SDK plays them immediately
    # instead of treating per-utterance timestamps as scheduled in the past.
    bytes_per_100ms = int(24000 * 1 * 2 * 100 / 1000)
    assert sent == len(pcm_2400ms)
    assert len(sent_chunks) == 24
    assert {len(chunk) for chunk, _rate, _time in sent_chunks} == {bytes_per_100ms}
    assert {rate for _chunk, rate, _time in sent_chunks} == {24000}
    assert {time_ms for _chunk, _rate, time_ms in sent_chunks} == {0}
    stats = commentator.stats()
    assert stats.audio_buffer_ms == 0
    assert stats.last_audio_duration_ms == 2400


@pytest.mark.asyncio
async def test_publish_audio_queues_to_audio_consumer_pacer_when_available():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            commentary_audio_sample_rate=24000,
            commentary_audio_consume_interval_ms=60,
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    class FakePacer:
        def __init__(self):
            self.queued: list[bytes] = []

        def buffer_ms(self) -> int:
            return 120

        async def enqueue(self, pcm: bytes) -> int:
            self.queued.append(bytes(pcm))
            return len(pcm)

    pacer = FakePacer()
    commentator._audio_pacer = pacer  # type: ignore[assignment]
    pcm = b"x" * 1000

    sent = await commentator._publish_audio(object(), pcm)

    # 24kHz mono PCM is 480 bytes per 10ms. The pacer path trims to that
    # boundary and returns immediately instead of sleeping for playback time.
    assert sent == 960
    assert [len(chunk) for chunk in pacer.queued] == [960]
    assert commentator._last_audio_duration_ms == 20


@pytest.mark.asyncio
async def test_wait_for_audio_drain_waits_until_pacer_buffer_is_low():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            commentary_audio_drain_target_ms=250,
            commentary_audio_drain_timeout_ms=2000,
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    class FakePacer:
        def __init__(self):
            self.readings = [1200, 700, 200]

        def buffer_ms(self) -> int:
            if len(self.readings) > 1:
                return self.readings.pop(0)
            return self.readings[0]

    sleeps: list[float] = []

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    commentator._audio_pacer = FakePacer()  # type: ignore[assignment]
    commentator._sleep_until_stop = fake_sleep  # type: ignore[method-assign]

    waited_ms = await commentator._wait_for_audio_drain(turn_id=7)

    assert waited_ms >= 0
    assert sleeps == [0.1]


@pytest.mark.asyncio
async def test_agora_audio_consumer_pacer_buffers_and_consumes_tts_pcm():
    class FakeSender:
        def __init__(self):
            self.frames: list[bytes] = []

        def send_audio_pcm_data(self, frame):
            self.frames.append(bytes(frame.data))
            return 0

    class FakeConnection:
        def __init__(self):
            self._audio_sender = FakeSender()

    connection = FakeConnection()
    pacer = _AgoraAudioConsumerPacer(
        connection=connection,
        sample_rate=24000,
        consume_interval_ms=60,
        keepalive=True,
        stop_event=asyncio.Event(),
        channel_name="channel",
    )

    assert pacer.frame_size == 480
    assert pacer.consume_interval_ms == 60

    pcm_240ms = b"x" * int(24000 * 1 * 2 * 240 / 1000)
    await pacer.enqueue(pcm_240ms)

    assert pacer.buffer_ms() == 240
    result = pacer._consume_once()

    assert result == 0
    assert [len(frame) for frame in connection._audio_sender.frames] == [4800]
    assert pacer.buffer_ms() == 140
    assert pacer.stats()["audio_consume_calls"] == 1
    assert pacer.stats()["audio_consume_errors"] == 0
    assert pacer.stats()["audio_send_calls"] == 1
    assert pacer.stats()["last_audio_send_ms"] == 100
    assert pacer.stats()["last_audio_duration_ms"] == 240


def test_agora_audio_consumer_pacer_sends_keepalive_when_empty():
    class FakeSender:
        def __init__(self):
            self.frames: list[bytes] = []

        def send_audio_pcm_data(self, frame):
            self.frames.append(bytes(frame.data))
            return 0

    class FakeConnection:
        def __init__(self):
            self._audio_sender = FakeSender()

    connection = FakeConnection()
    pacer = _AgoraAudioConsumerPacer(
        connection=connection,
        sample_rate=16000,
        consume_interval_ms=40,
        keepalive=True,
        stop_event=asyncio.Event(),
        channel_name="channel",
    )

    result = pacer._consume_once()

    assert result in {-2, 0}
    assert [len(frame) for frame in connection._audio_sender.frames] == [1280]
    assert pacer.stats()["audio_keepalive_calls"] == 1
    assert pacer.stats()["audio_send_calls"] == 1


def test_agora_audio_consumer_pacer_stays_quiet_when_keepalive_disabled():
    class FakeSender:
        def __init__(self):
            self.frames: list[bytes] = []

        def send_audio_pcm_data(self, frame):
            self.frames.append(bytes(frame.data))
            return 0

    class FakeConnection:
        def __init__(self):
            self._audio_sender = FakeSender()

    connection = FakeConnection()
    pacer = _AgoraAudioConsumerPacer(
        connection=connection,
        sample_rate=16000,
        consume_interval_ms=40,
        keepalive=False,
        stop_event=asyncio.Event(),
        channel_name="channel",
    )

    result = pacer._consume_once()

    assert result in {-2, 0}
    assert connection._audio_sender.frames == []
    assert pacer.stats()["audio_keepalive_calls"] == 0
    assert pacer.stats()["audio_send_calls"] == 0


@pytest.mark.asyncio
async def test_agora_audio_consumer_pacer_does_not_clear_empty_buffer_for_long_clip():
    class FakeSender:
        def send_audio_pcm_data(self, _frame):
            return 0

    class FakeConnection:
        def __init__(self):
            self._audio_sender = FakeSender()

    pacer = _AgoraAudioConsumerPacer(
        connection=FakeConnection(),
        sample_rate=24000,
        consume_interval_ms=60,
        keepalive=False,
        stop_event=asyncio.Event(),
        channel_name="channel",
        max_buffer_seconds=1.0,
    )

    pcm_2000ms = b"x" * int(24000 * 1 * 2 * 2000 / 1000)

    await pacer.enqueue(pcm_2000ms)

    assert pacer.buffer_ms() == 2000
    assert pacer.stats()["audio_buffer_clears"] == 0

    await pacer.enqueue(pcm_2000ms)

    assert pacer.buffer_ms() == 2000
    assert pacer.stats()["audio_buffer_clears"] == 1


@pytest.mark.asyncio
async def test_commentary_publishes_transcript_before_audio():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
            commentary_audio_sample_rate=24000,
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )
    events: list[str] = []

    async def describe(_samples: list[FrameSnapshot]) -> str:
        events.append("describe")
        return "Messi drives into space."

    async def synthesize(text: str) -> bytes:
        assert text == "Messi drives into space."
        events.append("tts")
        return b"x" * int(24000 * 1 * 2 * 120 / 1000)

    async def publish_transcript(_connection: object, text: str, **kwargs: object) -> None:
        assert text == "Messi drives into space."
        events.append("transcript")

    async def publish_audio(_connection: object, pcm: bytes) -> int:
        assert pcm
        events.append("audio")
        return len(pcm)

    commentator._describe_frames = describe  # type: ignore[method-assign]
    commentator._synthesize_speech = synthesize  # type: ignore[method-assign]
    commentator._publish_transcript = publish_transcript  # type: ignore[method-assign]
    commentator._publish_audio = publish_audio  # type: ignore[method-assign]
    await commentator._store_frame(
        FrameSnapshot(video_time=1.0, captured_at=1.0, image_base64="frame")
    )

    await commentator._commentary_from_latest_frames(object())

    assert events[0] == "describe"
    tts_idx = events.index("tts")
    audio_idx = events.index("audio")
    assert events.index("transcript") < tts_idx < audio_idx
    assert events.count("transcript") == 2


@pytest.mark.asyncio
async def test_no_call_uses_live_demo_fallback_for_demo_match():
    profile = resolve_commentator_profile("zh-cn-fish-meme")
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="mimo",
            mimo_api_key="mimo-key",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=MatchContext(
            sport="football",
            title="WorldCupVoice 踢球演示",
            competition="WorldCupVoice 足球演示（非正式比赛）",
            venue="训练场",
            homeTeam="Demo Red",
            awayTeam="Demo Blue",
            storyline="2026 年 WorldCupVoice 演示",
        ),
        media_uid=234567,
        profile=profile,
    )
    spoken: list[str] = []

    async def describe(_samples: list[FrameSnapshot]) -> str:
        return "NO_CALL"

    async def publish_transcript(_connection: object, text: str, **kwargs: object) -> None:
        spoken.append(text)

    async def buffered_synth(_connection: object, text: str) -> tuple[int, int, int, int]:
        spoken.append(text)
        return 0, 0, 0, 0

    commentator._describe_frames = describe  # type: ignore[method-assign]
    commentator._publish_transcript = publish_transcript  # type: ignore[method-assign]
    commentator._buffered_synth_and_publish = buffered_synth  # type: ignore[method-assign]
    commentator._wait_for_audio_drain = lambda **kwargs: asyncio.sleep(0)  # type: ignore[method-assign,return-value]
    await commentator._store_frame(
        FrameSnapshot(video_time=1.0, captured_at=1.0, image_base64="frame")
    )

    await commentator._commentary_from_latest_frames(object())

    assert spoken
    assert spoken[0] in (
        "绿地上有传导，球员们在中圈附近慢慢找节奏。",
        "这脚横传很稳，看看下一脚能不能提速。",
        "持球者在观察队友跑位，场上节奏还在试探阶段。",
        "边路有人前插，中路正在尝试把球送出去。",
        "防守队形在往后收，进攻方继续在前场控球。",
        "一脚短传，队友接应很及时，配合还在磨合。",
        "球在脚下转移，双方都在找空档。",
        "这脚触球很干净，看看能不能打出配合。",
    )


def test_commentator_stats_defaults_to_zero():
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    stats = commentator.stats()

    assert stats.frames_sampled == 0
    assert stats.vision_requests == 0
    assert stats.tts_requests == 0
    assert stats.audio_sample_rate == 24000
    assert stats.audio_consume_interval_ms == 60


def test_openai_rate_limit_pause_uses_exponential_backoff(monkeypatch):
    monkeypatch.setattr("app.backend_commentator.time.monotonic", lambda: 100.0)
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    commentator._pause_after_openai_rate_limit(None)
    assert commentator._vision_rate_limit_errors == 1
    assert commentator._vision_rate_limit_resume_at == 108.0

    commentator._pause_after_openai_rate_limit(None)
    assert commentator._vision_rate_limit_errors == 2
    assert commentator._vision_rate_limit_resume_at == 116.0


def test_openai_rate_limit_pause_honors_retry_after(monkeypatch):
    monkeypatch.setattr("app.backend_commentator.time.monotonic", lambda: 100.0)
    commentator = BackendVisionCommentator(
        settings=Settings(
            agora_app_id="app-id",
            agora_app_certificate="app-cert",
            vision_provider="openai",
            openai_api_key="openai-key",
        ),
        channel_name="channel",
        agent_uid=123456,
        match_context=None,
        media_uid=234567,
    )

    commentator._pause_after_openai_rate_limit("12")
    assert commentator._vision_rate_limit_resume_at == 112.0


def test_agora_i420_frame_to_image_converts_raw_rtc_frame():
    class Frame:
        width = 2
        height = 2
        y_stride = 2
        u_stride = 1
        v_stride = 1
        y_buffer = bytes([128, 128, 128, 128])
        u_buffer = bytes([128])
        v_buffer = bytes([128])
        rotation = 0

    image = _agora_i420_frame_to_image(Frame())

    assert image.size == (2, 2)
    assert image.getpixel((0, 0)) == (128, 128, 128)
