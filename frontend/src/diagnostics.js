// Read rendered output only after Vue has flushed its updates (nextTick).
// Keep smoke-test DOM knowledge out of the normal state and window controls.
export function frontendReadyDetails(view) {
  return {
    view,
    title: document.title,
    renderer: 'vue3',
    inputCount: document.querySelectorAll('.input-row').length,
    stepCount: document.querySelectorAll('.round-result').length,
    transparentBackground: getComputedStyle(document.body).backgroundColor,
  };
}

export function renderedFirstRound() {
  return {
    note: document.querySelector('#timeline .round-note')?.textContent || '',
    truth: document.querySelector('#timeline .round-truth')?.textContent || '',
  };
}
