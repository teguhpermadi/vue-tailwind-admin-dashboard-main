<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createStudent } from '@/services/studentService'; // Import fungsi dari studentService
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
import { studentSchema, type StudentFormValues } from '@/schemas/studentSchema'; // Diubah ke studentSchema

// Impor useI18n
import { useI18n } from 'vue-i18n'

// Inisialisasi useI18n
const { t } = useI18n()

const currentPageTitle = ref(t('student.create')); // Diubah ke student.create
const router = useRouter();
const toast = useToast();

// Inisialisasi form dengan VeeValidate dan Zod schema
// `toTypedSchema(studentSchema())` mengubah skema Zod menjadi validator yang dapat digunakan VeeValidate.
const {
  defineField,    // Untuk mendefinisikan field form dan mendapatkan `v-model` & `v-bind` props
  handleSubmit,   // Untuk menangani submit form (sudah termasuk validasi)
  errors,         // Objek reaktif yang berisi pesan error validasi per field
  isSubmitting,   // Boolean reaktif untuk status submit (true saat form sedang diproses)
  resetForm       // Fungsi untuk mereset form ke nilai awal atau membersihkan error
} = useForm<StudentFormValues>({ // Diubah ke StudentFormValues
  validationSchema: toTypedSchema(studentSchema()), // Menggunakan skema Zod untuk validasi studentSchema
  initialValues: { // Atur nilai awal form. Penting untuk SelectInput agar default 'L' terpilih.
    name: '',
    gender: 'male', // Asumsi default gender siswa adalah 'male' (Laki-laki)
    nisn: '',
    nis: '',
  },
});

// Definisikan field form menggunakan `defineField`.
// Ini mengaitkan input dengan skema validasi Zod dan mengelola state input.
// `[name, nameAttrs]` akan mengembalikan ref `name` (untuk `v-model`) dan objek `nameAttrs` (untuk `v-bind`).
const [name, nameAttrs] = defineField('name');
const [gender, genderAttrs] = defineField('gender');
const [nisn, nisnAttrs] = defineField('nisn'); // Tambah NISN
const [nis, nisAttrs] = defineField('nis');   // Tambah NIS

// Fungsi untuk menangani submit form.
// `handleSubmit` dari VeeValidate akan secara otomatis memvalidasi form sisi klien.
// Jika form valid, ia akan memanggil fungsi callback ini dengan `values` yang sudah bersih dan type-safe.
const onSubmit = handleSubmit(async (values) => {
  try {
    // Panggil service untuk membuat siswa baru dengan data yang sudah divalidasi oleh VeeValidate/Zod
    await createStudent(values); // Diubah ke createStudent

    // Tampilkan notifikasi sukses menggunakan toast
    toast.success(t('student.created_success')); // Diubah ke student.created_success

    // Reset form setelah sukses (mengatur ulang nilai dan membersihkan pesan error)
    resetForm();

    // Opsional: Redirect ke halaman daftar siswa setelah jeda singkat
    setTimeout(() => {
      router.push({ name: 'student.index' }); // Pastikan nama rute sesuai student.index
    }, 2000);

  } catch (err: any) {
    // Tangani error yang berasal dari API backend
    // console.error('Error creating student:', err); // Diubah pesan log

    if (err.response && err.response.status === 422) {
      // Jika error adalah error validasi dari backend (HTTP status 422)
      // Assign error backend ke objek `errors` VeeValidate agar pesan muncul di bawah input yang relevan.
      // Pastikan format error dari backend sesuai yang diharapkan VeeValidate: { fieldName: ['Pesan error'] }
      errors.value = err.response.data.errors || {};
      toast.error(err.response.data.message || t('student.error_backend')); // Diubah ke student.error_backend
    } else if (err.response && err.response.data && err.response.data.message) {
      // Jika ada pesan error lain dari API (misal: otorisasi, server error)
      toast.error(err.response.data.message);
    } else {
      // Tangani error generik (misal: masalah jaringan atau server tidak merespons)
      toast.error(t('student.error_backend')); // Diubah ke student.error_backend
    }
  }
  // `isSubmitting` dari VeeValidate secara otomatis akan menjadi `false` setelah try/catch selesai
});

// Fungsi untuk kembali ke halaman daftar siswa
const goBack = () => {
  router.push({ name: 'student.index' }); // Pastikan nama rute sesuai student.index
};
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">{{ t('student.create') }}</h1> <!-- Diubah ke student.create -->

      <form @submit="onSubmit">
        <div class="space-y-6">
          <InputField
            id="studentName"
            :label="t('student.name')"
            type="text"
            v-model="name"          
            v-bind="nameAttrs"       
            :placeholder="t('student.name_placeholder')"
            :errors="errors.name ? [errors.name] : []"    
            required
          />

          <SelectInput
            id="studentGender" 
            :label="t('student.gender')"
            v-model="gender"        
            v-bind="genderAttrs"     
            :options="[
              { value: 'male', label: t('common.male') }, 
              { value: 'female', label: t('common.female') },
            ]"
            :placeholder="t('student.gender_placeholder')"
            :error="errors.gender ? [errors.gender] : []"
            required
          />

          <InputField
            id="studentNisn"
            :label="t('student.nisn')"
            type="number"
            v-model="nisn"          
            v-bind="nisnAttrs"       
            :placeholder="t('student.nisn_placeholder')"
            :errors="errors.nisn ? [errors.nisn] : []"    
            :required="false"
          />

          <InputField
            id="studentNis"
            :label="t('student.nis')"
            type="number"
            v-model="nis"          
            v-bind="nisAttrs"       
            :placeholder="t('student.nis_placeholder')"
            :errors="errors.nis ? [errors.nis] : []"    
            :required="false"
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
