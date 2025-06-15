<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue' // Tambahkan 'computed' di sini
import {
  fetchTeachers,
  deleteTeacher,
  deleteMultipleTeachers, // <--- Import fungsi baru ini
  exportTeachers, // <--- Import fungsi exportTeachers
  importTeachers, // <--- Import fungsi importTeachers (akan digunakan nanti)
  downloadTeacherTemplate, // <--- Download Import downloadTeacherTemplate
  type Teacher,
  type PaginationMeta,
  type PaginationLinks,
  type ImportErrorResponse, // <--- Import ImportErrorResponse
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

// Impor useI18n
import { useI18n } from 'vue-i18n'

// Inject SweetAlert2 yang di-provide dari main.ts
const Swal = inject('Swal');

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

// Computed untuk mengontrol apakah tombol bulk delete aktif
const canBulkDelete = computed(() => selectedTeacherIds.value.length > 0)

// --- NEW STATE: Untuk Import ---
const showImportModal = ref(false);
const fileToImport = ref<File | null>(null);
const isImporting = ref(false);
const importValidationErrors = ref<ImportValidationError[]>([]);

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

// --- Table Headers Configuration ---
// Definisikan konfigurasi header tabel di sini
const tableHeaders = [
  { key: 'name', label: t('teacher.name'), sortable: true, filterable: true },
  { key: 'gender', label: t('teacher.gender'), sortable: true, filterable: true },
  // { key: 'subject_count', label: t('teacher.subject_count'), sortable: false, filterable: false },
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
      teachers.value = response.data
      paginationMeta.value = response.meta
      paginationLinks.value = response.links
      currentPage.value = parseInt(response.meta.current_page || '1')
      // Penting: Setelah memuat data baru, selectedTeacherIds akan secara otomatis disinkronkan oleh TableComponent.
      // Tidak perlu membersihkan di sini kecuali ada kebutuhan khusus untuk seleksi lintas halaman.
    } else {
      throw new Error(t('common.api_not_valid'))
    }
  } catch (err: any) {
    // console.error('Error loading teachers:', err)
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
    currentPage.value = 1 // Reset halaman ke 1 saat filter baru diterapkan
    selectedTeacherIds.value = [] // <--- NEW: Hapus seleksi saat filter berubah
    loadTeachers(currentPage.value)
  }
}

// --- Sorting Logic ---
const handleTableSort = (key: string, direction: 'asc' | 'desc' | '') => {
  currentSortKey.value = key
  sortDirection.value = direction
  currentPage.value = 1 // Reset halaman ke 1 saat sorting baru
  selectedTeacherIds.value = [] // <--- NEW: Hapus seleksi saat sorting berubah
  loadTeachers(currentPage.value)
}

// --- Pagination Actions ---
const goToPage = async (pageUrl: string | null) => {
  if (pageUrl) {
    const url = new URL(pageUrl)
    const page = parseInt(url.searchParams.get('page') || '1')
    selectedTeacherIds.value = [] // <--- NEW: Hapus seleksi saat halaman berubah
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
    // alert('Guru berhasil dihapus!')
    // Setelah single delete, hapus ID tersebut dari selectedTeacherIds jika ada
    selectedTeacherIds.value = selectedTeacherIds.value.filter(
      (id) => id !== teacherToDeleteId.value,
    ) // <--- NEW
  } catch (err: any) {
    // console.error('Error deleting teacher:', err)
    if (err.response && err.response.status === 403) {
      alert(t('teacher.permission_to_delete'))
    } else {
      alert(err.response?.data?.message || t('common.api_failed'))
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
  // Tambahkan semua ID guru dari halaman saat ini ke selectedTeacherIds
  const newSelectedIds = [
    ...new Set([...selectedTeacherIds.value, ...allCurrentPageTeacherIds.value]),
  ]
  selectedTeacherIds.value = newSelectedIds
}

const deselectAllTeachers = () => {
  // Hapus semua ID guru dari halaman saat ini dari selectedTeacherIds
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
    // Kloning array untuk menghindari masalah jika array berubah saat request
    const idsToDelete = [...selectedTeacherIds.value]
    await deleteMultipleTeachers(idsToDelete)

    // Perbarui total data dan halaman setelah penghapusan
    let totalTeachersAfterDelete = paginationMeta.value
      ? parseInt(paginationMeta.value.total) - idsToDelete.length
      : 0
    let newCurrentPage = currentPage.value

    // Jika semua item di halaman saat ini dihapus, pindah ke halaman sebelumnya jika ada
    const currentTeachersOnPage = teachers.value.filter((t) => idsToDelete.includes(t.id)).length
    if (currentTeachersOnPage === teachers.value.length && newCurrentPage > 1) {
      newCurrentPage--
    } else if (totalTeachersAfterDelete === 0 && newCurrentPage > 1) {
      newCurrentPage = 1 // Kembali ke halaman 1 jika tidak ada data sama sekali
    }

    // Kosongkan selection setelah penghapusan berhasil
    selectedTeacherIds.value = []
    await loadTeachers(newCurrentPage) // Muat ulang data
    toast.success(t('teacher.deleted_success'))
    // alert(`${idsToDelete.length} guru berhasil dihapus!`)
  } catch (err: any) {
    // console.error('Error bulk deleting teachers:', err)
    if (err.response && err.response.status === 403) {
      alert(t('teacher.permission_to_delete'))
    } else {
      alert(err.response?.data?.message || t('teacher.permission_to_delete'))
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
      title: t('common.exporting_data'), // Gunakan i18n
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const blob = await exportTeachers(); // Panggil fungsi exportTeachers dari service

    // Buat URL objek dari blob
    const url = window.URL.createObjectURL(new Blob([blob]));
    // Buat link download tersembunyi
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'teachers.xlsx'); // Nama file yang akan di-download
    document.body.appendChild(link);
    link.click(); // Klik link secara programatis untuk memicu download
    document.body.removeChild(link); // Hapus link
    window.URL.revokeObjectURL(url); // Bersihkan URL objek

    Swal.close();
    Swal.fire(t('common.success'), t('teacher.export_success'), 'success'); // Gunakan i18n
  } catch (error) {
    Swal.close();
    // console.error('Error exporting teachers:', error);
    let errorMessage = t('teacher.export_failed'); // Pesan default dengan i18n
    // Jika backend mengirim pesan error dalam bentuk JSON blob, coba parse
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result);
          errorMessage = errorObj.message || errorMessage;
        } catch (e) {
          // Jika bukan JSON, gunakan teks mentah
          errorMessage = t('teacher.export_failed') + ': ' + reader.result;
        }
      };
      reader.readAsText(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    Swal.fire('Error!', errorMessage, 'error');
  }
};

// --- NEW: IMPORT LOGIC ---
const openImportModal = () => {
  showImportModal.value = true;
  fileToImport.value = null; // Reset selected file when opening modal
  importValidationErrors.value = []; // Clear previous errors
  isImporting.value = false; // <--- TAMBAHKAN INI UNTUK MEMASTIKAN DIRESET
  // Optional: clear file input visually if needed
  const fileInput = document.getElementById('importFile') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
};

const cancelImport = () => {
  showImportModal.value = false;
  fileToImport.value = null;
  importValidationErrors.value = [];
  const fileInput = document.getElementById('importFile') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileToImport.value = target.files[0];
    importValidationErrors.value = []; // Clear errors when new file selected
    // console.log('File selected:', fileToImport.value); // <--- TAMBAHKAN INI
    // console.log('Is fileToImport.value null?', !fileToImport.value); // <--- TAMBAHKAN INI
  } else {
    fileToImport.value = null;
    // console.log('No file selected.'); // <--- TAMBAHKAN INI
  }
};

const handleDownloadTemplate = async () => {
  try {
    Swal.fire({
      title: t('common.downloading_template'), // "Mengunduh template..."
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const blob = await downloadTeacherTemplate(); // Panggil fungsi dari service

    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'teacher_import_template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    Swal.close();
    Swal.fire(t('common.success'), t('teacher.template_download_success'), 'success');
  } catch (error: any) {
    Swal.close();
    // console.error('Error downloading template:', error);
    let errorMessage = t('teacher.template_download_failed');
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const errorObj = JSON.parse(reader.result as string);
          errorMessage = errorObj.message || errorMessage;
        } catch (e) {
          errorMessage = t('teacher.template_download_failed') + ': ' + reader.result;
        }
      };
      reader.readAsText(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    Swal.fire('Error!', errorMessage, 'error');
  }
};

const handleSubmitImport = async () => {
  if (!fileToImport.value) {
    Swal.fire(t('common.warning'), t('teacher.select_file_first'), 'warning');
    return;
  }

  isImporting.value = true;
  importValidationErrors.value = []; // Clear previous errors

  try {
    Swal.fire({
      title: t('common.importing_data'), // "Mengimpor data..."
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const response = await importTeachers(fileToImport.value);

    Swal.close();
    Swal.fire(t('common.success'), response.message || t('teacher.import_success'), 'success');
    cancelImport(); // Tutup modal dan reset
    loadTeachers(); // Muat ulang data setelah import
  } catch (error: any) {
    Swal.close();
    isImporting.value = false;
    // console.error('Error importing teachers:', error);

    let errorMessage = t('teacher.import_failed');
    if (error && error.message) { // Ini untuk error umum dari service
      errorMessage = error.message;
    }

    // Tangani error validasi spesifik dari service (objek ImportErrorResponse)
    if (error && error.errors && Array.isArray(error.errors)) {
      importValidationErrors.value = error.errors;
      errorMessage = error.message || t('teacher.import_failed_validation');

      let errorDetailsHtml = '<ul class="text-left">';
      error.errors.forEach((err: ImportErrorResponse['errors'][0]) => {
        errorDetailsHtml += `<li><strong>${t('common.row')} ${err.row}:</strong> ${err.errors.join(', ')}</li>`;
      });
      errorDetailsHtml += '</ul>';

      Swal.fire({
        title: t('common.import_failed'), // "Impor Gagal!"
        html: `${errorMessage}<br><br>${errorDetailsHtml}`,
        icon: 'error',
        confirmButtonText: t('common.ok'),
      });
    } else {
      Swal.fire('Error!', errorMessage, 'error');
    }
  } finally {
    isImporting.value = false;
  }
};

// --- Watcher untuk itemsPerPage ---
watch(itemsPerPage, () => {
  currentPage.value = 1
  selectedTeacherIds.value = [] // <--- NEW: Hapus seleksi saat items per halaman berubah
  loadTeachers(currentPage.value)
})

// --- Lifecycle Hook ---
onMounted(() => {
  loadTeachers()

  // Dengarkan event dari channel 'teachers'
  window.Echo.channel('teachers')
    .listen('.teacher.added', (e) => {
      // console.log('Guru baru ditambahkan via WebSocket:', e.teacher)
      // --- PERUBAHAN DI SINI ---
      // Daripada menambahkan langsung, panggil loadTeachers untuk me-refresh tabel
      // Ini akan memastikan paginasi, pencarian, dan filter tetap konsisten.
      // Anda bisa memilih loadTeachers(1) untuk selalu kembali ke halaman pertama
      // atau loadTeachers(currentPage.value) untuk mencoba tetap di halaman yang sama.
      loadTeachers(currentPage.value) // Pilihan yang lebih umum
      // loadTeachers(1); // Jika Anda ingin item baru selalu muncul di halaman pertama
      toast.success(`Guru ${e.teacher.name} telah ditambahkan!`)
    })
    .listen('.teacher.updated', (e) => {
      // ... kode yang sudah ada untuk update (tetap bagus untuk update item di halaman yang sama) ...
      // console.log('Guru diperbarui via WebSocket:', e.teacher)
      const index = teachers.value.findIndex((t) => t.id === e.teacher.id)
      if (index !== -1) {
        teachers.value[index] = e.teacher
      }
      toast.success(`Guru ${e.teacher.name} telah diperbarui!`)
    })
    .listen('.teacher.deleted', (e) => {
      // ... kode yang sudah ada untuk delete (sudah memanggil loadTeachers) ...
      // console.log('Guru dihapus via WebSocket:', e.teacher_id)
      teachers.value = teachers.value.filter((t) => t.id !== e.teacher_id)
      toast.success(`Guru telah dihapus!`)
      loadTeachers(currentPage.value) // Pastikan ini juga ada
    })
})

onBeforeUnmount(() => {
  // Penting: Tinggalkan channel saat komponen dihancurkan
  window.Echo.leaveChannel('teachers')
  // window.Echo.leaveChannel(`users.${userId}`); // Untuk private channel
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">{{ t('teacher.management') }}</h1>

      <div v-if="error"
        class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
        role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline ml-2">{{ error }}</span>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <!-- Kontainer Kiri: Per Page dan Tombol Hapus Massal -->
        <div
          class="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto justify-start">
          <!-- Dropdown "Per Page" -->
          <div class="flex items-center space-x-2">
            <label for="perPageSelect" class="text-sm font-medium text-gray-700">Tampilkan:</label>
            <select id="perPageSelect" v-model.number="itemsPerPage"
              class="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span class="text-sm text-gray-700">data per halaman</span>
          </div>

          <!-- Tombol Hapus Massal - hanya tampil jika ada item yang dipilih dan punya izin -->
          <div v-if="canBulkDelete" class="flex items-center space-x-2">
            <ButtonComponent v-if="authStore.can('delete-teacher')" variant="danger" size="sm"
              @click="openBulkDeleteConfirmModal" :loading="isBulkDeleting">
              {{ t('common.bulk_delete') }} ({{ selectedTeacherIds.length }})
            </ButtonComponent>
          </div>
        </div>

        <!-- Kontainer Kanan: Tombol Buat Guru -->
        <div class="flex items-center w-full sm:w-auto justify-end space-x-2">
          <!-- Tombol Import Data -->
          <ButtonComponent 
            variant="info"
            size="md"
            @click="openImportModal"
            >
            {{ t('common.import_data') }}
          </ButtonComponent>

          <!-- Tombol Export Data -->
          <ButtonComponent variant="success" size="md" @click="handleExportTeachers">
            <i class="fas fa-file-excel mr-2"></i> Export Data
          </ButtonComponent>

          <!-- Tombol Buat Guru -->
          <ButtonComponent v-if="authStore.can('create-teacher')" variant="primary" size="md"
            @click="handleCreateTeacher">
            {{ t('common.create') }}
          </ButtonComponent>
        </div>
      </div>

      <TableComponent :headers="tableHeaders" :items="teachers" :is-loading="isLoading" :items-per-page="itemsPerPage"
        :empty-message="t('teacher.not_found')" v-model:modelValueFilters="columnFilters"
        :current-sort-key="currentSortKey" :sort-direction="sortDirection" @sort="handleTableSort"
        @apply-filters="handleApplyFilters" :selectedItems="selectedTeacherIds"
        @update:selectedItems="handleSelectedItemsChange">
        <template #actionsHeader>{{ t('common.actions') }}</template>

        <template #cell-gender="{ value }">
          <span :class="{
            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full': true,
            'bg-blue-100 text-blue-800': value === t('common.male'),
            'bg-pink-100 text-pink-800': value === t('common.female'),
          }">
            {{ value }}
          </span>
        </template>

        <!-- <template #cell-subject_count="{ item }">
          <span v-if="(item as Teacher).subject_count">
            {{ parseInt((item as Teacher).subject_count) }} Mapel
          </span>
          <span v-else class="text-gray-500 italic"> 0 Mapel </span>
        </template> -->

        <template #actions="{ item }">
          <div class="flex justify-end space-x-2">
            <ButtonGroupComponent>
              <ButtonComponent v-if="authStore.can('update-teacher')" variant="warning" @click="handleEdit(item.id)">{{
                t('common.edit') }}</ButtonComponent>
              <ButtonComponent v-if="authStore.can('delete-teacher')" variant="danger"
                @click="openDeleteConfirmModal(item as Teacher)">{{ t('common.delete') }}</ButtonComponent>
            </ButtonGroupComponent>
          </div>
        </template>
      </TableComponent>

      <div class="mt-8 justify-between items-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>
      <ModalComponent v-model="showDeleteConfirmModal" title="Konfirmasi Hapus Data" type="danger" max-width="sm"
        :show-close-button="true" :backdrop-dismiss="true" @close="cancelDelete">
        <p>
          <i18n-t keypath="teacher.delete_confirmation" tag="span">
            <template v-slot:name>
              <span class="font-semibold text-red-700">{{ teacherToDeleteName }}</span>
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

      <ModalComponent v-model="showBulkDeleteConfirmModal" title="Konfirmasi Hapus Data Terpilih" type="danger"
        max-width="sm" :show-close-button="!isBulkDeleting" :backdrop-dismiss="!isBulkDeleting"
        @close="cancelBulkDelete">
        <p>
          <i18n-t keypath="teacher.delete_bulk_confirmation" tag="span">
            <template v-slot:count>
              <span class="font-semibold text-red-700">{{ selectedTeacherIds.length }}</span>
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
            class="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-700
                   hover:file:bg-indigo-100"
            :disabled="isImporting"
          />
          <p v-if="fileToImport" class="mt-2 text-sm text-gray-600">
            {{ t('teacher.selected_file') }}: <span class="font-medium">{{ fileToImport.name }}</span>
          </p>
        </div>

        <div v-if="importValidationErrors.length > 0" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p class="font-bold mb-2">{{ t('teacher.validation_errors') }}:</p>
            <ul class="list-disc list-inside text-sm">
                <li v-for="(err, index) in importValidationErrors" :key="index">
                    {{ t('common.row') }} {{ err.row }}:
                    <span v-for="(msg, msgIdx) in err.errors" :key="msgIdx">{{ msg }}<span v-if="msgIdx < err.errors.length - 1">, </span></span>
                </li>
            </ul>
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
            {{ t('common.download_template') }}
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
    </div>
  </AdminLayout>
</template>
