// UI layer: renders the red outline, blur overlay, "HIDDEN" label and
// "show anyways" button on a flagged post. Contains no detection logic.

(function () {
  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  PD3K.overlay = {
    /** Applies the hidden state to a post element. */
    apply(element) {
      element.classList.add(PD3K.constants.FLAGGED_CLASS);

      const overlay = document.createElement("div");
      overlay.className = "pd3k-overlay";

      const label = document.createElement("div");
      label.className = "pd3k-label";
      label.textContent = "HIDDEN";

      const button = document.createElement("button");
      button.className = "pd3k-show";
      button.type = "button";
      button.textContent = "show anyways";

      // Swallow clicks so the host page doesn't navigate into the post.
      overlay.addEventListener("click", stopEvent);
      button.addEventListener("click", (e) => {
        stopEvent(e);
        overlay.remove(); // outline remains: the flagged class stays
      });

      overlay.append(label, button);
      element.appendChild(overlay);
    },
  };
})();
