import { computed, nextTick, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { createOverlayConnection, reportDiagnostic } from '../../connection.js';
import { initialState, rounds } from '../../rules.js';
import { t } from '../../i18n.js';
import { frontendReadyDetails, renderedFirstRound } from '../diagnostics.js';

export function useOverlay(view, preferences) {
  const snapshot = shallowRef({ values: initialState(), step: 0 });
  const ready = ref(false);
  const desktopStatus = shallowRef(null);
  const locked = ref(false);
  const resultsVisible = ref(false);
  const error = ref('');
  const state = computed(() => snapshot.value.values);
  const steps = computed(() => rounds(state.value, preferences.value));
  const step = computed(() => Math.min(snapshot.value.step, steps.value.length - 1));

  function showError(value) {
    error.value = value?.message || String(value);
    reportDiagnostic(error.value);
  }

  function applySnapshot(next) {
    snapshot.value = next;
    error.value = '';
  }

  const connection = createOverlayConnection({
    view,
    getPreviewSnapshot: () => ({ values: state.value, step: step.value }),
    onSnapshot: applySnapshot,
    onLock: value => { locked.value = value; },
    onVisibility: value => { resultsVisible.value = value; },
    onAdvance: direction => { if (view === 'results') selectStep(step.value + direction); },
    onError: showError,
  });

  function publish(method, args, next) {
    if (connection.desktop && !connection.ready) {
      showError(new Error(t('status.wait')));
      return;
    }
    applySnapshot(next);
    connection.publish(method, args, { values: next.values, step: next.step });
  }

  function selectField(key, value) {
    const nextValue = state.value[key] === value ? null : value;
    const next = { ...snapshot.value, values: { ...state.value, [key]: nextValue }, step: step.value };
    publish('SetField', [key, nextValue], next);
  }

  function selectStep(value) {
    const nextStep = Math.max(0, Math.min(steps.value.length - 1, value));
    if (nextStep === step.value) return;
    publish('SetStep', [nextStep], { ...snapshot.value, step: nextStep });
  }

  function reset() {
    publish('Reset', [], { ...snapshot.value, values: initialState(), step: 0 });
  }

  async function native(action) {
    if (!connection.ready) {
      showError(new Error(t('status.noNative')));
      return;
    }
    try {
      await action();
    } catch (value) {
      showError(value);
    }
  }

  let active = true;
  onScopeDispose(() => {
    active = false;
    connection.dispose();
  });
  onMounted(async () => {
    try {
      reportDiagnostic('Vue mounted: ' + view);
      const status = await connection.connect();
      if (!active) return;
      desktopStatus.value = status;
      resultsVisible.value = status?.resultsVisible ?? false;
      ready.value = true;
      await nextTick();
      if (!connection.desktop) return;
      await connection.call('Ready', frontendReadyDetails(view));
    } catch (value) {
      showError(value);
    }
  });

  watch(snapshot, async next => {
    if (!next.testing || !connection.ready) return;
    await nextTick();
    const { note, truth } = renderedFirstRound();
    connection.call('Acknowledge', view, next.revision, note, truth).catch(showError);
  });

  return {
    state, steps, step, ready, desktopStatus, connection,
    locked, resultsVisible, error, showError,
    selectField, selectStep, reset, native,
  };
}
