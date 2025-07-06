<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import InputField from '@/components/forms/InputField.vue';
import Spinner from '@/components/common/Spinner.vue';
import Swal from 'sweetalert2';

// Import service baru
import { fetchUserProfile, linkProfileAccount, type UserProfile, type TeacherProfile, type StudentProfile } from '@/services/profileService';

// --- Inisialisasi ---
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const currentPageTitle = ref(t('profile.title'));

// --- State Reaktif ---
const currentUser = ref<UserProfile | null>(null);
const isLoadingUser = ref(true);
const userLoadError = ref<string | null>(null);

const linkingToken = ref<string>('');
const isLinking = ref(false);
const linkingError = ref<string | null>(null);

// --- Fungsi untuk Mengambil Data User ---
const loadUserProfile = async () => {
  isLoadingUser.value = true;
  userLoadError.value = null;
  try {
    currentUser.value = await fetchUserProfile();
  } catch (error: any) {
    console.error('Error fetching current user profile:', error);
    userLoadError.value = error.response?.data?.message || t('profile.error_load_user');
    Swal.fire(t('common.error'), userLoadError.value, 'error');
  } finally {
    isLoadingUser.value = false;
  }
};

// --- Fungsi untuk Menautkan Akun ---
const handleLinkAccount = async () => {
  if (!linkingToken.value) {
    toast.warning(t('profile.token_required'));
    return;
  }

  isLinking.value = true;
  linkingError.value = null;

  try {
    Swal.fire({
      title: t('profile.linking_account'),
      text: t('profile.linking_in_progress'),
      didOpen: () => { Swal.showLoading(); },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    const response = await linkProfileAccount({ token: linkingToken.value });
    
    Swal.close();
    toast.success(response.message || t('profile.link_success'));
    linkingToken.value = ''; // Bersihkan input token
    await loadUserProfile(); // Muat ulang data user setelah sukses menautkan

  } catch (error: any) {
    Swal.close();
    console.error('Error linking profile:', error);
    linkingError.value = error.response?.data?.message || t('profile.link_failed_general');
    Swal.fire(t('common.error'), linkingError.value, 'error');
  } finally {
    isLinking.value = false;
  }
};

// --- Lifecycle Hook ---
onMounted(async () => {
  await loadUserProfile();

  // Jika ada token di URL query, coba tautkan secara otomatis
  const tokenFromUrl = route.query.token as string;
  if (tokenFromUrl) {
    linkingToken.value = tokenFromUrl;
    // Hapus token dari URL setelah diambil untuk kebersihan
    router.replace({ query: { ...route.query, token: undefined } });
    await handleLinkAccount(); // Panggil fungsi penautan
  }
});
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
    >
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">{{ t('profile.title') }}</h1>

      <div v-if="isLoadingUser" class="flex justify-center items-center h-48">
        <Spinner class="w-10 h-10 text-indigo-500" />
        <p class="ml-3 text-lg text-gray-700">{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="userLoadError" class="text-red-600 text-center py-8">
        <p>{{ userLoadError }}</p>
      </div>

      <div v-else-if="currentUser" class="space-y-8">
        <!-- Informasi Akun User -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">{{ t('profile.user_account_info') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">{{ t('common.name') }}:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ currentUser.name }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Email:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ currentUser.email }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">ID User:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ currentUser.id }}</p>
            </div>
          </div>
        </div>

        <!-- Informasi Profil Tertaut (Teacher/Student) -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">{{ t('profile.linked_profile_info') }}</h2>
          
          <div v-if="currentUser.userable">
            <div v-if="currentUser.userable_type === 'App\\Models\\Teacher'">
              <p class="text-sm font-medium text-gray-500">{{ t('profile.profile_type') }}: <span class="font-bold text-indigo-600">{{ t('profile.teacher_profile') }}</span></p>
              <p class="text-sm font-medium text-gray-500 mt-2">{{ t('common.name') }}:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as TeacherProfile).name }}</p>
              <p class="text-sm font-medium text-gray-500 mt-2">{{ t('common.gender') }}:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as TeacherProfile).gender === 'male' ? t('common.male') : t('common.female') }}</p>
              <!-- Tambahkan detail guru lainnya di sini -->
            </div>
            <div v-else-if="currentUser.userable_type === 'App\\Models\\Student'">
              <p class="text-sm font-medium text-gray-500">{{ t('profile.profile_type') }}: <span class="font-bold text-indigo-600">{{ t('profile.student_profile') }}</span></p>
              <p class="text-sm font-medium text-gray-500 mt-2">{{ t('common.name') }}:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as StudentProfile).name }}</p>
              <p class="text-sm font-medium text-gray-500 mt-2">{{ t('common.gender') }}:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as StudentProfile).gender === 'L' ? t('common.male') : t('common.female') }}</p>
              <p class="text-sm font-medium text-gray-500 mt-2">NISN:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as StudentProfile).nisn }}</p>
              <p class="text-sm font-medium text-gray-500 mt-2">NIS:</p>
              <p class="text-lg text-gray-900 dark:text-gray-100">{{ (currentUser.userable as StudentProfile).nis }}</p>
              <!-- Tambahkan detail siswa lainnya di sini -->
            </div>
          </div>
          <div v-else class="text-gray-600 dark:text-gray-400">
            <p>{{ t('profile.not_linked_message') }}</p>
          </div>
        </div>

        <!-- Formulir Penautan Akun -->
        <!-- <div v-if="!currentUser.userable" class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">{{ t('profile.link_account_form_title') }}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">{{ t('profile.link_account_form_description') }}</p>
          
          <InputField
            id="linkingToken"
            :label="t('profile.linking_token_label')"
            type="text"
            v-model="linkingToken"
            :placeholder="t('profile.linking_token_placeholder')"
            :errors="linkingError ? [linkingError] : []"
            :disabled="isLinking"
          />

          <div class="mt-6 flex justify-end">
            <ButtonComponent
              variant="primary"
              size="md"
              @click="handleLinkAccount"
              :loading="isLinking"
            >
              {{ t('profile.link_button') }}
            </ButtonComponent>
          </div>
        </div> -->
      </div>
    </div>
  </AdminLayout>
</template>
