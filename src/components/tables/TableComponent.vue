<script setup lang="ts">
import { computed } from 'vue';
import TableHeader from './TableHeader.vue'; // Sub-komponen untuk header kolom

// --- Interfaces for Props ---
export interface TableHeaderConfig {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean; // Menunjukkan apakah kolom bisa difilter
}

interface Props {
  headers: TableHeaderConfig[]; // Konfigurasi header tabel
  items: Record<string, any>[]; // Data yang akan ditampilkan di tabel
  caption?: string; // Judul tabel (aksesibilitas)
  isLoading?: boolean; // Status loading untuk menampilkan skeleton
  itemsPerPage?: number; // Jumlah item per halaman (untuk skeleton)
  emptyMessage?: string; // Pesan jika tidak ada data

  // Props untuk filtering (v-model untuk filter per kolom)
  // Ini akan diikat langsung dengan `columnFilters` di parent
  modelValueFilters?: Record<string, string>;

  // Props untuk sorting
  currentSortKey?: string;
  sortDirection?: 'asc' | 'desc' | '';
}

const props = withDefaults(defineProps<Props>(), {
  caption: undefined,
  isLoading: false,
  itemsPerPage: 10,
  emptyMessage: 'Tidak ada data yang tersedia.',
  modelValueFilters: () => ({}), // Default ke objek kosong
  currentSortKey: '',
  sortDirection: '',
});

// --- Emits ---
const emit = defineEmits<{
  (e: 'update:modelValueFilters', filters: Record<string, string>): void; // Emit untuk filter
  (e: 'sort', sortKey: string, sortDirection: 'asc' | 'desc' | ''): void; // Emit untuk sorting
  (e: 'apply-filters'): void; // Emit ketika filter di-apply (misal: Enter ditekan)
}>();

// --- Logic for Sorting ---
const handleHeaderSort = (sortKey: string, direction: 'asc' | 'desc' | '') => {
  emit('sort', sortKey, direction);
};

// --- Logic for Filtering ---
const handleColumnFilterInput = (key: string, value: string) => {
  const newFilters = { ...props.modelValueFilters, [key]: value };
  emit('update:modelValueFilters', newFilters);
};

const handleFilterEnter = () => {
  emit('apply-filters');
};

// --- Dynamic Classes ---
const tbodyClasses = computed(() => ({
  'divide-y divide-gray-200': true,
  'bg-white': true,
}));

const getRowClass = (index: number) => ({
  'bg-gray-50': index % 2 !== 0, // Striped rows
});
</script>

<template>
  <div class="p-4 bg-gray-100 rounded-lg shadow-md">
    <div class="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table class="min-w-full divide-y divide-gray-200 table-auto">
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <thead class="bg-gray-50">
          <tr>
            <TableHeader
              v-for="header in headers"
              :key="header.key"
              :header="header"
              :currentSortKey="currentSortKey"
              :sortDirection="sortDirection"
              @sort="handleHeaderSort"
            />
            <th v-if="$slots.actionsHeader" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              <slot name="actionsHeader">Aksi</slot>
            </th>
          </tr>

          <tr>
            <th
              v-for="header in headers"
              :key="`filter-${header.key}`"
              class="px-6 py-3 border-t border-gray-200 bg-gray-50"
            >
              <input
                v-if="header.filterable"
                type="text"
                :value="modelValueFilters?.[header.key] || ''"
                @input="handleColumnFilterInput(header.key, ($event.target as HTMLInputElement).value)"
                @keyup.enter="handleFilterEnter"
                :placeholder="`Filter ${header.label}`"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1"
              />
              <div v-else class="h-full"></div> </th>
            <th v-if="$slots.actionsHeader" class="px-6 py-3 border-t border-gray-200 bg-gray-50"></th>
          </tr>
        </thead>
        <tbody :class="tbodyClasses">
          <tr v-if="isLoading">
            <td :colspan="headers.length + ($slots.actionsHeader ? 1 : 0)" class="px-6 py-4">
              <div class="animate-pulse">
                <div v-for="n in itemsPerPage" :key="n" class="h-8 bg-gray-200 rounded mb-2 last:mb-0 w-full"></div>
              </div>
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td :colspan="headers.length + ($slots.actionsHeader ? 1 : 0)" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 italic">
              {{ emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(item, rowIndex) in items"
              :key="item.id || `row-${rowIndex}`"
              :class="getRowClass(rowIndex)"
            >
              <td
                v-for="header in headers"
                :key="`data-${item.id}-${header.key}`"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
              >
                <slot :name="`cell-${header.key}`" :value="item[header.key]" :item="item">
                  {{ item[header.key] }} </slot>
              </td>
              <td v-if="$slots.actions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <slot name="actions" :item="item"></slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>