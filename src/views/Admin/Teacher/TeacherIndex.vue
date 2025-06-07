<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  fetchTeachers,
  deleteTeacher,
  type Teacher,
  type PaginationMeta,
  type PaginationLinks,
} from '@/services/teacherService'
import { isAuthenticated } from '@/services/authService'
// Import TableComponent dari lokasi yang baru
import TableComponent from '@/components/tables/TableComponent.vue'
// Import TablePagination jika Anda ingin menggunakannya juga
import TablePagination from '@/components/tables/TablePagination.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- State Variables ---
const teachers = ref<Teacher[]>([])
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)
const currentPage = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)

// State untuk filter per kolom - akan diikat ke TableComponent menggunakan v-model
const columnFilters = ref<Record<string, string>>({})
const appliedFilters = ref<Record<string, string>>({}) // Filter yang sudah diterapkan ke API

// State untuk sorting - akan diikat ke TableComponent
const currentSortKey = ref('')
const sortDirection = ref<'asc' | 'desc' | ''>('')

// State untuk jumlah item per halaman
const itemsPerPage = ref(10)
const perPageOptions = [5, 10, 20, 50, 100]

// --- Table Headers Configuration ---
// Definisikan konfigurasi header tabel di sini
const tableHeaders = [
  { key: 'name', label: 'Nama Guru', sortable: true, filterable: true },
  { key: 'gender', label: 'Jenis Kelamin', sortable: true, filterable: true },
  { key: 'subject_count', label: 'Jumlah Mapel', sortable: false, filterable: false },
]

// --- API Fetching Logic ---
const loadTeachers = async (page: number = 1) => {
  if (!isAuthenticated()) {
    error.value = 'Anda harus login untuk melihat daftar guru.'
    teachers.value = []
    paginationMeta.value = null
    paginationLinks.value = null
    return
  }

  isLoading.value = true
  error.value = null
  try {
    let sortParam = ''
    if (currentSortKey.value) {
      sortParam = sortDirection.value === 'desc' ? `-${currentSortKey.value}` : currentSortKey.value
    }

    const response = await fetchTeachers(page, itemsPerPage.value, appliedFilters.value, sortParam)

    if (response && response.data) {
      teachers.value = response.data
      paginationMeta.value = response.meta
      paginationLinks.value = response.links
      currentPage.value = parseInt(response.meta.current_page || '1')
    } else {
      throw new Error('Format respons API tidak valid.')
    }
  } catch (err: any) {
    console.error('Error loading teachers:', err)
    if (err.response && err.response.status === 403) {
      error.value = 'Anda tidak memiliki izin untuk melihat daftar guru.'
    } else {
      error.value = err.response?.data?.message || 'Gagal memuat data guru. Silakan coba lagi.'
    }
    teachers.value = []
    paginationMeta.value = null
    paginationLinks.value = null
  } finally {
    isLoading.value = false
  }
}

// --- Filter Logic ---
// Dipanggil saat tombol "Terapkan Filter" atau Enter di input filter ditekan
const handleApplyFilters = () => {
  // Salin columnFilters ke appliedFilters dan hapus yang kosong
  const newAppliedFilters: Record<string, string> = {}
  for (const key in columnFilters.value) {
    if (columnFilters.value[key]) {
      newAppliedFilters[key] = columnFilters.value[key]
    }
  }

  // Hanya muat ulang jika ada perubahan pada filter yang diterapkan
  // Ini menghindari pemuatan ulang yang tidak perlu jika filter tidak berubah
  const hasFilterChanged =
    JSON.stringify(newAppliedFilters) !== JSON.stringify(appliedFilters.value)

  if (hasFilterChanged) {
    appliedFilters.value = newAppliedFilters
    currentPage.value = 1 // Reset halaman ke 1 saat filter baru diterapkan
    loadTeachers(currentPage.value)
  }
}

// --- Sorting Logic ---
// Dipanggil saat TableComponent meng-emit 'sort'
const handleTableSort = (key: string, direction: 'asc' | 'desc' | '') => {
  currentSortKey.value = key
  sortDirection.value = direction
  currentPage.value = 1 // Reset halaman ke 1 saat sorting baru
  loadTeachers(currentPage.value)
}

// --- Pagination Actions ---
const goToPage = (pageUrl: string | null) => {
  if (pageUrl) {
    const url = new URL(pageUrl)
    const page = parseInt(url.searchParams.get('page') || '1')
    loadTeachers(page)
  }
}

// --- CRUD Actions ---
const handleEdit = (teacherId: string) => {
  router.push({ name: 'admin.teachers.edit', params: { id: teacherId } })
}

const handleDelete = async (teacherId: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus guru ini?')) {
    return
  }

  try {
    await deleteTeacher(teacherId)
    const totalTeachersAfterDelete = paginationMeta.value
      ? parseInt(paginationMeta.value.total) - 1
      : 0
    const newCurrentPage =
      paginationMeta.value &&
      totalTeachersAfterDelete > 0 &&
      currentPage.value > 1 &&
      teachers.value.length === 1
        ? currentPage.value - 1
        : currentPage.value
    await loadTeachers(newCurrentPage)
    alert('Guru berhasil dihapus!')
  } catch (err: any) {
    console.error('Error deleting teacher:', err)
    if (err.response && err.response.status === 403) {
      alert('Anda tidak memiliki izin untuk menghapus guru.')
    } else {
      alert(err.response?.data?.message || 'Gagal menghapus guru.')
    }
  }
}

const handleViewSubjects = (teacher: Teacher) => {
  const subjectNames = teacher.subjects
    ?.map((ts) => ts.subject?.name)
    .filter(Boolean)
    .join(', ')
  alert(`Mata pelajaran ${teacher.name}: ${subjectNames || 'Tidak ada'}`)
}

// --- Watcher untuk itemsPerPage ---
watch(itemsPerPage, () => {
  currentPage.value = 1
  loadTeachers(currentPage.value)
})

// --- Lifecycle Hook ---
onMounted(() => {
  loadTeachers()
})
</script>

<template>
  <div class="teacher-index-page p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Manajemen Guru</h1>

    <div
      v-if="error"
      class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
      role="alert"
    >
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline ml-2">{{ error }}</span>
    </div>

    <TableComponent
      :headers="tableHeaders"
      :items="teachers"
      :is-loading="isLoading"
      :items-per-page="itemsPerPage"
      :empty-message="'Tidak ada guru yang ditemukan.'"
      v-model:modelValueFilters="columnFilters"
      :current-sort-key="currentSortKey"
      :sort-direction="sortDirection"
      @sort="handleTableSort"
      @apply-filters="handleApplyFilters"
    >
      <template #actionsHeader>Aksi</template>

      <template #cell-gender="{ value }">
        <span
          :class="{
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full': true,
            'bg-blue-100 text-blue-800': value === 'male',
            'bg-pink-100 text-pink-800': value === 'female',
          }"
        >
          {{ value }}
        </span>
      </template>

      <template #cell-subject_count="{ item }">
        <span v-if="(item as Teacher).subject_count">
          {{ parseInt((item as Teacher).subject_count) }} Mapel
        </span>
        <span v-else class="text-gray-500 italic"> 0 Mapel </span>
      </template>

      <template #actions="{ item }">
        <div class="flex justify-end space-x-2">
          <button
            @click="handleEdit(item.id)"
            class="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 text-sm"
          >
            Edit
          </button>
          <button
            @click="handleDelete(item.id)"
            class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm"
          >
            Hapus
          </button>
          <button
            @click="handleViewSubjects(item as Teacher)"
            class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm"
          >
            Mapel
          </button>
        </div>
      </template>
    </TableComponent>

    <div class="mt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
      <div
        v-if="paginationMeta && parseInt(paginationMeta.total) > 0"
        class="text-sm text-gray-700 order-2 sm:order-1"
      >
        Total: {{ paginationMeta.total }} data
      </div>
      <div v-else-if="!isLoading" class="text-sm text-gray-700 order-2 sm:order-1">
        Total: 0 data
      </div>

      <div class="flex items-center justify-center order-1 sm:order-2">
        <label
          for="items-per-page-bottom"
          class="mr-2 text-sm font-medium text-gray-700 whitespace-nowrap"
          >Tampilkan:</label
        >
        <select
          id="items-per-page-bottom"
          v-model.number="itemsPerPage"
          class="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5"
        >
          <option v-for="option in perPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <span class="ml-2 text-sm text-gray-600 whitespace-nowrap">data per halaman</span>
      </div>

      <div class="order-3 w-full sm:w-auto flex justify-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>
    </div>
  </div>
</template>
