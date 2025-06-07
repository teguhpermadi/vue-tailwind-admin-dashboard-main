<script setup lang="ts">
import { computed } from 'vue'

interface Header {
  key: string
  label: string
  sortable?: boolean // Opsional: apakah kolom bisa diurutkan
}

interface Props {
  header: Header
  currentSortKey?: string // Kunci kolom yang sedang diurutkan
  sortDirection?: 'asc' | 'desc' | '' // Arah pengurutan saat ini
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: string): void
}>()

const isSorted = computed(() => props.currentSortKey === props.header.key)
const sortIcon = computed(() => {
  if (!isSorted.value) return ''
  return props.sortDirection === 'asc' ? '▲' : '▼'
})

const handleSort = () => {
  if (props.header.sortable) {
    emit('sort', props.header.key)
  }
}
</script>

<template>
  <th
    :class="{
      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider': true,
      'cursor-pointer select-none': header.sortable,
      'bg-gray-50': isSorted, // Highlight jika sedang diurutkan
    }"
    @click="handleSort"
  >
    <div class="flex items-center">
      <span>{{ header.label }}</span>
      <span v-if="header.sortable" class="ml-2 text-xs text-gray-400">
        {{ sortIcon }}
      </span>
    </div>
  </th>
</template>
