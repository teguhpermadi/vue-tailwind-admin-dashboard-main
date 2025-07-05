<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue'
import {
  fetchTeachers,
  deleteTeacher,
  deleteMultipleTeachers,
  exportTeachers,
  importTeachers,
  downloadTeacherTemplate,
  type Teacher,
  type PaginationMeta,
  type PaginationLinks,
  type ImportErrorResponse,
  type ImportValidationError,
  generateTeacherLinkToken,
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
import ButtonGroupComponent from '@/components/ui/ButtonGroupComponent.vue'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from 'vue-toastification'

// Import useI18n
import { useI18n } from 'vue-i18n'

// Inject SweetAlert2 yang di-provide dari main.ts
import Swal from 'sweetalert2'

// Inisialisasi useI18n
const { t } = useI18n()

const currentPageTitle = ref(t('teacher.management'))

const router = useRouter()
const authStore = useAuthStore()

// --- State Variables ---
const teachers = ref<Teacher[]>([])
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)
const currentPage = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)
const toast = useToast()

// State untuk filter per kolom - akan diikat ke TableComponent menggunakan v-model
const columnFilters = ref<Record<string, string>>({})
const appliedFilters = ref<Record<string, string>>({}) // Filter yang sudah diterapkan ke API

// State untuk sorting - akan diikat ke TableComponent
const currentSortKey = ref('')
const sortDirection = ref<'asc' | 'desc' | ''>('')

// State untuk jumlah item per halaman
const itemsPerPage = ref(10)
const perPageOptions = [5, 10, 20, 50, 100]

// --- State untuk Modal Konfirmasi Hapus Single ---
const showDeleteConfirmModal = ref(false)
const teacherToDeleteId = ref<string | null>(null)
const teacherToDeleteName = ref<string | null>(null) // Untuk menampilkan nama di modal
const isDeleting = ref(false) // Untuk spinner tombol single delete

// --- NEW STATE: Untuk Penghapusan Massal ---
const selectedTeacherIds = ref<string[]>([]) // Array ID guru yang dipilih dari TableComponent
const showBulkDeleteConfirmModal = ref(false)
const isBulkDeleting = ref(false) // Untuk spinner tombol bulk delete

// state untuk generate link
const generatedLink = ref<string | null>(null)
const showLinkModal = ref(false) // Untuk menampilkan modal link

// Computed untuk mengontrol apakah tombol bulk delete aktif
const canBulkDelete = computed(() => selectedTeacherIds.value.length > 0)

// Computed untuk status "Pilih Semua" di tingkat parent (untuk tombol "Pilih Semua")
// Mengambil semua ID guru dari halaman saat ini
const allCurrentPageTeacherIds = computed(() =>
  teachers.value.map((t) => t.id).filter((id) => id != null),
)

// Memeriksa apakah semua guru di halaman saat ini sudah terpilih
const allCurrentPageSelected = computed(() => {
  if (allCurrentPageTeacherIds.value.length === 0) return false
  return allCurrentPageTeacherIds.value.every((id) => selectedTeacherIds.value.includes(id))
})

// --- NEW STATE: Untuk Import ---
const showImportModal = ref(false)
const fileToImport = ref<File | null>(null)
const isImporting = ref(false)
const importValidationErrors = ref<ImportValidationError[]>([])

// --- Table Headers Configuration ---
const tableHeaders = [
  { key: 'name', label: t('teacher.name'), sortable: true, filterable: true },
  { key: 'gender', label: t('teacher.gender'), sortable: true, filterable: true },
]

// --- API Fetching Logic ---
const loadTeachers = async (page: number = 1) => {
  if (!isAuthenticated()) {
    error.value = t('common.you_must_login')
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
      // console.log(response.data)
      teachers.value = response.data
      paginationMeta.value = response.meta
      paginationLinks.value = response.links
      currentPage.value = parseInt(response.meta.current_page || '1')
    } else {
      throw new Error(t('common.api_not_valid'))
    }
  } catch (err: any) {
    if (err.response && err.response.status === 403) {
      error.value = t('common.you_must_login')
    } else {
      error.value = err.response?.data?.message || t('common.api_failed')
    }
    teachers.value = []
    paginationMeta.value = null
    paginationLinks.value = null
  } finally {
    isLoading.value = false
  }
}

// --- Filter Logic ---
const handleApplyFilters = () => {
  const newAppliedFilters: Record<string, string> = {}
  for (const key in columnFilters.value) {
    if (columnFilters.value[key]) {
      newAppliedFilters[key] = columnFilters.value[key]
    }
  }

  const hasFilterChanged =
    JSON.stringify(newAppliedFilters) !== JSON.stringify(appliedFilters.value)

  if (hasFilterChanged) {
    appliedFilters.value = newAppliedFilters
    currentPage.value = 1
    selectedTeacherIds.value = []
    loadTeachers(currentPage.value)
  }
}

// --- Sorting Logic ---
const handleTableSort = (key: string, direction: 'asc' | 'desc' | '') => {
  currentSortKey.value = key
  sortDirection.value = direction
  currentPage.value = 1
  selectedTeacherIds.value = []
  loadTeachers(currentPage.value)
}

// --- Pagination Actions ---
const goToPage = async (pageUrl: string | null) => {
  if (pageUrl) {
    const url = new URL(pageUrl)
    const page = parseInt(url.searchParams.get('page') || '1')
    selectedTeacherIds.value = []
    await loadTeachers(page)
  }
}

// --- CRUD Actions ---
const handleEdit = (teacherId: string) => {
  router.push({ name: 'teacher.edit', params: { id: teacherId } })
}

// --- SINGLE DELETE LOGIC ---
const openDeleteConfirmModal = (teacher: Teacher) => {
  teacherToDeleteId.value = teacher.id
  teacherToDeleteName.value = teacher.name
  showDeleteConfirmModal.value = true
}

const confirmDelete = async () => {
  if (!teacherToDeleteId.value) return

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
    toast.success(t('teacher.deleted_success'))
    selectedTeacherIds.value = selectedTeacherIds.value.filter(
      (id) => id !== teacherToDeleteId.value,
    )
  } catch (err: any) {
    if (err.response && err.response.status === 403) {
      Swal.fire(t('common.error'), t('teacher.permission_to_delete'), 'error') // Use Swal for permission error
    } else {
      Swal.fire(t('common.error'), err.response?.data?.message || t('common.api_failed'), 'error') // Use Swal for API failed
    }
  } finally {
    isDeleting.value = false
    showDeleteConfirmModal.value = false
    teacherToDeleteId.value = null
    teacherToDeleteName.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirmModal.value = false
  teacherToDeleteId.value = null
  teacherToDeleteName.value = null
}

// --- NEW: BULK DELETE LOGIC ---
// Handler untuk update selectedTeacherIds dari TableComponent
const handleSelectedItemsChange = (selectedIds: string[]) => {
  selectedTeacherIds.value = selectedIds
}

const selectAllTeachers = () => {
  const newSelectedIds = [
    ...new Set([...selectedTeacherIds.value, ...allCurrentPageTeacherIds.value]),
  ]
  selectedTeacherIds.value = newSelectedIds
}

const deselectAllTeachers = () => {
  const newSelectedIds = selectedTeacherIds.value.filter(
    (id) => !allCurrentPageTeacherIds.value.includes(id),
  )
  selectedTeacherIds.value = newSelectedIds
}

const openBulkDeleteConfirmModal = () => {
  showBulkDeleteConfirmModal.value = true
}

const confirmBulkDelete = async () => {
  if (selectedTeacherIds.value.length === 0) return

  isBulkDeleting.value = true
  try {
    const idsToDelete = [...selectedTeacherIds.value]
    await deleteMultipleTeachers(idsToDelete)

    let totalTeachersAfterDelete = paginationMeta.value
      ? parseInt(paginationMeta.value.total) - idsToDelete.length
      : 0
    let newCurrentPage = currentPage.value

    const currentTeachersOnPage = teachers.value.filter((t) => idsToDelete.includes(t.id)).length
    if (currentTeachersOnPage === teachers.value.length && newCurrentPage > 1) {
      newCurrentPage--
    } else if (totalTeachersAfterDelete === 0 && newCurrentPage > 1) {
      newCurrentPage = 1
    }

    selectedTeacherIds.value = []
    await loadTeachers(newCurrentPage)
    toast.success(t('teacher.bulk_delete_success')) // Use new specific key
  } catch (err: any) {
    if (err.response && err.response.status === 403) {
      Swal.fire(t('common.error'), t('teacher.permission_to_delete'), 'error') // Use Swal
    } else {
      Swal.fire(
        t('common.error'),
        err.response?.data?.message || t('teacher.bulk_delete_failed'),
        'error',
      ) // Use Swal
    }
  } finally {
    isBulkDeleting.value = false
    showBulkDeleteConfirmModal.value = false
  }
}

const cancelBulkDelete = () => {
  showBulkDeleteConfirmModal.value = false
}

const handleCreateTeacher = () => {
  router.push({ name: 'teacher.create' })
}

// --- FUNGSI BARU: Export Teachers ---
const handleExportTeachers = async () => {
  try {
    Swal.fire({
      title: t('common.exporting_data'),
      didOpen: () => {
        Swal.showLoading()
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    })

    const blob = await exportTeachers()

    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'teachers.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    Swal.close()
    Swal.fire(t('common.success'), t('teacher.export_success'), 'success')
  } catch (error) {
    Swal.close()
    let errorMessage = t('teacher.export_failed')
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader()
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result as string)
          errorMessage = errorObj.message || errorMessage
        } catch (e) {
          errorMessage = t('teacher.export_failed') + ': ' + reader.result
        }
      }
      reader.readAsText(error.response.data)
    } else if (error.message) {
      errorMessage = error.message
    }
    Swal.fire(t('common.error'), errorMessage, 'error') // Use i18n for title
  }
}

// --- NEW: IMPORT LOGIC ---
const openImportModal = () => {
  showImportModal.value = true
  fileToImport.value = null
  importValidationErrors.value = []
  isImporting.value = false
  const fileInput = document.getElementById('importFileInput') as HTMLInputElement // Corrected ID
  if (fileInput) fileInput.value = ''
}

const cancelImport = () => {
  showImportModal.value = false
  fileToImport.value = null
  importValidationErrors.value = []
  const fileInput = document.getElementById('importFileInput') as HTMLInputElement // Corrected ID
  if (fileInput) fileInput.value = ''
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    fileToImport.value = target.files[0]
    importValidationErrors.value = []
  } else {
    fileToImport.value = null
  }
}

const handleDownloadTemplate = async () => {
  try {
    Swal.fire({
      title: t('common.downloading_template'),
      didOpen: () => {
        Swal.showLoading()
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    })

    const blob = await downloadTeacherTemplate()

    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'teacher_import_template.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    Swal.close()
    Swal.fire(t('common.success'), t('teacher.template_download_success'), 'success')
  } catch (error: any) {
    Swal.close()
    let errorMessage = t('teacher.template_download_failed')
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader()
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result as string)
          errorMessage = errorObj.message || errorMessage
        } catch (e) {
          errorMessage = t('teacher.template_download_failed') + ': ' + reader.result
        }
      }
      reader.readAsText(error.response.data)
    } else if (error.message) {
      errorMessage = error.message
    }
    Swal.fire(t('common.error'), errorMessage, 'error') // Use i18n for title
  }
}

const handleSubmitImport = async () => {
  if (!fileToImport.value) {
    Swal.fire(t('common.warning'), t('teacher.select_file_first'), 'warning')
    return
  }

  isImporting.value = true
  importValidationErrors.value = []

  try {
    Swal.fire({
      title: t('common.importing_data'),
      didOpen: () => {
        Swal.showLoading()
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    })

    const response = await importTeachers(fileToImport.value)

    Swal.close()
    // Check if response has 'data_count' or 'imported_count'
    const importedCount = response.data_count || response.imported_count || 0
    Swal.fire(
      t('common.success'),
      t('teacher.import_success', { count: importedCount }), // Pass count for i18n
      'success',
    )
    cancelImport()
    loadTeachers()
  } catch (error: any) {
    Swal.close()
    isImporting.value = false

    let errorMessage = t('teacher.import_failed_general') // Default general error message

    // Handle specific validation errors from backend (e.g., from TeacherTemplateValidation or TeacherImport)
    if (error.response && error.response.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message
      }
      // If there are detailed errors (e.g., from TeacherImport's validation failures)
      if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
        importValidationErrors.value = error.response.data.errors
        errorMessage = error.response.data.message || t('teacher.import_validation_errors')

        let errorDetailsHtml = `<p>${errorMessage}</p><ul class="text-left mt-2 space-y-1 text-sm">`
        importValidationErrors.value.forEach((err: ImportValidationError) => {
          errorDetailsHtml += `<li><strong>${t('common.row')} ${err.row}:</strong> ${err.errors.join(', ')}</li>`
        })
        errorDetailsHtml += '</ul>'

        Swal.fire({
          title: t('common.error'), // General error title
          html: errorDetailsHtml,
          icon: 'error',
          confirmButtonText: t('common.ok'),
          width: '600px', // Adjust width for better readability if many errors
        })
        return // Exit here if detailed errors are handled
      }
    } else if (error.message) {
      errorMessage = error.message // Generic JS error message
    }

    Swal.fire(t('common.error'), errorMessage, 'error') // Fallback for simple errors
  } finally {
    isImporting.value = false
  }
}

const handleGenerateLink = async (teacherId: string) => {
  try {
    // Tampilkan loading SweetAlert2
    Swal.fire({
      title: t('common.loading'),
      text: 'Membuat link penautan...',
      didOpen: () => {
        Swal.showLoading()
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    })

    const response = await generateTeacherLinkToken(teacherId)
    generatedLink.value = response.token

    Swal.close()
    showLinkModal.value = true // Tampilkan modal dengan link
    toast.success(t('teacher.link_generated_success')) // Tambahkan ini ke locale
  } catch (error: any) {
    Swal.close()
    const errorMessage = error.response?.data?.message || t('common.api_failed')
    Swal.fire(t('common.error'), errorMessage, 'error')
  }
}

// NEW: Copy to clipboard functionality
const copyToClipboard = () => {
  if (generatedLink.value) {
    // Membuat elemen textarea sementara untuk menyalin teks
    const textarea = document.createElement('textarea');
    textarea.value = generatedLink.value;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success(t('teacher.link_copied_success')); // New locale key
      } else {
        toast.error(t('teacher.link_copied_failed')); // New locale key
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error(t('teacher.link_copied_failed'));
    }
    document.body.removeChild(textarea);
  }
};

// --- Watcher untuk itemsPerPage ---
watch(itemsPerPage, () => {
  currentPage.value = 1
  selectedTeacherIds.value = []
  loadTeachers(currentPage.value)
})

// --- Lifecycle Hook ---
onMounted(() => {
  loadTeachers()

  window.Echo.channel('teachers')
    .listen('.teacher.created', (e) => {
      // console.log('Event received: teacher.created', e); // DEBUG LOG
      loadTeachers(currentPage.value)
      // toast.success(t('teacher.created_success_toast', { name: e.teacher.name })) // Menggunakan kunci i18n baru
    })
    .listen('.teacher.updated', (e) => {
      // console.log('Event received: teacher.updated', e); // DEBUG LOG
      const index = teachers.value.findIndex((t) => t.id === e.teacher.id)
      if (index !== -1) {
        teachers.value[index] = e.teacher
      }
      // toast.success(t('teacher.updated_success_toast', { name: e.teacher.name })) // Menggunakan kunci i18n baru
    })
    .listen('.teacher.deleted', (e) => {
      // console.log('Event received: teacher.deleted', e); // DEBUG LOG
      teachers.value = teachers.value.filter((t) => t.id !== e.teacher_id)
      // toast.success(t('teacher.deleted_success_toast')) // Menggunakan kunci i18n baru
      loadTeachers(currentPage.value)
    })
})

onBeforeUnmount(() => {
  window.Echo.leaveChannel('teachers')
  console.log('Leaving teachers channel.') // DEBUG LOG
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6">{{ t('teacher.management') }}</h1>

      <div
        v-if="error"
        class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        role="alert"
      >
        <strong class="font-bold">{{ t('common.error') }}!</strong>
        <span class="block sm:inline ml-2">{{ error }}</span>
      </div>

      <div
        class="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0"
      >
        <!-- Left Container: Per Page and Bulk Delete Button -->
        <div
          class="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto justify-start"
        >
          <!-- "Per Page" Dropdown -->
          <div class="flex items-center space-x-2">
            <label for="perPageSelect" class="text-sm font-medium text-gray-700"
              >{{ t('common.show') }}:</label
            >
            <select
              id="perPageSelect"
              v-model.number="itemsPerPage"
              class="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span class="text-sm text-gray-700">{{ t('common.data_per_page') }}</span>
          </div>

          <!-- Bulk Delete Button - only visible if items selected and has permission -->
          <div v-if="canBulkDelete" class="flex items-center space-x-2">
            <ButtonComponent
              v-if="authStore.can('delete-teacher')"
              variant="danger"
              size="sm"
              @click="openBulkDeleteConfirmModal"
              :loading="isBulkDeleting"
            >
              {{ t('common.bulk_delete') }} ({{ selectedTeacherIds.length }})
            </ButtonComponent>
          </div>
        </div>

        <!-- Right Container: Create Teacher Button -->
        <div class="flex items-center w-full sm:w-auto justify-end space-x-2">
          <!-- Import Data Button -->
          <ButtonComponent variant="info" size="md" @click="openImportModal">
            {{ t('teacher.import_data') }}
          </ButtonComponent>

          <!-- Export Data Button -->
          <ButtonComponent variant="success" size="md" @click="handleExportTeachers">
            {{ t('teacher.export_data') }}
          </ButtonComponent>

          <!-- Create Teacher Button -->
          <ButtonComponent
            v-if="authStore.can('create-teacher')"
            variant="primary"
            size="md"
            @click="handleCreateTeacher"
          >
            {{ t('common.create') }}
          </ButtonComponent>
        </div>
      </div>

      <TableComponent
        :headers="tableHeaders"
        :items="teachers"
        :is-loading="isLoading"
        :items-per-page="itemsPerPage"
        :empty-message="t('common.no_data')"
        v-model:modelValueFilters="columnFilters"
        :current-sort-key="currentSortKey"
        :sort-direction="sortDirection"
        @sort="handleTableSort"
        @apply-filters="handleApplyFilters"
        :selectedItems="selectedTeacherIds"
        @update:selectedItems="handleSelectedItemsChange"
      >
        <template #actionsHeader>{{ t('common.actions') }}</template>

        <template #cell-gender="{ value }">
          <span
            :class="{
              'px-2 inline-flex text-xs leading-5 font-semibold rounded-full': true,
              'bg-blue-100 text-blue-800': value === 'L', // Compare with 'L' as returned by backend
              'bg-pink-100 text-pink-800': value === 'P', // Compare with 'P' as returned by backend
            }"
          >
            {{ value === 'L' ? t('common.male') : t('common.female') }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end space-x-2">
            <ButtonGroupComponent>
              <ButtonComponent
                v-if="authStore.can('update-teacher')"
                variant="warning"
                @click="handleEdit(item.id)"
                >{{ t('common.edit') }}</ButtonComponent
              >
              <ButtonComponent
                v-if="authStore.can('delete-teacher')"
                variant="danger"
                @click="openDeleteConfirmModal(item as Teacher)"
                >{{ t('common.delete') }}</ButtonComponent
              >
              <ButtonComponent variant="info" @click="handleGenerateLink(item.id)" v-if="item.user == null"
                >Generate Link</ButtonComponent
              >
            </ButtonGroupComponent>
          </div>
        </template>
      </TableComponent>

      <div class="mt-8 justify-between items-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>

      <!-- Single Delete Confirmation Modal -->
      <ModalComponent
        v-model="showDeleteConfirmModal"
        :title="t('common.confirm')"
        type="danger"
        max-width="sm"
        :show-close-button="true"
        :backdrop-dismiss="true"
        @close="cancelDelete"
      >
        <p>
          <i18n-t keypath="teacher.delete_confirmation_single" tag="span">
            <template v-slot:name>
              <span class="font-semibold text-red-700">{{ teacherToDeleteName }}</span>
            </template>
          </i18n-t>
        </p>
        <template #actions>
          <ButtonComponent
            variant="secondary"
            size="sm"
            @click="cancelDelete"
            :disabled="isDeleting"
          >
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent variant="danger" size="sm" @click="confirmDelete" :loading="isDeleting">
            {{ t('common.delete') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Bulk Delete Confirmation Modal -->
      <ModalComponent
        v-model="showBulkDeleteConfirmModal"
        :title="t('common.confirm')"
        type="danger"
        max-width="sm"
        :show-close-button="!isBulkDeleting"
        :backdrop-dismiss="!isBulkDeleting"
        @close="cancelBulkDelete"
      >
        <p>
          <i18n-t keypath="teacher.delete_confirmation_bulk" tag="span">
            <template v-slot:count>
              <span class="font-semibold text-red-700">{{ selectedTeacherIds.length }}</span>
            </template>
          </i18n-t>
        </p>
        <template #actions>
          <ButtonComponent
            variant="secondary"
            size="sm"
            @click="cancelBulkDelete"
            :disabled="isBulkDeleting"
          >
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent
            variant="danger"
            size="sm"
            @click="confirmBulkDelete"
            :loading="isBulkDeleting"
          >
            {{ t('common.delete') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Modal Import Data Teacher -->
      <ModalComponent
        v-model="showImportModal"
        :title="t('teacher.import_title')"
        type="info"
        max-width="md"
        :show-close-button="!isImporting"
        :backdrop-dismiss="!isImporting"
        @close="cancelImport"
      >
        <p class="mb-4">{{ t('teacher.import_description') }}</p>

        <div class="mb-4">
          <label for="importFileInput" class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('teacher.choose_excel_file') }}
          </label>
          <input
            type="file"
            id="importFileInput"
            @change="handleFileChange"
            accept=".xls,.xlsx"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            :disabled="isImporting"
          />
          <p v-if="fileToImport" class="mt-2 text-sm text-gray-600">
            {{ t('teacher.selected_file') }}:
            <span class="font-medium">{{ fileToImport.name }}</span>
          </p>
        </div>
        <template #actions>
          <ButtonComponent
            variant="secondary"
            size="sm"
            @click="cancelImport"
            :disabled="isImporting"
          >
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent
            variant="primary"
            size="sm"
            @click="handleDownloadTemplate"
            :disabled="isImporting"
          >
            {{ t('teacher.download_template') }}
          </ButtonComponent>
          <ButtonComponent
            variant="success"
            size="sm"
            @click="handleSubmitImport"
            :loading="isImporting"
          >
            {{ t('common.submit_excel') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Modal untuk menampilkan link yang dihasilkan -->
      <ModalComponent v-model="showLinkModal" :title="t('teacher.generated_link_title')" type="info" max-width="md">
        <p class="mb-4">{{ t('teacher.generated_link_description') }}</p>
        <div class="flex items-center space-x-2 bg-gray-100 p-3 rounded-md break-all text-gray-800">
          <strong class="flex-grow">{{ generatedLink }}</strong>
          <button 
            @click="copyToClipboard" 
            class="p-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Salin Link"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </button>
        </div>
        <p v-if="linkExpiresAt" class="mt-2 text-sm text-gray-600">
          {{ t('teacher.link_expires_info', { time: new Date(linkExpiresAt).toLocaleString() }) }}
        </p>
        <template #actions>
          <ButtonComponent variant="primary" @click="showLinkModal = false">{{ t('common.close') }}</ButtonComponent>
        </template>
      </ModalComponent>
    </div>
  </AdminLayout>
</template>
