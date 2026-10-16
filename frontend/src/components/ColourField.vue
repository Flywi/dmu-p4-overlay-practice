<script setup>
import { ref, watch } from 'vue';
import { validHex } from '../../preferences.js';
import { useTranslation } from '../composables/usePreferences.js';

const props = defineProps({ name: String, value: String });
const emit = defineEmits(['change', 'error']);
const t = useTranslation();
const draft = ref(props.value);
watch(() => props.value, value => { draft.value = value; });
function edit(value) {
  draft.value = value;
  if (validHex(value.trim())) emit('change', value.trim());
}
function validate() {
  if (!validHex(draft.value.trim())) emit('error', new Error(t('appearance.invalid')));
}
</script>

<template>
  <label>
    <span>{{ t('appearance.' + name) }}</span>
    <input :id="name + '-colour'" type="color" :value="value" @input="emit('change', $event.target.value)">
    <input :id="name + '-hex'" type="text" :value="draft" maxlength="7" :spellcheck="false"
      :aria-label="t('appearance.' + name)" @input="edit($event.target.value)" @change="validate">
  </label>
</template>
