<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTeacher } from '@/services/teacherService'; // Import fungsi dari teacherService
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import InputField from '@/components/forms/InputField.vue'; // Komponen InputField
import SelectInput from '@/components/forms/SelectInput.vue'; // Komponen SelectInput
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import { PlusIcon } from '@heroicons/vue/24/solid'; // Menggunakan Heroicons
import { useToast } from 'vue-toastification';

// Import VeeValidate hooks
import { useForm } from 'vee-validate';
// Import validator resolver dari VeeValidate untuk Zod
import { toTypedSchema } from '@vee-validate/zod';
// Import skema Zod yang sudah kita buat
import { teacherSchema, type TeacherFormValues } from '@/schemas/teacherSchema';

// Impor useI18n
import { useI18n } from 'vue-i18n'

// Inisialisasi useI18n
const { t } = useI18n()

const currentPageTitle = ref(t('teacher.create'));
const router = useRouter();
const toast = useToast();

// Inisialisasi form dengan VeeValidate dan Zod schema
// `toTypedSchema(teacherSchema)` mengubah skema Zod menjadi validator yang dapat digunakan VeeValidate.
const {
  defineField,    // Untuk mendefinisikan field form dan mendapatkan `v-model` & `v-bind` props
  handleSubmit,   // Untuk menangani submit form (sudah termasuk validasi)
  errors,         // Objek reaktif yang berisi pesan error validasi per field
  isSubmitting,   // Boolean reaktif untuk status submit (true saat form sedang diproses)
  resetForm       // Fungsi untuk mereset form ke nilai awal atau membersihkan error
} = useForm<TeacherFormValues>({
  validationSchema: toTypedSchema(teacherSchema()), // Menggunakan skema Zod untuk validasi
  initialValues: { // Atur nilai awal form. Penting untuk SelectInput agar default 'male' terpilih.
    name: '',
    gender: 'male',
  },
});

// Definisikan field form menggunakan `defineField`.
// Ini mengaitkan input dengan skema validasi Zod dan mengelola state input.
// `[name, nameAttrs]` akan mengembalikan ref `name` (untuk `v-model`) dan objek `nameAttrs` (untuk `v-bind`).
const [name, nameAttrs] = defineField('name');
const [gender, genderAttrs] = defineField('gender');

// Fungsi untuk menangani submit form.
// `handleSubmit` dari VeeValidate akan secara otomatis memvalidasi form sisi klien.
// Jika form valid, ia akan memanggil fungsi callback ini dengan `values` yang sudah bersih dan type-safe.
const onSubmit = handleSubmit(async (values) => {
  try {
    // Panggil service untuk membuat guru baru dengan data yang sudah divalidasi oleh VeeValidate/Zod
    await createTeacher(values);

    // Tampilkan notifikasi sukses menggunakan toast
    toast.success(t('teacher.created_success'));

    // Reset form setelah sukses (mengatur ulang nilai dan membersihkan pesan error)
    resetForm();

    // Opsional: Redirect ke halaman daftar guru setelah jeda singkat
    setTimeout(() => {
      router.push({ name: 'teacher.index' }); // Pastikan nama rute sesuai
    }, 2000);

  } catch (err: any) {
    // Tangani error yang berasal dari API backend
    // console.error('Error creating teacher:', err);

    if (err.response && err.response.status === 422) {
      // Jika error adalah error validasi dari backend (HTTP status 422)
      // Assign error backend ke objek `errors` VeeValidate agar pesan muncul di bawah input yang relevan.
      // Pastikan format error dari backend sesuai yang diharapkan VeeValidate: { fieldName: ['Pesan error'] }
      errors.value = err.response.data.errors || {};
      toast.error(err.response.data.message || t('teacher.error_backend'));
    } else if (err.response && err.response.data && err.response.data.message) {
      // Jika ada pesan error lain dari API (misal: otorisasi, server error)
      toast.error(err.response.data.message);
    } else {
      // Tangani error generik (misal: masalah jaringan atau server tidak merespons)
      toast.error(t('teacher.error_backend'));
    }
  }
  // `isSubmitting` dari VeeValidate secara otomatis akan menjadi `false` setelah try/catch selesai
});

// Fungsi untuk kembali ke halaman daftar guru
const goBack = () => {
  router.push({ name: 'teacher.index' }); // Pastikan nama rute sesuai
};
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">Tambah Guru Baru</h1>

      <form @submit="onSubmit"> <div class="space-y-6">
          <InputField
            id="teacherName"
            :label="t('teacher.name')"
            type="text"
            v-model="name"          
            v-bind="nameAttrs"       
            :placeholder="t('teacher.name_placeholder')"
            :errors="errors.name ? [errors.name] : []"    
            required
          />

          <SelectInput
            id="teacherGender"
            :label="t('teacher.gender')"
            v-model="gender"        
            v-bind="genderAttrs"     
            :options="[
              { value: 'male', label: t('common.male') },
              { value: 'female', label: t('common.female') },
            ]"
            :placeholder="t('teacher.gender_placeholder')"
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
            {{ t('common.cancel') }}
          </ButtonComponent>
          <ButtonComponent
            variant="primary"
            size="md"
            type="submit"
            :loading="isSubmitting" >
            <PlusIcon v-if="!isSubmitting" class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {{ t('common.save') }}
          </ButtonComponent>
        </div>
      </form>
    </div>
  </AdminLayout>
</template>