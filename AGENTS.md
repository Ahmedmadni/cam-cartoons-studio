<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application boundaries
- Keep WebGL rendering behind the lazy, mounted CharacterStage wrapper to avoid evaluating browser rendering during SSR.
- Use StoryRecording for single-story capture lifecycle; it owns capture tracks and rejects failed or empty exports.
- Use playStorySpeech for single-story browser narration so cancellation settles pending speech and mouth frames are released.
- Generate character environment lighting locally with Lightformer rather than downloading external HDR presets to avoid network-dependent blank screens.
