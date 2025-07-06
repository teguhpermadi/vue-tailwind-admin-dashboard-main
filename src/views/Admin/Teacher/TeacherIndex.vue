<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue'
import {
  fetchTeachers,
  deleteTeacher,
  deleteMultipleTeachers,
  exportTeachers,
  importTeachers,
  downloadTeacherTemplate,
  generateTeacherLinkToken,
  type Teacher,
  type PaginationMeta,
  type PaginationLinks,
  type ImportErrorResponse,
  type ImportValidationError,
  type ActiveLinkToken,
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

// --- NEW STATE: Untuk Generate Link dan Countdown (Global untuk modal) ---
const showLinkModal = ref(false);
const generatedLink = ref<string | null>(null);
const linkExpiresAt = ref<string | null>(null);
const countdownTextModal = ref<string>(''); // Teks countdown khusus untuk modal
const modalCountdownInterval = ref<number | null>(null); // Interval khusus untuk modal
const isGeneratingLink = ref(false); // State loading untuk tombol generate link

// --- NEW STATE: Untuk Countdown per Tombol (Map) ---
// Map untuk menyimpan teks countdown dan interval ID untuk setiap guru
const teacherCountdownStates = ref<Map<string, { countdownText: string; intervalId: number | null; }>>(new Map());

// --- Table Headers Configuration ---
const tableHeaders = [
  { key: 'name', label: t('teacher.name'), sortable: true, filterable: true },
  { key: 'gender', label: t('teacher.gender'), sortable: true, filterable: true },
  { key: 'user_linked', label: t('teacher.user_linked'), sortable: false, filterable: false },
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

      // Hentikan semua interval lama sebelum menginisialisasi ulang
      teacherCountdownStates.value.forEach(state => {
        if (state.intervalId) clearInterval(state.intervalId);
      });
      teacherCountdownStates.value.clear(); // Bersihkan map

      // Inisialisasi status countdown untuk setiap guru
      teachers.value.forEach(teacher => {
        if (teacher.is_linked_to_user) {
          // Jika sudah tertaut, tidak perlu countdown, tombol disembunyikan oleh v-if
          teacherCountdownStates.value.set(teacher.id, { countdownText: '', intervalId: null });
        } else if (teacher.active_link_token && new Date(teacher.active_link_token.expires_at).getTime() > Date.now()) {
          // Jika ada token aktif dan belum kadaluarsa, mulai countdown untuk guru ini
          startCountdownForTeacherButton(teacher.id, teacher.active_link_token.expires_at);
        } else {
          // Jika tidak ada token aktif atau sudah kadaluarsa
          teacherCountdownStates.value.set(teacher.id, { countdownText: t('teacher.generate_link'), intervalId: null });
        }
      });

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

// --- Handle Generate Link ---
const handleGenerateLink = async (teacher: Teacher) => {
  // 4. Jika data teacher sudah memiliki is_linked_to_user maka sembunyikan tombol generate link
  // (Ini sudah ditangani oleh v-if di template, tapi baik untuk validasi tambahan)
  if (teacher.is_linked_to_user) {
    toast.info(t('teacher.already_linked')); // Pesan info baru
    return;
  }

  // 2. Jika data teacher sudah memiliki active_link_token maka ketika tombol countdown di tekan maka menampilkan modal yang berisi link beserta waktu hitung mundurnya.
  const activeToken = teacher.active_link_token;
  if (activeToken && new Date(activeToken.expires_at).getTime() > Date.now()) {
    // Jika ada token aktif, cukup tampilkan modal dengan data yang sudah ada
    generatedLink.value = activeToken.linking_url || (import.meta.env.VITE_FRONTEND_URL + '/profile?token=' + activeToken.token); // Buat URL jika tidak ada
    linkExpiresAt.value = activeToken.expires_at;
    showLinkModal.value = true;
    startModalCountdown(activeToken.expires_at); // Mulai countdown di modal
    return;
  }

  // 3. Jika data teacher tidak memiliki active_link_token maka tampilkan tombol generate link saja
  // (Ini adalah kasus default jika kondisi di atas tidak terpenuhi)
  isGeneratingLink.value = true; // Set loading state for the button
  try {
    Swal.fire({
      title: t('common.loading'),
      text: t('teacher.generating_link_message'),
      didOpen: () => { Swal.showLoading(); },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    // Panggil API generateLinkToken dengan tipe 'teacher'
    const response = await generateTeacherLinkToken('teacher', teacher.id);
    generatedLink.value = response.linking_url;
    linkExpiresAt.value = response.expires_at;
    
    Swal.close();
    showLinkModal.value = true;
    toast.success(t('teacher.link_generated_success'));
    
    // Perbarui objek guru di array teachers secara langsung
    const index = teachers.value.findIndex(t => t.id === teacher.id);
    if (index !== -1) {
      teachers.value[index].active_link_token = {
        token: response.token,
        expires_at: response.expires_at,
        // linking_url: response.linking_url // Simpan juga linking_url jika ada di response
      };
      // Langsung mulai countdown untuk tombol guru ini
      startCountdownForTeacherButton(teacher.id, response.expires_at);
    }
    startModalCountdown(response.expires_at); // Mulai hitung mundur di modal
  } catch (error: any) {
    Swal.close();
    const errorMessage = error.response?.data?.message || t('common.api_failed');
    Swal.fire(t('common.error'), errorMessage, 'error');
    // Reset token state if generation failed
    generatedLink.value = null;
    linkExpiresAt.value = null;
    countdownTextModal.value = '';
    if (modalCountdownInterval.value) clearInterval(modalCountdownInterval.value);
    // Reset countdown state for this specific teacher button
    teacherCountdownStates.value.set(teacher.id, { countdownText: t('teacher.generate_link'), intervalId: null });
  } finally {
    isGeneratingLink.value = false;
  }
};

// NEW: Copy to clipboard functionality
const copyToClipboard = () => {
  if (generatedLink.value) {
    // Membuat elemen textarea sementara untuk menyalin teks
    const textarea = document.createElement('textarea')
    textarea.value = generatedLink.value
    document.body.appendChild(textarea)
    textarea.select()
    try {
      const successful = document.execCommand('copy')
      if (successful) {
        toast.success(t('teacher.link_copied_success')) // New locale key
      } else {
        toast.error(t('teacher.link_copied_failed')) // New locale key
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
      toast.error(t('teacher.link_copied_failed'))
    }
    document.body.removeChild(textarea)
  }
}

// Countdown Logic per Tombol
const startCountdownForTeacherButton = (teacherId: string, expiresAt: string) => {
  const expiryTime = new Date(expiresAt).getTime();
  let state = teacherCountdownStates.value.get(teacherId);

  if (!state) {
    state = { countdownText: '', intervalId: null };
    teacherCountdownStates.value.set(teacherId, state);
  }

  // Hentikan interval lama jika ada
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  state.intervalId = window.setInterval(() => {
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) {
      clearInterval(state!.intervalId!);
      state!.countdownText = t('teacher.link_expired');
      state!.intervalId = null;
      // Opsional: Perbarui objek guru di array teachers agar active_link_token menjadi null
      // Ini akan membuat tombol kembali ke "Generate Link" setelah kadaluarsa
      const index = teachers.value.findIndex(t => t.id === teacherId);
      if (index !== -1) {
        teachers.value[index].active_link_token = null;
      }
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let timeString = '';
    if (hours > 0) timeString += `${hours}j `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}d`;

    state!.countdownText = t('teacher.link_expires_in', { time: timeString.trim() });
  }, 1000);
};

// Countdown Logic untuk Modal (tetap terpisah)
const startModalCountdown = (expiresAt: string) => {
  if (modalCountdownInterval.value) {
    clearInterval(modalCountdownInterval.value);
  }

  const expiryTime = new Date(expiresAt).getTime();

  modalCountdownInterval.value = window.setInterval(() => {
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) {
      clearInterval(modalCountdownInterval.value!);
      countdownTextModal.value = t('teacher.link_expired');
      generatedLink.value = null; // Hapus link saat kadaluarsa
      linkExpiresAt.value = null;
      showLinkModal.value = false; // Tutup modal jika kadaluarsa
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    let timeString = '';
    if (hours > 0) timeString += `${hours}j `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}d`;

    countdownTextModal.value = timeString.trim();
  }, 1000);
};


// Computed property untuk teks tombol Generate Link
const getGenerateButtonText = (teacher: Teacher) => {
  const state = teacherCountdownStates.value.get(teacher.id);
  // Jika sudah tertaut, tidak ada teks (karena tombol disembunyikan)
  if (teacher.is_linked_to_user) {
    return '';
  }
  // Jika ada state countdown untuk guru ini, gunakan itu
  if (state && state.countdownText) {
    return state.countdownText;
  }
  // Default jika tidak ada token aktif atau countdown belum dimulai
  return t('teacher.generate_link');
};

// Computed property untuk status loading tombol Generate Link
const isGenerateButtonLoading = computed(() => isGeneratingLink.value);

// --- Watcher untuk itemsPerPage ---
watch(itemsPerPage, () => {
  currentPage.value = 1
  selectedTeacherIds.value = []
  // Clear all existing countdown intervals for buttons
  teacherCountdownStates.value.forEach(state => {
    if (state.intervalId) clearInterval(state.intervalId);
  });
  teacherCountdownStates.value.clear(); // Clear the map

  // Clear global modal countdown interval
  if (modalCountdownInterval.value) clearInterval(modalCountdownInterval.value);
  generatedLink.value = null;
  linkExpiresAt.value = null;
  countdownTextModal.value = '';

  loadTeachers(currentPage.value)
})

// --- Lifecycle Hook ---
onMounted(() => {
  console.log('TeacherIndex.vue: Component mounted. Attempting to load teachers and listen to Echo channel.');
  loadTeachers(); // Initial load of teachers

  if (window.Echo) {
    console.log('TeacherIndex.vue: Echo instance found. Subscribing to "teachers" and "profiles" channels.');
    
    // Listener untuk event Teacher (created, updated, deleted)
    window.Echo.channel('teachers')
      .listen('.teacher.created', (e) => {
        console.log('TeacherIndex.vue: Echo Event received: teacher.created', e);
        loadTeachers(currentPage.value);
        toast.success(t('teacher.created_success_toast', { name: e.teacher.name }));
      })
      .listen('.teacher.updated', (e) => {
        console.log('TeacherIndex.vue: Echo Event received: teacher.updated', e);
        // Ketika teacher diupdate, kita perlu memuat ulang data untuk memastikan
        // status user_linked dan tombol generate link diperbarui.
        loadTeachers(currentPage.value); // Reload penuh untuk update status tautan
        toast.success(t('teacher.updated_success_toast', { name: e.teacher.name }));
      })
      .listen('.teacher.deleted', (e) => {
        console.log('TeacherIndex.vue: Echo Event received: teacher.deleted', e);
        teachers.value = teachers.value.filter((t) => t.id !== e.teacher_id);
        loadTeachers(currentPage.value);
        toast.success(t('teacher.deleted_success_toast'));
      });

    // Listener untuk event ProfileLinked
    window.Echo.channel('profiles')
      .listen('.profile.linked', (e) => {
        console.log('TeacherIndex.vue: Echo Event received: profile.linked', e);
        if (e.userable_type === 'App\\Models\\Teacher') {
          console.log('TeacherIndex.vue: Linked profile is a Teacher. Reloading teachers table.');
          loadTeachers(currentPage.value); // Muat ulang data guru
          toast.success(t('teacher.profile_linked_success_toast'));
        }
      });
  } else {
    console.warn('TeacherIndex.vue: window.Echo is not defined. Real-time updates will not work.');
  }
})

onBeforeUnmount(() => {
  // Clear all countdown intervals for buttons
  teacherCountdownStates.value.forEach(state => {
    if (state.intervalId) clearInterval(state.intervalId);
  });
  // Clear global modal countdown interval
  if (modalCountdownInterval.value) clearInterval(modalCountdownInterval.value);

  if (window.Echo) {
    window.Echo.leaveChannel('teachers');
    window.Echo.leaveChannel('profiles');
    console.log('TeacherIndex.vue: Leaving teachers and profiles channels.');
  }
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

        <template #cell-user_linked="{ item }">
          <span v-if="item.is_linked_to_user" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            {{ t('teacher.linked') }}
          </span>
          <span v-else class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            {{ t('teacher.not_linked') }}
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
              <ButtonComponent 
                v-if="!item.is_linked_to_user" 
                variant="info" 
                @click="handleGenerateLink(item)"
                :loading="isGeneratingLink && teacherCountdownStates.get(item.id)?.intervalId !== null"
              >
                {{ getGenerateButtonText(item) }}
              </ButtonComponent>
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
