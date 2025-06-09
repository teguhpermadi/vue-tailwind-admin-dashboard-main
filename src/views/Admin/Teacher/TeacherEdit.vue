<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchTeacherById, updateTeacher, type Teacher, type UpdateTeacherPayload } from '@/services/teacherService';
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import InputField from '@/components/forms/InputField.vue';
import SelectInput from '@/components/forms/SelectInput.vue';
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import { ArrowPathIcon, CheckIcon } from '@heroicons/vue/24/solid'; // Menggunakan Heroicons
import { useAuthStore } from '@/stores/authStore'; 
import { useToast } from 'vue-toastification'; // <--- IMPORT INI

const currentPageTitle = ref('Edit Data Guru');
const route = useRoute(); // Untuk mengambil ID dari URL
const router = useRouter(); // Untuk navigasi
const authStore = useAuthStore();
const toast = useToast();

// State untuk menyimpan data guru yang akan diedit
const teacherData = ref<Partial<Teacher>>({
  name: '',
  gender: 'male',
  // Inisialisasi properti lain jika ada (misal: email, phone, dll.)
});

const isLoading = ref(false); // Status loading untuk pengambilan data guru
const isSaving = ref(false); // Status loading untuk tombol submit
const generalError = ref<string | null>(null); // Untuk pesan error umum
const successMessage = ref<string | null>(null); // Untuk pesan sukses

// Objek untuk menyimpan error validasi per field dari backend
const validationErrors = ref<Record<string, string[]>>({});

// ID Guru dari URL
const teacherId = ref<string | string[] | null>(route.params.id);

// Watcher untuk merespons perubahan ID di URL (jika rute menggunakan parameter yang sama)
watch(
  () => route.params.id,
  (newId) => {
    teacherId.value = newId;
    if (newId) {
      fetchTeacher(); // Ambil data guru lagi jika ID berubah
    } else {
      generalError.value = 'ID guru tidak ditemukan di URL.';
      toast.error('ID guru tidak ditemukan di URL.'); // <--- PENGGUNAAN TOAST ERROR
    }
  }
);

// Fungsi untuk mengambil data guru
const fetchTeacher = async () => {
  isLoading.value = true;
  generalError.value = null;
  try {
    if (teacherId.value) {
      const response = await fetchTeacherById(teacherId.value as string);
      // Assign data guru yang diterima ke teacherData
      teacherData.value = {
        name: response.data.name,
        gender: response.data.gender,
        // Assign properti lain jika ada:
        // email: response.data.email,
        // phone: response.data.phone,
      };
      currentPageTitle.value = `Edit: ${response.data.name}`; // Update judul halaman
    } else {
      generalError.value = 'ID guru tidak ditemukan.';
      toast.error('ID guru tidak ditemukan.'); // <--- PENGGUNAAN TOAST ERROR
    }
  } catch (err: any) {
    console.error('Error fetching teacher:', err);
    if (err.response && err.response.data && err.response.data.message) {
      generalError.value = err.response.data.message;
      toast.error(err.response.data.message); // <--- PENGGUNAAN TOAST ERROR
    } else {
      generalError.value = 'Gagal mengambil data guru. Silakan coba lagi.';
      toast.error('Gagal mengambil data guru. Silakan coba lagi.'); // <--- PENGGUNAAN TOAST ERROR
    }
    // Jika guru tidak ditemukan atau error lain, mungkin redirect ke halaman daftar guru
    // router.push({ name: 'admin.teachers.index' });
  } finally {
    isLoading.value = false;
  }
};

// Fungsi untuk menyimpan perubahan data guru
const handleSubmit = async () => {
  isSaving.value = true;
  generalError.value = null;
  successMessage.value = null;
  validationErrors.value = {}; // Reset error validasi

  try {
    if (!teacherId.value) {
      generalError.value = 'ID guru tidak valid untuk pembaruan.';
      toast.error('ID guru tidak valid untuk pembaruan.'); // <--- PENGGUNAAN TOAST ERROR
      return;
    }

    const payload: UpdateTeacherPayload = {
      name: teacherData.value.name,
      gender: teacherData.value.gender as 'male' | 'female',
      // Tambahkan properti lain yang ingin diupdate:
      // email: teacherData.value.email,
    };

    await updateTeacher(teacherId.value as string, payload);
    toast.success('Data guru berhasil diperbarui!'); // <--- PENGGUNAAN TOAST SUKSES

    successMessage.value = 'Data guru berhasil diperbarui!';

    // Opsional: Redirect kembali ke daftar guru setelah sukses
    // router.push({ name: 'admin.teachers.index' });
  } catch (err: any) {
    console.error('Error updating teacher:', err);
    if (err.response && err.response.status === 422) {
      validationErrors.value = err.response.data.errors || {};
      generalError.value = err.response.data.message || 'Ada kesalahan validasi. Silakan periksa input Anda.';
      toast.error(err.response.data.message || 'Ada kesalahan validasi. Silakan periksa input Anda.'); // <--- PENGGUNAAN TOAST ERROR
    } else if (err.response && err.response.data && err.response.data.message) {
      generalError.value = err.response.data.message;
      toast.error(err.response.data.message); // <--- PENGGUNAAN TOAST ERROR
    } else {
      generalError.value = 'Gagal memperbarui guru. Silakan coba lagi.';
      toast.error('Gagal memperbarui guru. Silakan coba lagi.'); // <--- PENGGUNAAN TOAST ERROR
    }
  } finally {
    isSaving.value = false;
  }
};

// Fungsi untuk kembali ke halaman daftar guru
const goBack = () => {
  router.push({ name: 'teacher.index' });
};

// Panggil fetchTeacher saat komponen pertama kali dimuat
onMounted(() => {
  if (teacherId.value) {
    fetchTeacher();
  } else {
    generalError.value = 'ID guru tidak ditemukan di URL.';
    toast.error('ID guru tidak ditemukan di URL.'); // <--- PENGGUNAAN TOAST ERROR
  }
});
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">
        {{ currentPageTitle }}
      </h1>

      <div
        v-if="isLoading"
        class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400"
      >
        <ArrowPathIcon class="animate-spin h-8 w-8 mr-3" />
        Memuat data guru...
      </div>

      <div
        v-if="generalError && !isLoading"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:border-red-700 dark:text-red-300"
        role="alert"
      >
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline ml-2">{{ generalError }}</span>
      </div>

      <div
        v-if="successMessage && !isLoading"
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
        role="alert"
      >
        <strong class="font-bold">Sukses!</strong>
        <span class="block sm:inline ml-2">{{ successMessage }}</span>
      </div>

      <form v-if="!isLoading && teacherData.name !== null" @submit.prevent="handleSubmit">
        <div class="space-y-6">
          <InputField
            id="teacherName"
            label="Nama Guru"
            type="text"
            v-model="teacherData.name"
            placeholder="Masukkan nama guru"
            :errors="validationErrors.name"
            required
          />

          <SelectInput
            id="teacherGender"
            label="Jenis Kelamin"
            v-model="teacherData.gender"
            :options="[
              { value: 'male', label: 'Laki-laki' },
              { value: 'female', label: 'Perempuan' },
            ]"
            placeholder="Pilih jenis kelamin"
            :error="validationErrors.gender"
            required
          />

          </div>

        <div class="mt-8 flex justify-end space-x-4">
          <ButtonComponent
            variant="secondary"
            size="md"
            @click="goBack"
            :disabled="isSaving"
          >
            Batal
          </ButtonComponent>
          <ButtonComponent
            v-if="authStore.can('update-teacher')"
            variant="primary"
            size="md"
            type="submit"
            :loading="isSaving"
          >
            <CheckIcon v-if="!isSaving" class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Simpan Perubahan
          </ButtonComponent>
        </div>
      </form>
      <div v-else-if="!isLoading && !generalError" class="text-center py-10 text-gray-500 dark:text-gray-400">
        Data guru tidak dapat dimuat atau tidak ditemukan.
      </div>
    </div>
  </AdminLayout>
</template>