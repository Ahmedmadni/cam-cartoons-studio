/** Resolve cancellation immediately; release any permission stream that arrives late. */
export function waitForStoryCapture(
  requested: Promise<MediaStream>,
  cancelled: Promise<null>,
  isActive: () => boolean,
): Promise<MediaStream | null> {
  const safeRequest = requested.then(stream => {
    if (!isActive()) {
      stream.getTracks().forEach(track => track.stop());
      return null;
    }
    return stream;
  });
  return Promise.race([safeRequest, cancelled]);
}