<script setup lang="ts">
import { computed } from 'vue';
import type { TableHeaderConfig } from './TableComponent.vue'; // Import interface dari TableComponent

interface Props {
  header: TableHeaderConfig;
  currentSortKey: string;
  sortDirection: 'asc' | 'desc' | '';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'sort', sortKey: string, sortDirection: 'asc' | 'desc' | ''): void;
}>();

const isActiveSort = computed(() => props.currentSortKey === props.header.key);

const handleClick = () => {
  if (!props.header.sortable) return;

  let newDirection: 'asc' | 'desc' | '' = 'asc';
  if (isActiveSort.value) {
    if (props.sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (props.sortDirection === 'desc') {
      newDirection = ''; // Reset sort
    } else {
      newDirection = 'asc'; // Start from asc if currently no sort
    }
  }
  emit('sort', props.header.key, newDirection);
};
</script>

<template>
  <th
    :class="[
      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
      { 'cursor-pointer select-none': header.sortable }
    ]"
    @click="handleClick"
  >
    {{ header.label }}
    <span v-if="header.sortable" class="ml-1">
      <span v-if="isActiveSort">
        <span v-if="sortDirection === 'asc'">&#9650;</span> <span v-else-if="sortDirection === 'desc'">&#9660;</span> <span v-else class="text-gray-300">&#9650;&#9660;</span> </span>
      <span v-else class="text-gray-300">&#9650;&#9660;</span> </span>
  </th>
</template>