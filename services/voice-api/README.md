# Coqui Voice Service

Deployable FastAPI adapter for the frontend voice contract in `docs/AI_VOICE_API.md`.

## Why it exists

The React application should not load multi-gigabyte TTS models in the browser. This service keeps Coqui/PyTorch on a CPU or GPU server and exposes one small HTTP endpoint to the web app.

## Default model

The default is:

```
tts_models/multilingual/multi-dataset/xtts_v2
```

Override it with `COQUI_MODEL`.

## Run with Docker

```bash
docker build -t cam-cartoons-voice .
docker run --rm -p 8000:8000 \
  --env-file .env \
  -v "$(pwd)/voices:/app/voices:ro" \
  cam-cartoons-voice
```

Health check:

```bash
curl http://localhost:8000/health
```

Frontend:

```env
VITE_VOICE_API_URL=http://localhost:8000/synthesize
```

## Voice references

For the strongest separation between the six presets, provide clean reference recordings:

- `voices/normal.wav`
- `voices/child.wav`
- `voices/boy.wav`
- `voices/girl.wav`
- `voices/man.wav`
- `voices/woman.wav`

You can instead point each preset to a file elsewhere with the corresponding `VOICE_*_WAV` environment variable.

If no reference WAV is available, the service attempts to use `COQUI_DEFAULT_SPEAKER` or the first built-in speaker exposed by the configured model.

## Production notes

- Prefer GPU hosting for XTTS latency.
- Keep the service private behind your application gateway when possible.
- Set `VOICE_ALLOWED_ORIGINS` to the production web origin instead of `*`.
- Reference recordings should be clean, short, and legally authorized for the intended voice.
- The API currently accepts `pitch` and `tone` to preserve the frontend contract; the basic Coqui adapter relies primarily on the selected speaker/reference voice. Model-specific prosody controls can be added later without changing the web application.
