<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';

// --- Interfaces ---
export type ModalType = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'confirm';

interface Props {
  modelValue: boolean; // Mengontrol visibilitas modal (untuk v-model)
  title?: string;      // Judul modal
  type?: ModalType;    // Tipe modal untuk styling (e.g., info, success, danger, confirm)
  showCloseButton?: boolean; // Tampilkan tombol X di header
  backdropDismiss?: boolean; // Izinkan menutup modal dengan klik di luar
  maxWidth?: string;   // Lebar maksimum modal (e.g., 'sm', 'md', 'lg', '2xl' untuk Tailwind)
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: 'Peringatan',
  type: 'default',
  showCloseButton: true,
  backdropDismiss: true,
  maxWidth: 'md', // Default lebar medium
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void; // Untuk v-model
  (e: 'close'): void; // Event ketika modal ditutup (baik dari tombol close, backdrop, atau Escape)
}>();

// --- Computed properties for styling ---
const modalClasses = computed(() => {
  let classes = ['relative w-full mx-auto p-6 rounded-lg shadow-xl transform transition-all sm:my-8'];
  
  // Perbaikan Transisi CSS: Tambahkan kelas 'modal-content' agar CSS yang Anda buat berfungsi
  classes.push('modal-content'); 

  // Max width classes (Tailwind)
  const maxWidthMap = {
    'sm': 'sm:max-w-sm',
    'md': 'sm:max-w-md',
    'lg': 'sm:max-w-lg',
    'xl': 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    'full': 'sm:max-w-full',
  };
  if (props.maxWidth && maxWidthMap[props.maxWidth as keyof typeof maxWidthMap]) {
    classes.push(maxWidthMap[props.maxWidth as keyof typeof maxWidthMap]);
  } else {
    classes.push('sm:max-w-md'); // Default fallback
  }

  // Background color based on type (example, adjust as needed)
  switch (props.type) {
    case 'info': classes.push('bg-blue-50'); break;
    case 'success': classes.push('bg-green-50'); break;
    case 'warning': classes.push('bg-yellow-50'); break;
    case 'danger': classes.push('bg-red-50'); break;
    case 'confirm': classes.push('bg-white'); break; // Often default white for confirm
    default: classes.push('bg-white'); // Default
  }
  return classes;
});

const headerClasses = computed(() => {
  let classes = ['flex justify-between items-center pb-4 border-b'];
  switch (props.type) {
    case 'info': classes.push('border-blue-200 text-blue-800'); break;
    case 'success': classes.push('border-green-200 text-green-800'); break;
    case 'warning': classes.push('border-yellow-200 text-yellow-800'); break;
    case 'danger': classes.push('border-red-200 text-red-800'); break;
    default: classes.push('border-gray-200 text-gray-900');
  }
  return classes;
});

const iconClasses = computed(() => {
  switch (props.type) {
    case 'info': return 'text-blue-500';
    case 'success': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'danger': return 'text-red-500';
    case 'confirm': return 'text-gray-500'; // Default for confirm
    default: return 'text-gray-500';
  }
});

// --- Handlers ---
const close = () => {
  console.log('close() dipanggil. Menutup modal.');
  emit('update:modelValue', false);
  emit('close');
};

const handleBackdropClick = () => { // Tidak perlu event parameter jika @click.stop digunakan di anak
  console.log('handleBackdropClick dipicu.');
  if (props.backdropDismiss) {
    console.log('Backdrop dismiss aktif, menutup modal.');
    close();
  }
};

// --- Penanganan tombol Escape ---
const handleKeydown = (event: KeyboardEvent) => {
  console.log('Keydown event terdeteksi:', event.key, 'ModelValue:', props.modelValue);
  if (event.key === 'Escape' && props.modelValue) {
    console.log('Tombol Escape ditekan, menutup modal.');
    event.preventDefault();
    close();
  }
};

// Mengawasi perubahan modelValue untuk menambah/menghapus event listener
watch(() => props.modelValue, (newValue) => {
  console.log('Watch: modelValue berubah menjadi:', newValue);
  if (newValue) {
    document.addEventListener('keydown', handleKeydown);
    console.log('Event listener keydown DITAMBAHKAN.');
  } else {
    document.removeEventListener('keydown', handleKeydown);
    console.log('Event listener keydown DIHAPUS.');
  }
}, { immediate: true });

// Penting: Hapus event listener saat komponen dihancurkan
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  console.log('Komponen di-unmounted, listener keydown dihapus (safeguard).');
});
</script>

<template>
  <Transition name="modal">
    <!-- Kontainer utama modal, p-4 untuk padding di sekitar backdrop/modal -->
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop visual yang sekarang menerima event click -->
      <div 
        class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" 
        aria-hidden="true" 
        @click="handleBackdropClick"
      ></div>

      <!-- Konten modal, dengan @click.stop untuk mencegah propagasi ke backdrop -->
      <div 
        :class="modalClasses" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        @click.stop 
      >
        <div :class="headerClasses">
          <div class="flex items-center space-x-3">
            <svg v-if="type === 'info'" :class="iconClasses" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
            <svg v-else-if="type === 'success'" :class="iconClasses" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            <svg v-else-if="type === 'warning'" :class="iconClasses" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.364 2.722-1.364 3.486 0L17.6 13.25c.765 1.364-.241 3.25-1.802 3.25H4.202c-1.561 0-2.566-1.886-1.802-3.25L8.257 3.099zM10 10a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1zm0-4a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"></path></svg>
            <svg v-else-if="type === 'danger'" :class="iconClasses" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
            <svg v-else-if="type === 'confirm'" :class="iconClasses" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 13a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z"></path></svg>
            
            <h3 id="modal-title" class="text-lg font-semibold">{{ title }}</h3>
          </div>
          <button v-if="showCloseButton" @click="close" class="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-300 rounded-md p-1 -m-1">
            <span class="sr-only">Tutup</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="py-4 text-gray-700">
          <slot></slot>
        </div>

        <div class="pt-4 border-t border-gray-200 flex justify-end space-x-2">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Transition for modal appearance */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* For modal content transition */
.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: all 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
