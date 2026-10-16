<script setup>
import { computed } from 'vue';
import { linkedMechanics } from '../../rules.js';
import { useTranslation } from '../composables/usePreferences.js';
import InputGroup from './InputGroup.vue';

const props = defineProps({ state: Object, preferences: Object, disabled: Boolean });
const emit = defineEmits(['select', 'preference']);
const linked = computed(() => linkedMechanics(props.state));
const t = useTranslation();
</script>

<template>
  <div class="scroll">
    <section id="input-panel">
      <div class="module-options">
        <span>{{ t('modules.title') }}</span>
        <label><input id="enable-flood" type="checkbox" :checked="preferences.enableFlood"
          @change="emit('preference', { enableFlood: $event.target.checked })">{{ t('ui.flood') }}</label>
        <label><input id="enable-magic" type="checkbox" :checked="preferences.enableMagic"
          @change="emit('preference', { enableMagic: $event.target.checked })">{{ t('modules.magic') }}</label>
      </div>
      <div class="record-guide"><span>{{ t('ui.recordGuide') }}</span><span>{{ t('ui.truthHint') }}</span></div>

      <div class="section-title"><span>01</span><b>{{ t('ui.cross1') }}</b><small>{{ t('ui.durationHint') }}</small></div>
      <div class="card encounter-card"><InputGroup name="cross1-inputs" class-name="inline-fields"
        :state="state" :disabled="disabled" @select="(...args) => emit('select', ...args)" /></div>

      <div class="section-title"><span>02</span><b>{{ t('ui.chaos1') }}</b><small>{{ t('ui.chaosHint') }}</small></div>
      <div class="card encounter-card"><InputGroup name="chaos1-inputs" class-name="inline-fields"
        :state="state" :disabled="disabled" @select="(...args) => emit('select', ...args)" /></div>

      <div class="section-title"><span>03</span><b>{{ t('ui.cross2') }}</b>
        <small id="duration2">{{ t('derived.duration.' + (linked.duration2 ?? 'pending')) }}</small></div>
      <div class="card encounter-card"><InputGroup name="cross2-inputs" class-name="inline-fields"
        :state="state" :disabled="disabled" @select="(...args) => emit('select', ...args)" /></div>

      <div class="section-title"><span>04</span><b>{{ t('ui.chaos2') }}</b>
        <small id="element2">{{ t('derived.element.' + (linked.element2 ?? 'pending')) }}</small></div>
      <div class="card encounter-card"><InputGroup name="chaos2-inputs" class-name="inline-fields"
        :state="state" :disabled="disabled" @select="(...args) => emit('select', ...args)" /></div>

      <section id="flood-module" :hidden="!preferences.enableFlood">
        <div class="section-title"><span>+</span><b>{{ t('ui.flood') }}</b></div>
        <InputGroup name="personal-inputs" class-name="card secondary-fields" :state="state" :disabled="disabled"
          @select="(...args) => emit('select', ...args)" />
      </section>
      <section id="magic-module" :hidden="!preferences.enableMagic">
        <div class="section-title"><span>+</span><b>{{ t('ui.magic') }}</b><small>{{ t('ui.magicHint') }}</small></div>
        <InputGroup name="magic-inputs" class-name="card secondary-fields" :state="state" :disabled="disabled"
          @select="(...args) => emit('select', ...args)" />
      </section>
      <div class="tip">{{ t('ui.tip') }}</div>
    </section>
  </div>
</template>
