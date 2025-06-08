<script setup lang="ts">
import { computed } from 'vue';
import type { PaginationMeta, PaginationLinks } from '@/services/teacherService';

interface Props {
  meta: PaginationMeta | null;
  links: PaginationLinks | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'go-to-page', url: string): void;
}>();

const visiblePages = computed(() => {
  if (!props.meta) return [];

  const currentPage = parseInt(props.meta.current_page);
  const lastPage = parseInt(props.meta.last_page);
  const pages: (number | string)[] = [];
  const delta = 2; // Jumlah halaman di sekitar halaman saat ini yang akan ditampilkan

  // Tambahkan halaman di sekitar current page
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(lastPage, currentPage + delta); i++) {
    pages.push(i);
  }

  // Tambahkan halaman pertama jika perlu
  if (currentPage - delta > 1) {
    if (currentPage - delta > 2) {
      pages.unshift('...');
    }
    pages.unshift(1);
  }

  // Tambahkan halaman terakhir jika perlu
  if (currentPage + delta < lastPage) {
    if (currentPage + delta < lastPage - 1) {
      pages.push('...');
    }
    pages.push(lastPage);
  }

  return pages;
});

const goToPageNumber = (pageNumber: number) => {
  if (!props.links || !props.meta) return;

  const baseUrl = props.links.first ? props.links.first.split('?')[0] : '';
  const newUrl = `${baseUrl}?page=${pageNumber}&per_page=${props.meta.per_page}`;
  emit('go-to-page', newUrl);
};

// --- Fungsi Computed untuk Kelas Halaman ---
const getPageButtonClasses = (page: number | string) => {
  const baseClasses = 'px-3 py-1 rounded-md shadow-sm text-sm font-medium transition-colors duration-200';
  const isNumber = typeof page === 'number';
  const isActive = isNumber && props.meta && parseInt(props.meta.current_page) === page;

  if (isNumber) {
    return {
      [baseClasses]: true,
      'bg-blue-600 text-white cursor-default': isActive,
      'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300': !isActive,
    };
  } else {
    // Untuk '...'
    return {
      [baseClasses]: true,
      'bg-white text-gray-700 cursor-default': true,
    };
  }
};
</script>

<template>
  <div v-if="meta && parseInt(meta.total) > 0" class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
    <div class="text-sm text-gray-700 mr-3">
      Menampilkan {{ meta.from }} hingga {{ meta.to }} dari {{ meta.total }} data
    </div>

    <nav class="flex items-center space-x-1" aria-label="Pagination">
      <button
        @click="goToPageNumber(1)"
        :disabled="meta.current_page === '1'"
        class="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        First Page
      </button>

      <button
        @click="emit('go-to-page', links?.prev || '')"
        :disabled="!links?.prev"
        class="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Prev
      </button>

      <button
        v-for="(page, index) in visiblePages"
        :key="index"
        @click="typeof page === 'number' && goToPageNumber(page)"
        :disabled="typeof page !== 'number' || (meta && parseInt(meta.current_page) === page)"
        :class="getPageButtonClasses(page)" >
        {{ page }}
      </button>

      <button
        @click="emit('go-to-page', links?.next || '')"
        :disabled="!links?.next"
        class="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Next
      </button>

      <button
        @click="goToPageNumber(parseInt(meta.last_page || '1'))"
        :disabled="meta.current_page === meta.last_page"
        class="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Last Page
      </button>
    </nav>
  </div>
</template>