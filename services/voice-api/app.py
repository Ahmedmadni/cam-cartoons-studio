from __future__ import annotations

import asyncio
import os
import tempfile
import threading
from pathlib import Path
from typing import Literal

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from TTS.api import TTS


VoiceName = Literal["normal", "child", "boy", "girl", "man", "woman"]

MODEL_NAME = os.getenv(
    "COQUI_MODEL",
    "tts_models/multilingual/multi-dataset/xtts_v2",
)
VOICE_DIR = Path(os.getenv("VOICE_DIR", "/app/voices"))
DEFAULT_SPEAKER_WAV = os.getenv("DEFAULT_SPEAKER_WAV", "").strip()
DEFAULT_SPEAKER_ID = os.getenv("COQUI_DEFAULT_SPEAKER", "").strip()
DEVICE_MODE = os.getenv("COQUI_DEVICE", "auto").strip().lower()

if DEVICE_MODE == "auto":
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
else:
    DEVICE = DEVICE_MODE

_model: TTS | None = None
_model_lock = threading.Lock()


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: VoiceName = "child"
    language: str = "ar-SA"
    pitch: float = Field(default=0, ge=-12, le=12)
    tone: float = Field(default=0.5, ge=0, le=1)
    engine: str = "auto"
    format: Literal["wav"] = "wav"


def parse_origins() -> list[str]:
    raw = os.getenv("VOICE_ALLOWED_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(
    title="Cam Cartoons Voice API",
    version="1.0.0",
    description="Coqui TTS adapter for the Cam Cartoons Studio frontend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def get_model() -> TTS:
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is None:
            _model = TTS(model_name=MODEL_NAME, progress_bar=False).to(DEVICE)
    return _model


def language_for(model: TTS, requested: str) -> str | None:
    languages = getattr(model, "languages", None)
    if not languages:
        return None

    normalized = requested.strip()
    candidates = [
        normalized,
        normalized.lower(),
        normalized.split("-")[0].lower(),
        normalized.split("_")[0].lower(),
    ]
    for candidate in candidates:
        if candidate in languages:
            return candidate

    if "ar" in languages:
        return "ar"

    raise HTTPException(
        status_code=422,
        detail=f"Requested language '{requested}' is not supported by model '{MODEL_NAME}'.",
    )


def speaker_wav_for(voice: VoiceName) -> str | None:
    env_name = f"VOICE_{voice.upper()}_WAV"
    explicit = os.getenv(env_name, "").strip()
    if explicit:
        path = Path(explicit)
        if path.is_file():
            return str(path)

    conventional = VOICE_DIR / f"{voice}.wav"
    if conventional.is_file():
        return str(conventional)

    if DEFAULT_SPEAKER_WAV:
        fallback = Path(DEFAULT_SPEAKER_WAV)
        if fallback.is_file():
            return str(fallback)

    return None


def speaker_id_for(model: TTS) -> str | None:
    speakers = getattr(model, "speakers", None) or []
    if DEFAULT_SPEAKER_ID:
        if speakers and DEFAULT_SPEAKER_ID not in speakers:
            raise HTTPException(
                status_code=500,
                detail=f"Configured speaker '{DEFAULT_SPEAKER_ID}' is unavailable in the selected model.",
            )
        return DEFAULT_SPEAKER_ID

    if speakers:
        return str(speakers[0])

    return None


def synthesize_sync(payload: SynthesisRequest) -> bytes:
    model = get_model()
    language = language_for(model, payload.language)
    speaker_wav = speaker_wav_for(payload.voice)
    speaker_id = None if speaker_wav else speaker_id_for(model)

    if not speaker_wav and not speaker_id and getattr(model, "is_multi_speaker", False):
        raise HTTPException(
            status_code=503,
            detail=(
                "This model requires a speaker. Add voices/<voice>.wav, set "
                "DEFAULT_SPEAKER_WAV, or configure COQUI_DEFAULT_SPEAKER."
            ),
        )

    kwargs: dict[str, object] = {
        "text": payload.text,
        "split_sentences": True,
    }

    if language:
        kwargs["language"] = language
    if speaker_wav:
        kwargs["speaker_wav"] = speaker_wav
    elif speaker_id:
        kwargs["speaker"] = speaker_id

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp:
        output_path = Path(temp.name)

    try:
        model.tts_to_file(file_path=str(output_path), **kwargs)
        audio = output_path.read_bytes()
        if not audio:
            raise RuntimeError("Coqui returned an empty WAV file.")
        return audio
    finally:
        output_path.unlink(missing_ok=True)


@app.get("/health")
async def health() -> dict[str, object]:
    configured_voices = {
        voice: bool(speaker_wav_for(voice))
        for voice in ("normal", "child", "boy", "girl", "man", "woman")
    }
    return {
        "status": "ok",
        "engine": "coqui-tts",
        "model": MODEL_NAME,
        "device": DEVICE,
        "model_loaded": _model is not None,
        "configured_voice_references": configured_voices,
    }


@app.post("/synthesize")
async def synthesize(payload: SynthesisRequest) -> Response:
    try:
        audio = await asyncio.to_thread(synthesize_sync, payload)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return Response(
        content=audio,
        media_type="audio/wav",
        headers={
            "cache-control": "no-store",
            "x-voice-engine": "coqui-tts",
            "x-voice-model": MODEL_NAME,
        },
    )
