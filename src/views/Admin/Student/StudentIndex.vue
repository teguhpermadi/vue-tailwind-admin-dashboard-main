<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue'
import {
  fetchStudents,
  deleteStudent,
  deleteMultipleStudents,
  exportStudents,
  importStudents,
  downloadStudentTemplate,
  type Student,
  type PaginationMeta,
  type PaginationLinks,
  type ImportErrorResponse,
  type ImportValidationError,
  generateStudentLinkToken
} from '@/services/studentService'
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
import Swal from 'sweetalert2';

// Inisialisasi useI18n
const { t } = useI18n()

const currentPageTitle = ref(t('student.management'))

const router = useRouter()
const authStore = useAuthStore()

// --- State Variables ---
const students = ref<Student[]>([])
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)
const currentPage = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)
const toast = useToast()

// State untuk filter per kolom - akan diikat ke TableComponent menggunakan v-model
const columnFilters = ref<Record<string, string>>({})
const appliedFilters = ref<Record<string, string>>({})

// State untuk sorting - akan diikat ke TableComponent
const currentSortKey = ref('')
const sortDirection = ref<'asc' | 'desc' | ''>('')

// State untuk jumlah item per halaman
const itemsPerPage = ref(10)
const perPageOptions = [5, 10, 20, 50, 100]

// --- State untuk Modal Konfirmasi Hapus Single ---
const showDeleteConfirmModal = ref(false)
const studentToDeleteId = ref<string | null>(null)
const studentToDeleteName = ref<string | null>(null)
const isDeleting = ref(false)

// --- NEW STATE: Untuk Penghapusan Massal ---
const selectedStudentIds = ref<string[]>([])
const showBulkDeleteConfirmModal = ref(false)
const isBulkDeleting = ref(false)

// state untuk generate link
const generatedLink = ref<string | null>(null)
const showLinkModal = ref(false) // Untuk menampilkan modal link

// Computed untuk mengontrol apakah tombol bulk delete aktif
const canBulkDelete = computed(() => selectedStudentIds.value.length > 0)

// Computed untuk status "Pilih Semua" di tingkat parent (untuk tombol "Pilih Semua")
// Mengambil semua ID siswa dari halaman saat ini
const allCurrentPageStudentIds = computed(() =>
  students.value.map((s) => s.id).filter((id) => id != null),
)

// Memeriksa apakah semua siswa di halaman saat ini sudah terpilih
const allCurrentPageSelected = computed(() => {
  if (allCurrentPageStudentIds.value.length === 0) return false
  return allCurrentPageStudentIds.value.every((id) => selectedStudentIds.value.includes(id))
})

// --- NEW STATE: Untuk Import ---
const showImportModal = ref(false);
const fileToImport = ref<File | null>(null);
const isImporting = ref(false);
const importValidationErrors = ref<ImportValidationError[]>([]);

// --- Table Headers Configuration ---
const tableHeaders = [
  { key: 'name', label: t('student.name'), sortable: true, filterable: true },
  { key: 'gender', label: t('student.gender'), sortable: true, filterable: true },
  { key: 'nisn', label: t('student.nisn'), sortable: true, filterable: true },
  { key: 'nis', label: t('student.nis'), sortable: true, filterable: true },
]

// --- API Fetching Logic ---
const loadStudents = async (page: number = 1) => {
  if (!isAuthenticated()) {
    error.value = t('common.you_must_login')
    students.value = []
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

    const response = await fetchStudents(page, itemsPerPage.value, appliedFilters.value, sortParam)

    if (response && response.data) {
      students.value = response.data
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
    students.value = []
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
    selectedStudentIds.value = []
    loadStudents(currentPage.value)
  }
}

// --- Sorting Logic ---
const handleTableSort = (key: string, direction: 'asc' | 'desc' | '') => {
  currentSortKey.value = key
  sortDirection.value = direction
  currentPage.value = 1
  selectedStudentIds.value = []
  loadStudents(currentPage.value)
}

// --- Pagination Actions ---
const goToPage = async (pageUrl: string | null) => {
  if (pageUrl) {
    const url = new URL(pageUrl)
    const page = parseInt(url.searchParams.get('page') || '1')
    selectedStudentIds.value = []
    await loadStudents(page)
  }
}

// --- CRUD Actions ---
const handleEdit = (studentId: string) => {
  router.push({ name: 'student.edit', params: { id: studentId } })
}

// --- SINGLE DELETE LOGIC ---
const openDeleteConfirmModal = (student: Student) => {
  studentToDeleteId.value = student.id
  studentToDeleteName.value = student.name
  showDeleteConfirmModal.value = true
}

const confirmDelete = async () => {
  if (!studentToDeleteId.value) return

  isDeleting.value = true
  try {
    await deleteStudent(studentToDeleteId.value)
    const totalStudentsAfterDelete = paginationMeta.value
      ? parseInt(paginationMeta.value.total) - 1
      : 0
    const newCurrentPage =
      paginationMeta.value &&
        totalStudentsAfterDelete > 0 &&
        currentPage.value > 1 &&
        students.value.length === 1
        ? currentPage.value - 1
        : currentPage.value
    await loadStudents(newCurrentPage) // Diubah ke loadStudents
    toast.success(t('student.deleted_success'))
    selectedStudentIds.value = selectedStudentIds.value.filter(
      (id) => id !== studentToDeleteId.value,
    )
  } catch (err: any) {
    if (err.response && err.response.status === 403) {
      Swal.fire(t('common.error'), t('student.permission_to_delete'), 'error');
    } else {
      Swal.fire(t('common.error'), err.response?.data?.message || t('common.api_failed'), 'error');
    }
  } finally {
    isDeleting.value = false
    showDeleteConfirmModal.value = false
    studentToDeleteId.value = null
    studentToDeleteName.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirmModal.value = false
  studentToDeleteId.value = null
  studentToDeleteName.value = null
}

// --- NEW: BULK DELETE LOGIC ---
// Handler untuk update selectedStudentIds dari TableComponent
const handleSelectedItemsChange = (selectedIds: string[]) => {
  selectedStudentIds.value = selectedIds
}

const selectAllStudents = () => {
  const newSelectedIds = [
    ...new Set([...selectedStudentIds.value, ...allCurrentPageStudentIds.value]),
  ]
  selectedStudentIds.value = newSelectedIds
}

const deselectAllStudents = () => {
  const newSelectedIds = selectedStudentIds.value.filter(
    (id) => !allCurrentPageStudentIds.value.includes(id),
  )
  selectedStudentIds.value = newSelectedIds
}

const openBulkDeleteConfirmModal = () => {
  showBulkDeleteConfirmModal.value = true
}

const confirmBulkDelete = async () => {
  if (selectedStudentIds.value.length === 0) return

  isBulkDeleting.value = true
  try {
    const idsToDelete = [...selectedStudentIds.value]
    await deleteMultipleStudents(idsToDelete)

    let totalStudentsAfterDelete = paginationMeta.value
      ? parseInt(paginationMeta.value.total) - idsToDelete.length
      : 0
    let newCurrentPage = currentPage.value

    const currentStudentsOnPage = students.value.filter((s) => idsToDelete.includes(s.id)).length
    if (currentStudentsOnPage === students.value.length && newCurrentPage > 1) {
      newCurrentPage--
    } else if (totalStudentsAfterDelete === 0 && newCurrentPage > 1) {
      newCurrentPage = 1
    }

    selectedStudentIds.value = []
    await loadStudents(newCurrentPage) // Diubah ke loadStudents
    toast.success(t('student.bulk_delete_success'))
  } catch (err: any) {
    if (err.response && err.response.status === 403) {
      Swal.fire(t('common.error'), t('student.permission_to_delete'), 'error');
    } else {
      Swal.fire(t('common.error'), err.response?.data?.message || t('student.bulk_delete_failed'), 'error');
    }
  } finally {
    isBulkDeleting.value = false
    showBulkDeleteConfirmModal.value = false
  }
}

const cancelBulkDelete = () => {
  showBulkDeleteConfirmModal.value = false
}

const handleCreateStudent = () => {
  router.push({ name: 'student.create' })
}

// --- FUNGSI BARU: Export Students ---
const handleExportStudents = async () => {
  try {
    Swal.fire({
      title: t('common.exporting_data'),
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const blob = await exportStudents(); // Diubah ke exportStudents

    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    Swal.close();
    Swal.fire(t('common.success'), t('student.export_success'), 'success');
  } catch (error) {
    Swal.close();
    let errorMessage = t('student.export_failed');
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result as string);
          errorMessage = errorObj.message || errorMessage;
        } catch (e) {
          errorMessage = t('student.export_failed') + ': ' + reader.result;
        }
      };
      reader.readAsText(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    Swal.fire(t('common.error'), errorMessage, 'error');
  }
};

// --- NEW: IMPORT LOGIC ---
const openImportModal = () => {
  showImportModal.value = true;
  fileToImport.value = null;
  importValidationErrors.value = [];
  isImporting.value = false;
  const fileInput = document.getElementById('importFileInput') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
};

const cancelImport = () => {
  showImportModal.value = false;
  fileToImport.value = null;
  importValidationErrors.value = [];
  const fileInput = document.getElementById('importFileInput') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileToImport.value = target.files[0];
    importValidationErrors.value = [];
  } else {
    fileToImport.value = null;
  }
};

const handleDownloadTemplate = async () => {
  try {
    Swal.fire({
      title: t('common.downloading_template'),
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const blob = await downloadStudentTemplate(); // Diubah ke downloadStudentTemplate

    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    Swal.close();
    Swal.fire(t('common.success'), t('student.template_download_success'), 'success');
  } catch (error: any) {
    Swal.close();
    let errorMessage = t('student.template_download_failed');
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result as string);
          errorMessage = errorObj.message || errorMessage;
        } catch (e) {
          errorMessage = t('student.template_download_failed') + ': ' + reader.result;
        }
      };
      reader.readAsText(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    Swal.fire(t('common.error'), errorMessage, 'error');
  }
};

const handleSubmitImport = async () => {
  if (!fileToImport.value) {
    Swal.fire(t('common.warning'), t('student.select_file_first'), 'warning');
    return;
  }

  isImporting.value = true;
  importValidationErrors.value = [];

  try {
    Swal.fire({
      title: t('common.importing_data'),
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const response = await importStudents(fileToImport.value);

    Swal.close();
    // Check if response has 'data_count' or 'imported_count'
    const importedCount = response.data_count || response.imported_count || 0;
    Swal.fire(
      t('common.success'),
      t('student.import_success', { count: importedCount }),
      'success'
    );
    cancelImport();
    loadStudents(); // Diubah ke loadStudents
  } catch (error: any) {
    Swal.close();
    isImporting.value = false;

    let errorMessage = t('student.import_failed_general');

    // Handle specific validation errors from backend (e.g., from StudentTemplateValidation or StudentImport)
    if (error.response && error.response.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      // If there are detailed errors (e.g., from StudentImport's validation failures)
      if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
        importValidationErrors.value = error.response.data.errors;
        errorMessage = error.response.data.message || t('student.import_validation_errors');

        let errorDetailsHtml = `<p>${errorMessage}</p><ul class="text-left mt-2 space-y-1 text-sm">`;
        importValidationErrors.value.forEach((err: ImportValidationError) => {
          errorDetailsHtml += `<li><strong>${t('common.row')} ${err.row}:</strong> ${err.errors.join(', ')}</li>`;
        });
        errorDetailsHtml += '</ul>';

        Swal.fire({
          title: t('common.error'), // Tetap common
          html: errorDetailsHtml,
          icon: 'error',
          confirmButtonText: t('common.ok'),
          width: '600px' // Adjust width for better readability if many errors
        });
        return; // Exit here if detailed errors are handled
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    Swal.fire(t('common.error'), errorMessage, 'error'); // Tetap common
  } finally {
    isImporting.value = false;
  }
};

const handleGenerateLink = async (studentId: string) => {
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

    const response = await generateStudentLinkToken(studentId)
    generatedLink.value = response.linking_url

    Swal.close()
    showLinkModal.value = true // Tampilkan modal dengan link
    toast.success(t('student.link_generated_success')) // Tambahkan ini ke locale
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
  selectedStudentIds.value = []
  loadStudents(currentPage.value) // Diubah ke loadStudents
})

// --- Lifecycle Hook ---
onMounted(() => {
  loadStudents() // Diubah ke loadStudents

  window.Echo.channel('students')
    .listen('.student.created', (e) => {
      loadStudents(currentPage.value) // Diubah ke loadStudents
      // toast.success(t('student.created_success_toast', { name: e.student.name }))
    })
    .listen('.student.updated', (e) => {
      const index = students.value.findIndex((s) => s.id === e.student.id)
      if (index !== -1) {
        students.value[index] = e.student
      }
      // toast.success(t('student.updated_success_toast', { name: e.student.name }))
    })
    .listen('.student.deleted', (e) => {
      students.value = students.value.filter((s) => s.id !== e.student_id)
      // toast.success(t('student.deleted_success_toast'))
      loadStudents(currentPage.value) // Diubah ke loadStudents
    })
})

onBeforeUnmount(() => {
  window.Echo.leaveChannel('students')
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">{{ t('student.management') }}</h1>

      <div v-if="error"
        class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        role="alert">
        <strong class="font-bold">{{ t('common.error') }}!</strong>
        <span class="block sm:inline ml-2">{{ error }}</span>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <!-- Left Container: Per Page and Bulk Delete Button -->
        <div
          class="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto justify-start">
          <!-- "Per Page" Dropdown -->
          <div class="flex items-center space-x-2">
            <label for="perPageSelect" class="text-sm font-medium text-gray-700">{{ t('common.show') }}:</label>
            <select id="perPageSelect" v-model.number="itemsPerPage"
              class="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
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
            <ButtonComponent v-if="authStore.can('delete-student')" variant="danger" size="sm"
              @click="openBulkDeleteConfirmModal" :loading="isBulkDeleting">
              {{ t('common.bulk_delete') }} ({{ selectedStudentIds.length }})
            </ButtonComponent>
          </div>
        </div>

        <!-- Right Container: Create Student Button -->
        <div class="flex items-center w-full sm:w-auto justify-end space-x-2">
          <!-- Import Data Button -->
          <ButtonComponent variant="info" size="md" @click="openImportModal">
            {{ t('student.import_data') }}
          </ButtonComponent>

          <!-- Export Data Button -->
          <ButtonComponent variant="success" size="md" @click="handleExportStudents">
            {{ t('student.export_data') }}
          </ButtonComponent>

          <!-- Create Student Button -->
          <ButtonComponent v-if="authStore.can('create-student')" variant="primary" size="md"
            @click="handleCreateStudent">
            {{ t('common.create') }}
          </ButtonComponent>
        </div>
      </div>

      <TableComponent :headers="tableHeaders" :items="students" :is-loading="isLoading" :items-per-page="itemsPerPage"
        :empty-message="t('common.no_data')" v-model:modelValueFilters="columnFilters"
        :current-sort-key="currentSortKey" :sort-direction="sortDirection" @sort="handleTableSort"
        @apply-filters="handleApplyFilters" :selectedItems="selectedStudentIds"
        @update:selectedItems="handleSelectedItemsChange">
        <template #actionsHeader>{{ t('common.actions') }}</template>

        <template #cell-gender="{ value }">
          <span :class="{
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full': true,
            'bg-blue-100 text-blue-800': value === 'L',
            'bg-pink-100 text-pink-800': value === 'P',
          }">
            {{ value === 'L' ? t('common.male') : t('common.female') }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end space-x-2">
            <ButtonGroupComponent>
              <ButtonComponent v-if="authStore.can('update-student')" variant="warning" @click="handleEdit(item.id)">
                {{ t('common.edit') }}
              </ButtonComponent>
              <ButtonComponent v-if="authStore.can('delete-student')" variant="danger"
                @click="openDeleteConfirmModal(item as Student)">{{ t('common.delete') }}
              </ButtonComponent>
              <ButtonComponent
                variant="info"
                @click="handleGenerateLink(item.id)"
                v-if="item.user == null"
              >
                Generate Link
              </ButtonComponent>
            </ButtonGroupComponent>
          </div>
        </template>
      </TableComponent>

      <div class="mt-8 justify-between items-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>

      <!-- Single Delete Confirmation Modal -->
      <ModalComponent v-model="showDeleteConfirmModal" :title="t('common.confirm')" type="danger" max-width="sm"
        :show-close-button="true" :backdrop-dismiss="true" @close="cancelDelete">
        <p>
          <i18n-t keypath="student.delete_confirmation_single" tag="span">
            <template v-slot:name>
              <span class="font-semibold text-red-700">{{ studentToDeleteName }}</span>
            </template>
          </i18n-t>
        </p>
        <template #actions>
          <ButtonComponent variant="secondary" size="sm" @click="cancelDelete" :disabled="isDeleting">
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent variant="danger" size="sm" @click="confirmDelete" :loading="isDeleting">
            {{ t('common.delete') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Bulk Delete Confirmation Modal -->
      <ModalComponent v-model="showBulkDeleteConfirmModal" :title="t('common.confirm')" type="danger" max-width="sm"
        :show-close-button="!isBulkDeleting" :backdrop-dismiss="!isBulkDeleting" @close="cancelBulkDelete">
        <p>
          <i18n-t keypath="student.delete_confirmation_bulk" tag="span">
            <template v-slot:count>
              <span class="font-semibold text-red-700">{{ selectedStudentIds.length }}</span>
            </template>
          </i18n-t>
        </p>
        <template #actions>
          <ButtonComponent variant="secondary" size="sm" @click="cancelBulkDelete" :disabled="isBulkDeleting">
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent variant="danger" size="sm" @click="confirmBulkDelete" :loading="isBulkDeleting">
            {{ t('common.delete') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Modal Import Data Student -->
      <ModalComponent v-model="showImportModal" :title="t('student.import_title')" type="info" max-width="md"
        :show-close-button="!isImporting" :backdrop-dismiss="!isImporting" @close="cancelImport">
        <p class="mb-4">{{ t('student.import_description') }}</p>

        <div class="mb-4">
          <label for="importFileInput" class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('student.choose_excel_file') }}
          </label>
          <input type="file" id="importFileInput" @change="handleFileChange" accept=".xls,.xlsx" class="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-700
                   hover:file:bg-indigo-100" :disabled="isImporting" />
          <p v-if="fileToImport" class="mt-2 text-sm text-gray-600">
            {{ t('student.selected_file') }}: <span class="font-medium">{{ fileToImport.name }}</span>
          </p>
        </div>
        <template #actions>
          <ButtonComponent variant="secondary" size="sm" @click="cancelImport" :disabled="isImporting">
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent variant="primary" size="sm" @click="handleDownloadTemplate" :disabled="isImporting">
            {{ t('student.download_template') }}
          </ButtonComponent>
          <ButtonComponent variant="success" size="sm" @click="handleSubmitImport" :loading="isImporting">
            {{ t('common.submit_excel') }}
          </ButtonComponent>
        </template>
      </ModalComponent>

      <!-- Modal untuk menampilkan link yang dihasilkan -->
      <ModalComponent
        v-model="showLinkModal"
        :title="t('teacher.generated_link_title')"
        type="info"
        max-width="md"
      >
        <p class="mb-4">{{ t('teacher.generated_link_description') }}</p>
        <div class="flex items-center space-x-2 bg-gray-100 p-3 rounded-md break-all text-gray-800">
          <strong class="flex-grow">{{ generatedLink }}</strong>
          <button
            @click="copyToClipboard"
            class="p-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Salin Link"
          >
            <svg
              class="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              ></path>
            </svg>
          </button>
        </div>
        <p v-if="linkExpiresAt" class="mt-2 text-sm text-gray-600">
          {{ t('teacher.link_expires_info', { time: new Date(linkExpiresAt).toLocaleString() }) }}
        </p>
        <template #actions>
          <ButtonComponent variant="primary" @click="showLinkModal = false">{{
            t('common.close')
          }}</ButtonComponent>
        </template>
      </ModalComponent>
    </div>
  </AdminLayout>
</template>
