<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue' // Tambahkan 'computed' di sini
import {
  fetchTeachers,
  deleteTeacher,
  deleteMultipleTeachers, // <--- Import fungsi baru ini
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
import ButtonGroupComponent from '@/components/ui/ButtonGroupComponent.vue'

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

// --- State untuk Modal Konfirmasi Hapus Single ---
const showDeleteConfirmModal = ref(false)
const teacherToDeleteId = ref<string | null>(null)
const teacherToDeleteName = ref<string | null>(null) // Untuk menampilkan nama di modal
const isDeleting = ref(false) // Untuk spinner tombol single delete

// --- NEW STATE: Untuk Penghapusan Massal ---
const selectedTeacherIds = ref<string[]>([]); // Array ID guru yang dipilih dari TableComponent
const showBulkDeleteConfirmModal = ref(false);
const isBulkDeleting = ref(false); // Untuk spinner tombol bulk delete

// Computed untuk mengontrol apakah tombol bulk delete aktif
const canBulkDelete = computed(() => selectedTeacherIds.value.length > 0);

// Computed untuk status "Pilih Semua" di tingkat parent (untuk tombol "Pilih Semua")
// Mengambil semua ID guru dari halaman saat ini
const allCurrentPageTeacherIds = computed(() => teachers.value.map(t => t.id).filter(id => id != null));

// Memeriksa apakah semua guru di halaman saat ini sudah terpilih
const allCurrentPageSelected = computed(() => {
  if (allCurrentPageTeacherIds.value.length === 0) return false;
  return allCurrentPageTeacherIds.value.every(id => selectedTeacherIds.value.includes(id));
});


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
    error.value = 'Anda harus login untuk melihat daftar guru.';
    teachers.value = [];
    paginationMeta.value = null;
    paginationLinks.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    let sortParam = '';
    if (currentSortKey.value) {
      sortParam = sortDirection.value === 'desc' ? `-${currentSortKey.value}` : currentSortKey.value;
    }

    const response = await fetchTeachers(page, itemsPerPage.value, appliedFilters.value, sortParam);

    if (response && response.data) {
      teachers.value = response.data;
      paginationMeta.value = response.meta;
      paginationLinks.value = response.links;
      currentPage.value = parseInt(response.meta.current_page || '1');
      // Penting: Setelah memuat data baru, selectedTeacherIds akan secara otomatis disinkronkan oleh TableComponent.
      // Tidak perlu membersihkan di sini kecuali ada kebutuhan khusus untuk seleksi lintas halaman.
    } else {
      throw new Error('Format respons API tidak valid.');
    }
  } catch (err: any) {
    console.error('Error loading teachers:', err);
    if (err.response && err.response.status === 403) {
      error.value = 'Anda tidak memiliki izin untuk melihat daftar guru.';
    } else {
      error.value = err.response?.data?.message || 'Gagal memuat data guru. Silakan coba lagi.';
    }
    teachers.value = [];
    paginationMeta.value = null;
    paginationLinks.value = null;
  } finally {
    isLoading.value = false;
  }
};

// --- Filter Logic ---
const handleApplyFilters = () => {
  const newAppliedFilters: Record<string, string> = {};
  for (const key in columnFilters.value) {
    if (columnFilters.value[key]) {
      newAppliedFilters[key] = columnFilters.value[key];
    }
  }

  const hasFilterChanged = JSON.stringify(newAppliedFilters) !== JSON.stringify(appliedFilters.value);

  if (hasFilterChanged) {
    appliedFilters.value = newAppliedFilters;
    currentPage.value = 1; // Reset halaman ke 1 saat filter baru diterapkan
    selectedTeacherIds.value = []; // <--- NEW: Hapus seleksi saat filter berubah
    loadTeachers(currentPage.value);
  }
};

// --- Sorting Logic ---
const handleTableSort = (key: string, direction: 'asc' | 'desc' | '') => {
  currentSortKey.value = key;
  sortDirection.value = direction;
  currentPage.value = 1; // Reset halaman ke 1 saat sorting baru
  selectedTeacherIds.value = []; // <--- NEW: Hapus seleksi saat sorting berubah
  loadTeachers(currentPage.value);
};

// --- Pagination Actions ---
const goToPage = async (pageUrl: string | null) => {
  if (pageUrl) {
    const url = new URL(pageUrl);
    const page = parseInt(url.searchParams.get('page') || '1');
    selectedTeacherIds.value = []; // <--- NEW: Hapus seleksi saat halaman berubah
    await loadTeachers(page);
  }
};

// --- CRUD Actions ---
const handleEdit = (teacherId: string) => {
  router.push({ name: 'admin.teachers.edit', params: { id: teacherId } });
};

// --- SINGLE DELETE LOGIC ---
const openDeleteConfirmModal = (teacher: Teacher) => {
  teacherToDeleteId.value = teacher.id;
  teacherToDeleteName.value = teacher.name;
  showDeleteConfirmModal.value = true;
};

const confirmDelete = async () => {
  if (!teacherToDeleteId.value) return;

  isDeleting.value = true;
  try {
    await deleteTeacher(teacherToDeleteId.value);
    const totalTeachersAfterDelete = paginationMeta.value ? parseInt(paginationMeta.value.total) - 1 : 0;
    const newCurrentPage = (paginationMeta.value && totalTeachersAfterDelete > 0 && currentPage.value > 1 && teachers.value.length === 1)
      ? currentPage.value - 1
      : currentPage.value;
    await loadTeachers(newCurrentPage);
    alert('Guru berhasil dihapus!');
    // Setelah single delete, hapus ID tersebut dari selectedTeacherIds jika ada
    selectedTeacherIds.value = selectedTeacherIds.value.filter(id => id !== teacherToDeleteId.value); // <--- NEW
  } catch (err: any) {
    console.error('Error deleting teacher:', err);
    if (err.response && err.response.status === 403) {
      alert('Anda tidak memiliki izin untuk menghapus guru.');
    } else {
      alert(err.response?.data?.message || 'Gagal menghapus guru.');
    }
  } finally {
    isDeleting.value = false;
    showDeleteConfirmModal.value = false;
    teacherToDeleteId.value = null;
    teacherToDeleteName.value = null;
  }
};

const cancelDelete = () => {
  showDeleteConfirmModal.value = false;
  teacherToDeleteId.value = null;
  teacherToDeleteName.value = null;
};

// --- NEW: BULK DELETE LOGIC ---
// Handler untuk update selectedTeacherIds dari TableComponent
const handleSelectedItemsChange = (selectedIds: string[]) => {
  selectedTeacherIds.value = selectedIds;
};

const selectAllTeachers = () => {
  // Tambahkan semua ID guru dari halaman saat ini ke selectedTeacherIds
  const newSelectedIds = [...new Set([...selectedTeacherIds.value, ...allCurrentPageTeacherIds.value])];
  selectedTeacherIds.value = newSelectedIds;
};

const deselectAllTeachers = () => {
  // Hapus semua ID guru dari halaman saat ini dari selectedTeacherIds
  const newSelectedIds = selectedTeacherIds.value.filter(id => !allCurrentPageTeacherIds.value.includes(id));
  selectedTeacherIds.value = newSelectedIds;
};

const openBulkDeleteConfirmModal = () => {
  showBulkDeleteConfirmModal.value = true;
};

const confirmBulkDelete = async () => {
  if (selectedTeacherIds.value.length === 0) return;

  isBulkDeleting.value = true;
  try {
    // Kloning array untuk menghindari masalah jika array berubah saat request
    const idsToDelete = [...selectedTeacherIds.value];
    await deleteMultipleTeachers(idsToDelete);

    // Perbarui total data dan halaman setelah penghapusan
    let totalTeachersAfterDelete = paginationMeta.value ? parseInt(paginationMeta.value.total) - idsToDelete.length : 0;
    let newCurrentPage = currentPage.value;

    // Jika semua item di halaman saat ini dihapus, pindah ke halaman sebelumnya jika ada
    const currentTeachersOnPage = teachers.value.filter(t => idsToDelete.includes(t.id)).length;
    if (currentTeachersOnPage === teachers.value.length && newCurrentPage > 1) {
      newCurrentPage--;
    } else if (totalTeachersAfterDelete === 0 && newCurrentPage > 1) {
      newCurrentPage = 1; // Kembali ke halaman 1 jika tidak ada data sama sekali
    }

    // Kosongkan selection setelah penghapusan berhasil
    selectedTeacherIds.value = [];
    await loadTeachers(newCurrentPage); // Muat ulang data
    alert(`${idsToDelete.length} guru berhasil dihapus!`);
  } catch (err: any) {
    console.error('Error bulk deleting teachers:', err);
    if (err.response && err.response.status === 403) {
      alert('Anda tidak memiliki izin untuk menghapus guru.');
    } else {
      alert(err.response?.data?.message || 'Gagal menghapus guru secara massal.');
    }
  } finally {
    isBulkDeleting.value = false;
    showBulkDeleteConfirmModal.value = false;
  }
};

const cancelBulkDelete = () => {
  showBulkDeleteConfirmModal.value = false;
};

// --- NEW: View Subjects (optional, if you want to keep this helper) ---
const handleViewSubjects = (teacher: Teacher) => {
  const subjectNames = teacher.subjects?.map(ts => ts.subject?.name).filter(Boolean).join(', ');
  alert(`Mata pelajaran ${teacher.name}: ${subjectNames || 'Tidak ada'}`);
};


// --- Watcher untuk itemsPerPage ---
watch(itemsPerPage, () => {
  currentPage.value = 1;
  selectedTeacherIds.value = []; // <--- NEW: Hapus seleksi saat items per halaman berubah
  loadTeachers(currentPage.value);
});

// --- Lifecycle Hook ---
onMounted(() => {
  loadTeachers();
});
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

      <!-- Bulk delete button - hanya tampil jika ada item yang dipilih -->
      <div 
        v-if="canBulkDelete" 
        class="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4"
      >
        <div class="flex items-center space-x-2">
          <ButtonComponent
            variant="danger"
            size="sm"
            @click="openBulkDeleteConfirmModal"
            :loading="isBulkDeleting"
          >
            Hapus Terpilih ({{ selectedTeacherIds.length }})
          </ButtonComponent>
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
        :selectedItems="selectedTeacherIds"          
        @update:selectedItems="handleSelectedItemsChange" >
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
              <ButtonComponent variant="danger" @click="openDeleteConfirmModal(item as Teacher)">Hapus</ButtonComponent>
              </ButtonGroupComponent>
          </div>
        </template>
      </TableComponent>

      <div class="mt-8 justify-between items-center">
        <TablePagination :meta="paginationMeta" :links="paginationLinks" @go-to-page="goToPage" />
      </div>

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
          <span class="font-semibold text-red-700">{{ teacherToDeleteName }}</span>?
          Tindakan ini tidak dapat dibatalkan.
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

      <ModalComponent
        v-model="showBulkDeleteConfirmModal"
        title="Konfirmasi Hapus Data Terpilih"
        type="danger"
        max-width="sm"
        :show-close-button="!isBulkDeleting"
        :backdrop-dismiss="!isBulkDeleting"
        @close="cancelBulkDelete"
      >
        <p>
          Anda akan menghapus
          <span class="font-semibold text-red-700">{{ selectedTeacherIds.length }}</span>
          guru yang terpilih. Tindakan ini tidak dapat dibatalkan. Lanjutkan?
        </p>
        <template #actions>
          <ButtonComponent
            variant="secondary"
            size="sm"
            @click="cancelBulkDelete"
            :disabled="isBulkDeleting"
          >
            Batal
          </ButtonComponent>
          <ButtonComponent
            variant="danger"
            size="sm"
            @click="confirmBulkDelete"
            :loading="isBulkDeleting"
          >
            Hapus Sekarang
          </ButtonComponent>
        </template>
      </ModalComponent>

    </div>
  </AdminLayout>
</template>