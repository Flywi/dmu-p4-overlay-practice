<script setup>
import { inputGroups } from '../input-groups.js';
import { useTranslation } from '../composables/usePreferences.js';

defineProps({ name: String, state: Object, disabled: Boolean, className: String });
const emit = defineEmits(['select']);
const t = useTranslation();
</script>

<template>
  <div :id="name" :class="className">
    <div v-for="[key, label, shortLabel, options] in inputGroups[name]" :key="key" class="input-row">
      <span class="row-label">{{ t(shortLabel) }}</span>
      <div class="choices" role="group" :aria-label="t(label)">
        <button v-for="[value, text] in options" :key="String(value)"
          :data-field="key" :data-value="String(value)" :disabled="disabled"
          :class="{ active: state[key] === value }" :aria-pressed="state[key] === value"
          @click="emit('select', key, value)">{{ t(text) }}</button>
      </div>
    </div>
  </div>
</template>
