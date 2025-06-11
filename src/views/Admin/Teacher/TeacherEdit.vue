<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchTeacherById, updateTeacher, type Teacher } from '@/services/teacherService'; // Hapus UpdateTeacherPayload jika tidak lagi digunakan secara langsung
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import InputField from '@/components/forms/InputField.vue';
import SelectInput from '@/components/forms/SelectInput.vue';
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import { ArrowPathIcon, CheckIcon } from '@heroicons/vue/24/solid';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from 'vue-toastification';

// Import VeeValidate hooks
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
// Import skema Zod dan tipe yang diinferensikan
import { teacherSchema, type TeacherFormValues } from '@/schemas/teacherSchema'; // Pastikan path ini benar

const currentPageTitle = ref('Edit Data Guru');
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const teacherId = ref<string | string[] | null>(route.params.id);
const isLoadingData = ref(false); // Status loading untuk pengambilan data guru awal

// Inisialisasi form dengan VeeValidate dan Zod schema
// `setValues` akan digunakan untuk mengisi form setelah data guru berhasil diambil.
const {
  defineField,    // Untuk mengaitkan input dengan VeeValidate
  handleSubmit,   // Untuk menangani submit form (termasuk validasi)
  errors,         // Objek reaktif berisi pesan error per field
  isSubmitting,   // Boolean reaktif untuk status submit (pengganti isSaving)
  setValues       // Fungsi untuk mengisi nilai form
} = useForm<TeacherFormValues>({
  validationSchema: toTypedSchema(teacherSchema), // Menggunakan skema Zod untuk validasi
  // initialValues bisa diatur di sini, tapi setValues akan menimpanya setelah data diambil.
  // Misalnya, Anda bisa mengatur default 'male' jika gender bisa kosong dari API.
  initialValues: {
      name: '',
      gender: 'male',
  }
});

// Definisikan field form menggunakan `defineField`
const [name, nameAttrs] = defineField('name');
const [gender, genderAttrs] = defineField('gender');

// Hapus state lama yang sekarang ditangani oleh VeeValidate atau sudah tidak relevan:
// const teacherData = ref<Partial<Teacher>>({}); // Diganti dengan setValues dan nilai form internal VeeValidate
// const isSaving = ref(false); // Diganti oleh `isSubmitting`
// const generalError = ref<string | null>(null); // Diganti oleh toast dan `errors` VeeValidate
// const successMessage = ref<string | null>(null); // Diganti oleh toast
// const validationErrors = ref<Record<string, string[]>>({}); // Diganti oleh `errors` dari VeeValidate

// Watcher untuk merespons perubahan ID di URL
watch(
  () => route.params.id,
  (newId) => {
    teacherId.value = newId;
    if (newId) {
      fetchTeacher(); // Ambil data guru lagi jika ID berubah
    } else {
      toast.error('ID guru tidak ditemukan di URL.');
    }
  }
);

// Fungsi untuk mengambil data guru
const fetchTeacher = async () => {
  isLoadingData.value = true;
  try {
    if (teacherId.value) {
      const response = await fetchTeacherById(teacherId.value as string);
      // Gunakan `setValues` dari VeeValidate untuk mengisi form dengan data yang diambil
      // Ini akan memperbarui nilai internal form VeeValidate dan `v-model` yang terikat.
      setValues({
        name: response.data.name,
        gender: response.data.gender,
        // Pastikan semua properti yang ada di `TeacherFormValues` Zod diisi di sini
      });
      currentPageTitle.value = `Edit: ${response.data.name}`;
    } else {
      toast.error('ID guru tidak ditemukan.');
    }
  } catch (err: any) {
    console.error('Error fetching teacher:', err);
    if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error('Gagal mengambil data guru. Silakan coba lagi.');
    }
    // Jika guru tidak ditemukan atau error lain, mungkin redirect ke halaman daftar guru
    router.push({ name: 'admin.teachers.index' }); // Sesuaikan dengan nama rute Anda
  } finally {
    isLoadingData.value = false;
  }
};

// Fungsi untuk menyimpan perubahan data guru
// `handleSubmit` dari VeeValidate akan secara otomatis memvalidasi form sisi klien.
// Jika valid, ia akan memanggil fungsi callback ini dengan `values` yang sudah bersih dan type-safe.
const onSubmit = handleSubmit(async (values) => {
  try {
    if (!teacherId.value) {
      toast.error('ID guru tidak valid untuk pembaruan.');
      return;
    }

    // `values` sudah divalidasi dan tipenya sesuai `TeacherFormValues` dari Zod
    await updateTeacher(teacherId.value as string, values);
    toast.success('Data guru berhasil diperbarui!');

    // Opsional: Redirect kembali ke daftar guru setelah sukses
    router.push({ name: 'teacher.index' });
  } catch (err: any) {
    console.error('Error updating teacher:', err);
    if (err.response && err.response.status === 422) {
      // Jika error adalah error validasi dari backend (HTTP 422)
      // Assign error backend ke objek `errors` VeeValidate
      errors.value = err.response.data.errors || {};
      toast.error(err.response.data.message || 'Ada kesalahan validasi dari server. Silakan periksa input Anda.');
    } else if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error('Gagal memperbarui guru. Silakan coba lagi.');
    }
  }
  // `isSubmitting` dari VeeValidate otomatis akan menjadi `false` setelah try/catch selesai
});

// Fungsi untuk kembali ke halaman daftar guru
const goBack = () => {
  router.push({ name: 'teacher.index' }); // Pastikan nama rute sesuai
};

// Panggil fetchTeacher saat komponen pertama kali dimuat
onMounted(() => {
  if (teacherId.value) {
    fetchTeacher();
  } else {
    toast.error('ID guru tidak ditemukan di URL saat mount.');
    router.push({ name: 'teacher.index' }); // Redirect jika ID tidak ada
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
        v-if="isLoadingData"
        class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400"
      >
        <ArrowPathIcon class="animate-spin h-8 w-8 mr-3" />
        Memuat data guru...
      </div>

      <form v-if="!isLoadingData && teacherId" @submit="onSubmit"> <div class="space-y-6">
          <InputField
            id="teacherName"
            label="Nama Guru"
            type="text"
            v-model="name"          
            v-bind="nameAttrs"       
            placeholder="Masukkan nama guru"
            :errors="errors.name ? [errors.name] : []"    
            required
          />

          <SelectInput
            id="teacherGender"
            label="Jenis Kelamin"
            v-model="gender"        
            v-bind="genderAttrs"     
            :options="[
              { value: 'male', label: 'Laki-laki' },
              { value: 'female', label: 'Perempuan' },
            ]"
            placeholder="Pilih jenis kelamin"
            :error="errors.gender ? [errors.gender] : []"
            required
          />
        </div>

        <div class="mt-8 flex justify-end space-x-4">
          <ButtonComponent
            variant="secondary"
            size="md"
            @click="goBack"
            :disabled="isSubmitting" >
            Batal
          </ButtonComponent>
          <ButtonComponent
            v-if="authStore.can('update-teacher')"
            variant="primary"
            size="md"
            type="submit"
            :loading="isSubmitting" >
            <CheckIcon v-if="!isSubmitting" class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Simpan Perubahan
          </ButtonComponent>
        </div>
      </form>
      <div v-else-if="!isLoadingData && !teacherId" class="text-center py-10 text-gray-500 dark:text-gray-400">
          Data guru tidak ditemukan atau terjadi masalah saat memuat.
      </div>
    </div>
  </AdminLayout>
</template>