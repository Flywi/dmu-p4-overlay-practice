import { ref, watch } from 'vue';

// Window actions live here; mechanic edits and snapshots stay in useOverlay.
export function useWindowControls(view, overlay, t) {
  const { connection, ready, native, showError, resultsVisible } = overlay;
  const pinned = ref(true);

  watch([() => t('window.title', { view: t('window.' + view) }), ready], ([title]) => {
    document.title = title;
    if (connection.ready) connection.window.SetTitle(title).catch(showError);
  }, { immediate: true });

  function togglePin() {
    return native(async () => {
      const next = !pinned.value;
      await connection.window.SetAlwaysOnTop(next);
      pinned.value = next;
    });
  }

  function toggleResults() {
    return native(async () => {
      resultsVisible.value = await connection.call('ToggleResults');
    });
  }

  function openGuide() {
    if (connection.desktop) return native(() => connection.call('ShowGuide'));
    window.open('/guide.html', 'p4-guide');
  }

  const minimise = () => native(() => connection.window.Minimise());
  const close = () => native(() => connection.call(view === 'results' ? 'HideResults' : 'Quit'));
  const toggleClickThrough = () => native(() => connection.call('ToggleClickThrough'));

  return { pinned, togglePin, toggleResults, openGuide, minimise, close, toggleClickThrough };
}
