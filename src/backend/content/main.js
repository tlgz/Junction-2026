// Content script entry point. Wires platform adapter -> detector -> overlay UI.

(function main() {
  const platform = PD3K.getPlatform();
  if (!platform) return;

  PD3K.observeFeed(platform.postSelector, (element) => {
    const post = platform.extractPost(element);
    const verdict = PD3K.detector.analyze(post);
    if (verdict.hide) PD3K.overlay.apply(element);
  });
})();
