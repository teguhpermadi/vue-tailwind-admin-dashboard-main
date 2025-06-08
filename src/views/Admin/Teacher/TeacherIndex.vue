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
import TableComponent from '@/components/tables/TableComponent.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import { useRouter } from 'vue-router'
import ModalComponent from '@/components/ui/ModalComponent.vue'
import Spinner from '@/components/common/Spinner.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ButtonComponent from '@/components/ui/ButtonComponent.vue'
import ButtonGroupComponent from '@/components/ui/ButtonGroupComponent.vue' // Jika Anda akan menggunakan grup

const currentPageTitle = ref('Teacher Management')

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

// --- State untuk Modal Konfirmasi Hapus ---
const showDeleteConfirmModal = ref(false)
const teacherToDeleteId = ref<string | null>(null)
const teacherToDeleteName = ref<string | null>(null) // Untuk menampilkan nama di modal

// --- New State: Untuk Loading Spinner di Tombol Hapus Modal ---
const isDeleting = ref(false)

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

// --- New: Open Delete Confirmation Modal ---
const openDeleteConfirmModal = (teacher: Teacher) => {
  teacherToDeleteId.value = teacher.id
  teacherToDeleteName.value = teacher.name
  showDeleteConfirmModal.value = true
}

// --- New: Confirm Delete Action (after modal confirmation) ---
const confirmDelete = async () => {
  if (!teacherToDeleteId.value) return

  // --- Start Loading ---
  isDeleting.value = true
  try {
    await deleteTeacher(teacherToDeleteId.value)
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
    // alert('Guru berhasil dihapus!')
  } catch (err: any) {
    console.error('Error deleting teacher:', err)
    if (err.response && err.response.status === 403) {
      alert('Anda tidak memiliki izin untuk menghapus guru.')
    } else {
      alert(err.response?.data?.message || 'Gagal menghapus guru.')
    }
  } finally {
    // --- End Loading and Close Modal ---
    isDeleting.value = false
    // Tutup modal setelah operasi selesai
    showDeleteConfirmModal.value = false
    teacherToDeleteId.value = null
    teacherToDeleteName.value = null
  }
}

// --- New: Cancel Delete Action ---
const cancelDelete = () => {
  showDeleteConfirmModal.value = false
  teacherToDeleteId.value = null
  teacherToDeleteName.value = null
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
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Manajemen Guru</h1>

      <div
        v-if="error"
        class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        role="alert"
      >
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline ml-2">{{ error }}</span>
      </div>

      <div class="flex justify-between mb-4">
        <!-- items per page -->
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
            <ButtonGroupComponent>
              <ButtonComponent variant="warning" @click="handleEdit(item.id)">Edit</ButtonComponent>
              <ButtonComponent variant="danger" @click="openDeleteConfirmModal(item as Teacher)"
                >Hapus</ButtonComponent
              >
            </ButtonGroupComponent>
          </div>
        </template>
      </TableComponent>

      <div class="mt-8 justify-between items-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>

      <!-- modal component -->
      <ModalComponent
        v-model="showDeleteConfirmModal"
        title="Konfirmasi Hapus Data"
        type="danger"
        max-width="sm"
        :show-close-button="true"
        :backdrop-dismiss="true"
        @close="cancelDelete"
      >
        <p>
          Apakah Anda yakin ingin menghapus guru bernama
          <span class="font-semibold text-red-700">{{ teacherToDeleteName }}</span
          >? Tindakan ini tidak dapat dibatalkan.
        </p>
        <template #actions>
          <ButtonComponent
            variant="secondary"
            size="sm"
            @click="cancelDelete"
            :disabled="isDeleting"
          >
            Batal
          </ButtonComponent>
          <ButtonComponent variant="danger" size="sm" @click="confirmDelete" :loading="isDeleting">
            Hapus
          </ButtonComponent>
        </template>
      </ModalComponent>
    </div>
  </AdminLayout>
</template>
