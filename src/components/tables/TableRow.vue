<script setup lang="ts">
import { computed } from 'vue';

interface Header {
  key: string;
  label: string;
}

interface Props {
  item: Record<string, any>;
  headers: Header[];
  rowIndex: number; // Untuk key unik jika id item tidak ada
}

const props = defineProps<Props>();

// Fungsi untuk mendapatkan nilai dari item berdasarkan key header
const getItemValue = (item: Record<string, any>, key: string) => {
  // Mendukung akses nested property (misal: 'academic_year.year')
  return key.split('.').reduce((o, i) => (o ? o[i] : null), item);
};

// Computed property untuk menentukan key baris yang unik
const rowKey = computed(() => props.item.id || `row-${props.rowIndex}`);
</script>

<template>
  <tr class="hover:bg-gray-50">
    <td
      v-for="header in headers"
      :key="`${rowKey}-${header.key}`"
      class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
    >
      <slot :name="`cell-${header.key}`" :item="item" :value="getItemValue(item, header.key)">
        {{ getItemValue(item, header.key) }}
      </slot>
    </td>
    <td v-if="$slots.actions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <slot name="actions" :item="item"></slot>
    </td>
  </tr>
</template>