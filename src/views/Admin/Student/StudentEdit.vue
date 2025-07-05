<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchStudentById, updateStudent, type Student } from '@/services/studentService'; // Hapus UpdateStudentPayload jika tidak lagi digunakan secara langsung
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
import { studentSchema, type StudentFormValues } from '@/schemas/studentSchema';

// Impor useI18n
import { useI18n } from 'vue-i18n'
// Inisialisasi useI18n
const { t } = useI18n()

const currentPageTitle = ref(t('student.edit'))
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const studentId = ref<string | string[] | null>(route.params.id);
const isLoadingData = ref(false); // Status loading untuk pengambilan data guru awal

// Inisialisasi form dengan VeeValidate dan Zod schema
// `setValues` akan digunakan untuk mengisi form setelah data guru berhasil diambil.
const {
  defineField,    // Untuk mengaitkan input dengan VeeValidate
  handleSubmit,   // Untuk menangani submit form (termasuk validasi)
  errors,         // Objek reaktif berisi pesan error per field
  isSubmitting,   // Boolean reaktif untuk status submit (pengganti isSaving)
  setValues       // Fungsi untuk mengisi nilai form
} = useForm<StudentFormValues>({
  validationSchema: toTypedSchema(studentSchema()), // Menggunakan skema Zod untuk validasi
  // initialValues bisa diatur di sini, tapi setValues akan menimpanya setelah data diambil.
  // Misalnya, Anda bisa mengatur default 'male' jika gender bisa kosong dari API.
  initialValues: {
      name: '',
      gender: 'male',
      nisn: '',
      nis: '',
  }
});

// Definisikan field form menggunakan `defineField`
const [name, nameAttrs] = defineField('name');
const [gender, genderAttrs] = defineField('gender');
const [nisn, nisnAttrs] = defineField('nisn'); // Tambah NISN
const [nis, nisAttrs] = defineField('nis');   // Tambah NIS

// Watcher untuk merespons perubahan ID di URL
watch(
  () => route.params.id,
  (newId) => {
    studentId.value = newId;
    if (newId) {
      fetchStudent(); // Ambil data guru lagi jika ID berubah
    } else {
      toast.error(t('student.not_found'));
    }
  }
);

// Fungsi untuk mengambil data guru
const fetchStudent = async () => {
  isLoadingData.value = true;
  try {
    if (studentId.value) {
      const response = await fetchStudentById(studentId.value as string);
      // Gunakan `setValues` dari VeeValidate untuk mengisi form dengan data yang diambil
      // Ini akan memperbarui nilai internal form VeeValidate dan `v-model` yang terikat.
      setValues({
        name: response.data.name,
        gender: response.data.gender,
        nisn: response.data.nisn,
        nis: response.data.nis,
        // Pastikan semua properti yang ada di `StudentFormValues` Zod diisi di sini
      });
      currentPageTitle.value = `Edit: ${response.data.name}`;
    } else {
      toast.error(t('student.not_found'));
    }
  } catch (err: any) {
    // console.error('Error fetching student:', err);
    if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error(t('student.error_backend'));
    }
    // Jika guru tidak ditemukan atau error lain, mungkin redirect ke halaman daftar guru
    router.push({ name: 'student.index' }); // Sesuaikan dengan nama rute Anda
  } finally {
    isLoadingData.value = false;
  }
};

// Fungsi untuk menyimpan perubahan data guru
// `handleSubmit` dari VeeValidate akan secara otomatis memvalidasi form sisi klien.
// Jika valid, ia akan memanggil fungsi callback ini dengan `values` yang sudah bersih dan type-safe.
const onSubmit = handleSubmit(async (values) => {
  try {
    if (!studentId.value) {
      toast.error(t('student.not_found'));
      return;
    }

    // `values` sudah divalidasi dan tipenya sesuai `StudentFormValues` dari Zod
    await updateStudent(studentId.value as string, values);
    toast.success(t('student.updated_success'));

    // Opsional: Redirect kembali ke daftar guru setelah sukses
    router.push({ name: 'student.index' });
  } catch (err: any) {
    // console.error('Error updating student:', err);
    if (err.response && err.response.status === 422) {
      // Jika error adalah error validasi dari backend (HTTP 422)
      // Assign error backend ke objek `errors` VeeValidate
      errors.value = err.response.data.errors || {};
      toast.error(err.response.data.message || t('student.error_backend'));
    } else if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error(t('student.error_backend'));
    }
  }
  // `isSubmitting` dari VeeValidate otomatis akan menjadi `false` setelah try/catch selesai
});

// Fungsi untuk kembali ke halaman daftar guru
const goBack = () => {
  router.push({ name: 'student.index' }); // Pastikan nama rute sesuai
};

// Panggil fetchStudent saat komponen pertama kali dimuat
onMounted(() => {
  if (studentId.value) {
    fetchStudent();
  } else {
    toast.error(t('student.not_found'));
    router.push({ name: 'student.index' }); // Redirect jika ID tidak ada
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
        {{ t('common.loading') }}
      </div>

      <form v-if="!isLoadingData && studentId" @submit="onSubmit"> <div class="space-y-6">
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
            v-if="authStore.can('update-student')"
            variant="primary"
            size="md"
            type="submit"
            :loading="isSubmitting" >
            <CheckIcon v-if="!isSubmitting" class="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {{ t('common.save') }}
          </ButtonComponent>
        </div>
      </form>
      <div v-else-if="!isLoadingData && !studentId" class="text-center py-10 text-gray-500 dark:text-gray-400">
          {{ t('student.not_found') }}
      </div>
    </div>
  </AdminLayout>
</template>