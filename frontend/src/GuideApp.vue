<script setup>
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { isDesktopEnvironment, loadRuntime } from '../connection.js';
import { usePreferences, useTranslation } from './composables/usePreferences.js';

const IMAGE_COUNT = 9;
const IMAGE_SIZE = 840;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const { preferences } = usePreferences();
const t = useTranslation(preferences);
const currentPage = ref(0);
const manualZoom = ref(1);
const fitToWindow = ref(true);
const viewport = ref(null);
const viewportSize = ref(IMAGE_SIZE);
const runtime = shallowRef(null);
const loadedSize = shallowRef(null);
const error = ref('');
const zoom = computed(() => fitToWindow.value ? Math.min(1, Math.max(.1, viewportSize.value / IMAGE_SIZE)) : manualZoom.value);
const imageSource = computed(() => '/guide/step-' + String(currentPage.value + 1).padStart(2, '0') + '.png');
const pageTitle = index => t('guide.page', { page: index + 1, count: IMAGE_COUNT }) + ' · ' + t('guide.step.' + (index + 1));

function selectPage(index) {
  currentPage.value = Math.max(0, Math.min(IMAGE_COUNT - 1, index));
  viewport.value?.scrollTo(0, 0);
}
function changeZoom(delta) {
  manualZoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));
  fitToWindow.value = false;
}
function originalSize() {
  manualZoom.value = 1;
  fitToWindow.value = false;
}
function showError(value) { error.value = value?.message || String(value); }
function close() {
  if (runtime.value) runtime.value.Window.Hide().catch(showError);
  else window.close();
}
function imageLoaded(event) {
  error.value = '';
  loadedSize.value = { naturalWidth: event.target.naturalWidth, naturalHeight: event.target.naturalHeight };
}
function keydown(event) {
  if (event.target.matches('select') && event.key !== 'Escape') return;
  if (event.key === 'ArrowLeft') selectPage(currentPage.value - 1);
  else if (event.key === 'ArrowRight') selectPage(currentPage.value + 1);
  else if (event.key === '+' || event.key === '=') changeZoom(ZOOM_STEP);
  else if (event.key === '-') changeZoom(-ZOOM_STEP);
  else if (event.key === 'Escape') close();
  else return;
  event.preventDefault();
}

watch([runtime, () => preferences.value.language], () => {
  document.title = t('guide.title');
  if (runtime.value) runtime.value.Window.SetTitle(document.title).catch(showError);
}, { immediate: true });
watch([runtime, loadedSize], () => {
  if (!runtime.value || !loadedSize.value) return;
  runtime.value.Call.ByName('main.OverlayService.GuideReady', {
    imageCount: IMAGE_COUNT, ...loadedSize.value, renderer: 'vue3',
  }).catch(showError);
});

let observer;
let active = true;
onMounted(async () => {
  observer = new ResizeObserver(() => {
    viewportSize.value = Math.min(viewport.value.clientWidth, viewport.value.clientHeight);
  });
  observer.observe(viewport.value);
  window.addEventListener('keydown', keydown);
  if (isDesktopEnvironment()) {
    try {
      const module = await loadRuntime();
      if (active) runtime.value = module;
    } catch (value) {
      showError(value);
    }
  }
});
onScopeDispose(() => {
  active = false;
  observer?.disconnect();
  window.removeEventListener('keydown', keydown);
});
</script>

<template>
  <header><div><strong>{{ t('guide.title') }}</strong><small>{{ t('guide.source') }}</small></div>
    <button id="guide-close" @click="close">{{ t('ui.close') }}</button></header>
  <nav>
    <button id="guide-previous" :disabled="currentPage === 0" @click="selectPage(currentPage - 1)">{{ t('guide.previous') }}</button>
    <select id="guide-step" :value="currentPage" :aria-label="t('guide.step')" @change="selectPage(Number($event.target.value))">
      <option v-for="page in IMAGE_COUNT" :key="page" :value="page - 1">{{ pageTitle(page - 1) }}</option>
    </select>
    <button id="guide-next" :disabled="currentPage === IMAGE_COUNT - 1" @click="selectPage(currentPage + 1)">{{ t('guide.next') }}</button>
    <span class="zoom-controls">
      <button id="guide-zoom-out" :aria-label="t('guide.zoomOut')" :disabled="zoom <= MIN_ZOOM && !fitToWindow" @click="changeZoom(-ZOOM_STEP)">−</button>
      <output id="guide-zoom">{{ Math.round(zoom * 100) }}%</output>
      <button id="guide-zoom-in" :aria-label="t('guide.zoomIn')" :disabled="zoom >= MAX_ZOOM" @click="changeZoom(ZOOM_STEP)">+</button>
      <button id="guide-fit" @click="fitToWindow = true">{{ t('guide.fit') }}</button>
      <button id="guide-original" @click="originalSize">{{ t('guide.original') }}</button>
    </span>
  </nav>
  <main id="guide-viewport" ref="viewport" tabindex="0" :aria-label="t('guide.image')">
    <div id="guide-canvas"><img id="guide-image" :src="imageSource" :alt="pageTitle(currentPage)" :draggable="false"
      :style="{ width: Math.round(IMAGE_SIZE * zoom) + 'px', height: Math.round(IMAGE_SIZE * zoom) + 'px' }"
      @load="imageLoaded" @error="showError(new Error(t('guide.imageError')))" /></div>
  </main>
  <footer><span id="guide-caption">{{ t('guide.step.' + (currentPage + 1)) }}</span><span>{{ t('guide.shortcuts') }}</span></footer>
  <p v-if="error" id="guide-error" role="alert">{{ t('guide.error', { message: error }) }}</p>
</template>
