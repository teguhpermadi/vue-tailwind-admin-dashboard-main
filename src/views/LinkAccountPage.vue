<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import ButtonComponent from '@/components/ui/ButtonComponent.vue';
import Swal from 'sweetalert2';
import api from '@/services/api'; // Pastikan ini diimpor

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const linkingStatus = ref<'loading' | 'success' | 'error' | null>(null);
const linkingMessage = ref<string | null>(null);

const linkAccount = async () => {
  const token = route.query.token as string;

  if (!token) {
    linkingStatus.value = 'error';
    linkingMessage.value = t('link_account.no_token'); // Tambahkan ke locale
    Swal.fire(t('common.error'), linkingMessage.value, 'error');
    return;
  }

  linkingStatus.value = 'loading';
  linkingMessage.value = t('link_account.linking_in_progress'); // Tambahkan ke locale

  try {
    const response = await api.post('/link/teacher-account', { token });
    linkingStatus.value = 'success';
    linkingMessage.value = response.data.message || t('link_account.link_success'); // Tambahkan ke locale
    Swal.fire(t('common.success'), linkingMessage.value, 'success');
    
    // Opsional: Refresh data user di store atau redirect
    // Misalnya, jika Anda memiliki auth store, Anda bisa memuat ulang data user:
    // authStore.fetchUser();
    setTimeout(() => {
      router.push({ name: 'dashboard' }); // Redirect ke dashboard setelah sukses
    }, 2000);

  } catch (err: any) {
    linkingStatus.value = 'error';
    linkingMessage.value = err.response?.data?.message || t('link_account.link_failed_general'); // Tambahkan ke locale
    Swal.fire(t('common.error'), linkingMessage.value, 'error');
  }
};

onMounted(() => {
  linkAccount();
});

const goHome = () => {
  router.push({ name: 'dashboard' });
};
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="t('link_account.title')" />
    <div class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex flex-col items-center justify-center">
      <h1 class="text-3xl font-bold text-gray-800 mb-6 dark:text-white">{{ t('link_account.title') }}</h1>

      <div v-if="linkingStatus === 'loading'" class="flex flex-col items-center text-blue-500">
        <Spinner class="w-12 h-12 mb-4" />
        <p class="text-lg font-semibold">{{ linkingMessage }}</p>
      </div>

      <div v-else-if="linkingStatus === 'success'" class="text-center text-green-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="text-xl font-semibold mb-4">{{ linkingMessage }}</p>
        <ButtonComponent variant="primary" @click="goHome">{{ t('link_account.go_to_dashboard') }}</ButtonComponent>
      </div>

      <div v-else-if="linkingStatus === 'error'" class="text-center text-red-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="text-xl font-semibold mb-4">{{ linkingMessage }}</p>
        <ButtonComponent variant="secondary" @click="goHome">{{ t('link_account.go_to_dashboard') }}</ButtonComponent>
      </div>
    </div>
  </AdminLayout>
</template>