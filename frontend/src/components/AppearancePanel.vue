<script setup>
import { colourKeys, defaults, fontScaleRange } from '../../preferences.js';
import { useTranslation } from '../composables/usePreferences.js';
import ColourField from './ColourField.vue';

defineProps({ preferences: Object, open: Boolean });
const emit = defineEmits(['save', 'error']);
const t = useTranslation();

function resetColours() {
  emit('save', Object.fromEntries(colourKeys.map(key => [key, defaults[key]])));
}
</script>

<template>
  <section id="appearance-panel" :hidden="!open">
    <label class="language-setting"><span>{{ t('appearance.language') }}</span>
      <select id="language" :value="preferences.language" @change="emit('save', { language: $event.target.value })">
        <option value="zh-CN">{{ t('language.zh-CN') }}</option>
        <option value="en-US">{{ t('language.en-US') }}</option>
      </select>
    </label>
    <div class="font-setting">
      <label for="font-scale">{{ t('appearance.fontSize') }}</label>
      <input id="font-scale" type="range" :min="fontScaleRange.min" :max="fontScaleRange.max" :step="fontScaleRange.step" :value="preferences.fontScale"
        @input="emit('save', { fontScale: Number($event.target.value) })">
      <output for="font-scale">{{ preferences.fontScale }}%</output>
      <button id="reset-font-size" @click="emit('save', { fontScale: defaults.fontScale })">{{ t('appearance.fontReset') }}</button>
    </div>
    <div class="colour-settings">
      <ColourField v-for="key in colourKeys" :key="key" :name="key" :value="preferences[key]"
        @change="value => emit('save', { [key]: value })" @error="emit('error', $event)" />
    </div>
    <div class="theme-footer"><small>{{ t('appearance.hint') }}</small>
      <button id="reset-colours" @click="resetColours">
        {{ t('appearance.reset') }}
      </button>
    </div>
  </section>
</template>
