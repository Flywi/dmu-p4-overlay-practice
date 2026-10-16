<script setup>
import { ref } from 'vue';
import { useOpacity, usePreferences, useTranslation } from './composables/usePreferences.js';
import { useOverlay } from './composables/useOverlay.js';
import { useWindowControls } from './composables/useWindowControls.js';
import { useOverlayStatus } from './composables/useOverlayStatus.js';
import AppearancePanel from './components/AppearancePanel.vue';
import InputsPanel from './components/InputsPanel.vue';
import ResultsPanel from './components/ResultsPanel.vue';

const resultView = new URLSearchParams(location.search).get('view') === 'results';
const view = resultView ? 'results' : 'editor';
const { preferences, save } = usePreferences();
const t = useTranslation(preferences);
const opacity = useOpacity(view);
const overlay = useOverlay(view, preferences);
const {
  state, steps, step, ready, desktopStatus, connection, resultsVisible,
  error, showError, selectField, selectStep, reset,
} = overlay;
const {
  pinned, togglePin, toggleResults, openGuide, minimise, close, toggleClickThrough,
} = useWindowControls(view, overlay, t);
const { statusText, connectionText } = useOverlayStatus(overlay, preferences, t);
const appearanceOpen = ref(false);

document.body.classList.add(resultView ? 'result-view' : 'editor');

function savePreferences(patch) {
  error.value = '';
  save(patch);
}
</script>

<template>
  <main class="shell">
    <header class="titlebar">
      <div class="brand"><img class="app-icon" src="/app-icon.svg" width="26" height="26" alt="">
        <strong>{{ t('app.name') }}</strong><small id="window-kind">{{ t('window.' + view) }}</small></div>
      <div class="window-actions">
        <button id="minimise" :aria-label="t('ui.minimise')" @click="minimise">−</button>
        <button id="close" :aria-label="t('ui.close')" @click="close">×</button>
      </div>
    </header>
    <section class="preferences">
      <label><span>{{ t('ui.background') }}</span>
        <input id="opacity" v-model.number="opacity" type="range" min="10" max="95" :aria-label="t('ui.background')">
        <output id="opacity-value">{{ opacity }}%</output></label>
      <button id="pin" :aria-pressed="pinned" @click="togglePin">{{ t(pinned ? 'ui.pin.on' : 'ui.pin.off') }}</button>
      <button id="lock" :disabled="connection.desktop && (!ready || !desktopStatus?.canLock)"
        @click="toggleClickThrough">{{ t('ui.clickThrough') }}</button>
      <button id="show-results" :aria-pressed="resultsVisible" @click="toggleResults">
        {{ t(resultsVisible ? 'ui.hideResults' : 'ui.showResults') }}</button>
      <button id="appearance-toggle" :aria-expanded="appearanceOpen" @click="appearanceOpen = !appearanceOpen">{{ t('ui.appearance') }}</button>
      <button id="reset" :disabled="connection.desktop && !ready" @click="reset">{{ t('ui.reset') }}</button>
    </section>
    <AppearancePanel :preferences="preferences" :open="appearanceOpen" @save="savePreferences" @error="showError" />
    <ResultsPanel :steps="steps" :step="step" :state="state" :enable-flood="preferences.enableFlood" @select="selectStep" />
    <div id="status" role="status">{{ statusText }}</div>
    <InputsPanel :state="state" :preferences="preferences" :disabled="connection.desktop && !ready"
      @select="selectField" @preference="savePreferences" />
    <footer><span id="native-status">{{ connectionText }}</span>
      <button id="show-guide" @click="openGuide">{{ t('ui.showGuide') }}</button>
      <span>{{ t('ui.shortcuts') }}</span></footer>
  </main>
</template>
