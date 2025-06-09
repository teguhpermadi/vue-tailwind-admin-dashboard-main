<script setup lang="ts">
import { computed } from 'vue';

// Definisikan tipe untuk setiap opsi di dropdown
interface SelectOption {
  value: string | number | null; // Nilai yang akan dikirim saat opsi dipilih
  label: string; // Teks yang akan ditampilkan kepada pengguna
  disabled?: boolean; // Opsional: apakah opsi ini dinonaktifkan
}

// Definisikan props yang diterima oleh komponen SelectInput
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  modelValue: { // Digunakan untuk v-model
    type: [String, Number, null],
    default: null, // Default value adalah null, menunjukkan tidak ada yang dipilih
  },
  options: { // Array opsi yang akan ditampilkan di dropdown
    type: Array as () => SelectOption[],
    required: true,
  },
  placeholder: { // Teks placeholder untuk opsi default (misal: "Pilih...")
    type: String,
    default: 'Pilih...',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: { // Prop untuk menampilkan error dari validasi backend/frontend
    type: [String, Array, null],
    default: null,
  },
});

// Definisikan event yang akan di-emit oleh komponen
const emit = defineEmits(['update:modelValue', 'change']);

// Computed property untuk mengikat v-model
const internalValue = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
    // Emit event 'change' jika Anda perlu menangani perubahan secara langsung
    // di parent tanpa menunggu v-model diperbarui
    emit('change', newValue);
  },
});

// Computed property untuk mendapatkan pesan error pertama (jika ada)
const errorMessage = computed(() => {
  if (props.error) {
    return Array.isArray(props.error) ? props.error[0] : props.error;
  }
  return null;
});
</script>

<template>
  <div class="mb-4">
    <label :for="id" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="id"
      v-model="internalValue"
      :required="required"
      :disabled="disabled"
      :class="[
        'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm',
        errorMessage ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500',
        'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:focus:ring-blue-500 dark:focus:border-blue-500'
      ]"
    >
      <option :value="null" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-400">
      {{ errorMessage }}
    </p>
  </div>
</template>