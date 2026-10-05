# AI Voice API Contract

The web app can use an external AI voice backend while keeping browser speech as an automatic fallback.

## Configuration

Set:

```env
VITE_VOICE_API_URL=https://your-service.example.com/synthesize
```

If the variable is empty, the app uses the browser's Arabic `speechSynthesis` engine.

## Request

`POST VITE_VOICE_API_URL`

```json
{
  "text": "مرحبا بكم",
  "voice": "child",
  "language": "ar-SA",
  "pitch": 0,
  "tone": 0.5,
  "engine": "auto",
  "format": "wav"
}
```

Supported `voice` values used by the frontend:

- `normal`
- `child`
- `boy`
- `girl`
- `man`
- `woman`

`pitch` is an additional user adjustment from -12 to +12 semitones.

`tone` is a normalized value from 0 to 1.

## Response

Return the synthesized audio bytes with an audio content type such as:

- `audio/wav`
- `audio/mpeg`
- `audio/ogg`
- `audio/webm`

A successful response should use HTTP 2xx and must not be empty.

## Backend adapters

The frontend intentionally does not depend on one Python implementation. A backend adapter may route the same request contract to:

### Coqui TTS

Recommended for the first production adapter because it supports multilingual TTS, multi-speaker models, voice cloning, and VITS-family models behind a Python API.

### VITS

Useful for a dedicated low-latency TTS service when a specific Arabic model/checkpoint is selected and hosted by the project.

### Bark

Best treated as an expressive/generative speech option rather than the default low-latency narrator. It can be exposed through the same request contract when the backend supports it.

## Recording behavior

When `VITE_VOICE_API_URL` is configured, generated audio is decoded through Web Audio and connected to:

1. the user's speakers;
2. an internal `MediaStreamAudioDestinationNode`.

That audio stream is added directly to the recorded story video, so tab-audio sharing is no longer required for AI-generated speech.

If the remote engine fails, playback falls back to browser speech. In that failure case browser-generated audio may not be embedded in the video because browsers do not expose `speechSynthesis` as a capturable Web Audio stream.
