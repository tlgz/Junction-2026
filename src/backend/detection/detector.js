// Detection pipeline. Pure functionality: takes extracted post data, returns a
// verdict. Never touches the DOM.

PD3K.detector = {
  /**
   * @param {{text: string, author: string}} post
   * @returns {{hide: boolean, reason?: string}}
   */
  analyze(post) {
    // TODO: replace with real detection (heuristics, keywords, classifier).
    // Currently flags every post.
    return { hide: true, reason: "placeholder" };
  },
};
