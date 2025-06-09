<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTeacher, type Teacher } from '@/services/teacherService'; // Import fungsi dan tipe dari teacherService
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import InputField from '@/components/forms/InputField.vue'; // Komponen InputField
import SelectInput from '@/components/forms/SelectInput.vue'; // Komponen SelectInput yang baru
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import { PlusIcon } from '@heroicons/vue/24/solid'; // Menggunakan Heroicons

const currentPageTitle = ref('Tambah Guru Baru');
const router = useRouter();

// State untuk menyimpan data guru baru yang akan diinput
const newTeacher = ref<Partial<Teacher>>({
  name: '',
  gender: 'male', // Set default value untuk jenis kelamin
});

const isLoading = ref(false); // Status loading untuk tombol submit
const generalError = ref<string | null>(null); // Untuk menampilkan pesan error umum (non-validasi field)
const successMessage = ref<string | null>(null); // Untuk menampilkan pesan sukses

// Objek untuk menyimpan error validasi dari backend per field
// Kunci (key) adalah nama field (misal: 'name', 'gender'), dan nilai adalah array string pesan error
const validationErrors = ref<Record<string, string[]>>({});

// Fungsi untuk menangani submit form
const handleSubmit = async () => {
  // Reset semua status dan pesan sebelum setiap submit
  isLoading.value = true;
  generalError.value = null;
  successMessage.value = null;
  validationErrors.value = {}; // Reset error validasi per field

  try {
    // Siapkan payload data yang akan dikirim ke API
    const payload = {
      name: newTeacher.value.name,
      gender: newTeacher.value.gender as 'male' | 'female', // Pastikan tipe sesuai dengan payload API
    };

    // Panggil service untuk membuat guru baru
    await createTeacher(payload);

    // Jika sukses
    successMessage.value = 'Guru berhasil ditambahkan!';
    // Opsional: Reset form setelah sukses
    newTeacher.value = { name: '', gender: 'male' };
    // Opsional: Redirect ke halaman daftar guru setelah beberapa saat
    // setTimeout(() => {
    //   router.push({ name: 'admin.teachers.index' });
    // }, 2000);

  } catch (err: any) {
    // Tangani error dari API
    console.error('Error creating teacher:', err);

    if (err.response && err.response.status === 422) {
      // Jika error adalah error validasi (status HTTP 422)
      // Simpan objek error dari backend ke state validationErrors
      // Pastikan err.response.data.errors adalah objek yang berisi array string
      validationErrors.value = err.response.data.errors || {};
      generalError.value = err.response.data.message || 'Ada kesalahan validasi. Silakan periksa input Anda.';
    } else if (err.response && err.response.data && err.response.data.message) {
      // Jika ada pesan error lain dari API (misal: "Unauthorized", "Not Found")
      generalError.value = err.response.data.message;
    } else {
      // Error generik (misal: masalah jaringan)
      generalError.value = 'Gagal menambahkan guru. Silakan coba lagi.';
    }
  } finally {
    isLoading.value = false; // Matikan status loading
  }
};

// Fungsi untuk kembali ke halaman daftar guru
const goBack = () => {
  router.push({ name: 'teacher.index' });
};
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">Tambah Guru Baru</h1>

      <div
        v-if="generalError"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:border-red-700 dark:text-red-300"
        role="alert"
      >
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline ml-2">{{ generalError }}</span>
      </div>

      <div
        v-if="successMessage"
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
        role="alert"
      >
        <strong class="font-bold">Sukses!</strong>
        <span class="block sm:inline ml-2">{{ successMessage }}</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-6">
          <InputField
            id="teacherName"
            label="Nama Guru"
            type="text"
            v-model="newTeacher.name"
            placeholder="Masukkan nama guru"
            :errors="validationErrors.name" required
          />

          <SelectInput
            id="teacherGender"
            label="Jenis Kelamin"
            v-model="newTeacher.gender"
            :options="[
              { value: 'male', label: 'Laki-laki' },
              { value: 'female', label: 'Perempuan' },
            ]"
            placeholder="Pilih jenis kelamin"
            :error="validationErrors.gender" required
          />

          </div>

        <div class="mt-8 flex justify-end space-x-4">
          <ButtonComponent
            variant="secondary"
            size="md"
            @click="goBack"
            :disabled="isLoading"
          >
            Batal
          </ButtonComponent>
          <ButtonComponent
            variant="primary"
            size="md"
            type="submit"
            :loading="isLoading"
          >
            <PlusIcon v-if="!isLoading" class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Simpan Guru
          </ButtonComponent>
        </div>
      </form>
    </div>
  </AdminLayout>
</template>