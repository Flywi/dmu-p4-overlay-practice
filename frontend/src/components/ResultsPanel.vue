<script setup>
import { computed } from 'vue';
import { flood, truthLabel } from '../../rules.js';
import { useTranslation } from '../composables/usePreferences.js';

const props = defineProps({ steps: Array, step: Number, state: Object, enableFlood: Boolean });
const emit = defineEmits(['select']);
const t = useTranslation();
const heading = computed(() => t('ui.resultsCount', { count: props.steps.length }));
const floodText = computed(() => props.enableFlood
  ? t('result.truth', { label: t('result.flood'), truth: truthLabel(props.state.flood) }) + ' · '
    + t('rule.flood.label', { result: flood(props.state.flood, props.state.fate) })
  : '');
</script>

<template>
  <section class="results" :aria-label="heading">
    <div class="results-heading">
      <strong>{{ heading }}</strong>
      <button id="previous" :aria-label="t('ui.previous')" :disabled="step === 0" @click="emit('select', step - 1)">‹</button>
      <button id="next" :aria-label="t('ui.next')" :disabled="step === steps.length - 1" @click="emit('select', step + 1)">›</button>
    </div>
    <div id="timeline">
      <button v-for="(item, index) in steps" :key="index" class="round-result" :class="{ current: index === step }"
        :aria-pressed="index === step" @click="emit('select', index)">
        <strong class="round-label">{{ item.title }}</strong>
        <span class="round-content">
          <small class="round-truth">{{ item.truth }}</small>
          <span class="round-main">{{ item.main }}</span>
          <small v-if="item.note" class="round-note">{{ item.note }}</small>
        </span>
      </button>
    </div>
    <div id="flood-result" :hidden="!enableFlood">{{ floodText }}</div>
  </section>
</template>
