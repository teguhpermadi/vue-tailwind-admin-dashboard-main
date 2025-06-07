<script setup lang="ts">
import { ref, watch } from 'vue';

const modelValue = defineModel<string>({ default: '' }); // Menggunakan defineModel di Vue 3.4+

// Optional: emit an event when search term changes for immediate updates
// Or rely on v-model for explicit changes
// const emit = defineEmits(['update:modelValue', 'search']);

// watch(localSearchTerm, (newVal) => {
//   emit('update:modelValue', newVal);
// });

// const performSearch = () => {
//   emit('search', localSearchTerm.value);
// };
</script>

<template>
  <div class="flex items-center w-full">
    <input
      type="text"
      v-model="modelValue"
      @keyup.enter="$emit('search', modelValue)" placeholder="Cari..."
      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5"
    />
    <button
      @click="$emit('search', modelValue)"
      class="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
    >
      Cari
    </button>
  </div>
</template>