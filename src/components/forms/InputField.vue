<template>
  <div>
    <label
      v-if="label"
      :for="id"
      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
    >
      {{ label }}
      <span v-if="required" class="text-error-500">*</span>
    </label>
    <div :class="{ relative: type === 'password' }">
      <input
        :id="id"
        :type="computedType"
        :value="modelValue"
        @input="handleInput"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :readonly="readonly"
        v-bind="$attrs" :class="{
          'border-red-500 focus:border-red-500 focus:ring-red-500/10': hasError,
          'dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800': true,
        }"
      />
      <span
        v-if="type === 'password'"
        @click="togglePasswordVisibility"
        class="absolute z-30 text-gray-500 -translate-y-1/2 cursor-pointer right-4 top-1/2 dark:text-gray-400"
      >
        <svg
          v-if="!showPassword"
          class="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92328 9.70241C4.86804 7.26761 7.23361 5.54297 10.0002 5.54297C12.7667 5.54297 15.1323 7.26762 16.0771 9.70243C15.1323 12.1372 12.7667 13.8619 10.0002 13.8619ZM10.0002 4.04297C6.48191 4.04297 3.49489 6.30917 2.41550 9.4593C2.36150 9.61687 2.36150 9.78794 2.41549 9.94552C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C13.5184 15.3619 16.5055 13.0957 17.5849 9.94555C17.6389 9.78797 17.6389 9.61690 17.5849 9.45932C16.5055 6.30919 13.5184 4.04297 10.0002 4.04297ZM9.99151 7.84413C8.96527 7.84413 8.13333 8.67606 8.13333 9.70231C8.13333 10.7286 8.96527 11.5605 9.99151 11.5605H10.0064C11.0326 11.5605 11.8646 10.7286 11.8646 9.70231C11.8646 8.67606 11.0326 7.84413 10.0064 7.84413H9.99151Z"
            fill="#98A2B3"
          />
        </svg>
        <svg
          v-else
          class="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M4.63803 3.57709C4.34513 3.28420 3.87026 3.28420 3.57737 3.57709C3.28447 3.86999 3.28447 4.34486 3.57737 4.63775L4.85323 5.91362C3.74609 6.84199 2.89363 8.06395 2.41550 9.45936C2.36150 9.61694 2.36150 9.78801 2.41549 9.94558C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C11.2550 15.3619 12.4422 15.0737 13.4994 14.5598L15.3625 16.4229C15.6554 16.7158 16.1302 16.7158 16.4231 16.4229C16.7160 16.1300 16.7160 15.6551 16.4231 15.3622L4.63803 3.57709ZM12.3608 13.4212L10.4475 11.5079C10.3061 11.5423 10.1584 11.5606 10.0064 11.5606H9.99151C8.96527 11.5606 8.13333 10.7286 8.13333 9.70237C8.13333 9.54610 8.15262 9.39434 8.18895 9.24933L5.91885 6.97923C5.03505 7.69015 4.34057 8.62704 3.92328 9.70247C4.86803 12.1373 7.23361 13.8619 10.0002 13.8619C10.8326 13.8619 11.6287 13.7058 12.3608 13.4212ZM16.0771 9.70249C15.7843 10.4569 15.3552 11.1432 14.8199 11.7311L15.8813 12.7925C16.6329 11.9813 17.2187 11.0143 17.5849 9.94561C17.6389 9.78803 17.6389 9.61696 17.5849 9.45938C16.5055 6.30925 13.5184 4.04303 10.0002 4.04303C9.13525 4.04303 8.30244 4.17999 7.52218 4.43338L8.75139 5.66259C9.15560 5.58413 9.57311 5.54303 10.0002 5.54303C12.7667 5.54303 15.1323 7.26768 16.0771 9.70249Z"
            fill="#98A2B3"
          />
        </svg>
      </span>
    </div>
    <p v-if="hasError" v-motion-bounce class="mt-1 text-sm text-red-600 dark:text-red-400">
      {{ errors[0] }}
    </p>
    <slot name="helperText"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, useAttrs } from 'vue' // Tambahkan useAttrs

interface InputFieldProps {
  id: string
  label?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' // Tambahkan tipe input lainnya
  placeholder?: string
  modelValue: string | number | null // Gunakan 'null' agar sesuai dengan 'initialValues' VeeValidate
  errors?: string[] // Prop untuk menerima array pesan error (sudah benar)
  required?: boolean
  autocomplete?: string // Untuk autocomplete browser
  disabled?: boolean
  readonly?: boolean
}

// Gunakan withDefaults untuk memberikan nilai default pada props
const props = withDefaults(defineProps<InputFieldProps>(), {
  type: 'text',
  label: '',
  placeholder: '',
  errors: () => [], // Default ke array kosong (sudah benar)
  required: false,
  autocomplete: 'off',
  disabled: false,
  readonly: false,
  modelValue: null, // Nilai default untuk modelValue
})

const emit = defineEmits(['update:modelValue'])

// useAttrs() sudah Anda tambahkan. Ini adalah cara yang benar untuk meneruskan atribut non-prop.
const attrs = useAttrs()

// Destructure props agar reaktif. `errors` dan `type` sudah benar.
const { errors, type } = toRefs(props)

const showPassword = ref(false)

const computedType = computed(() => {
  return type.value === 'password' && showPassword.value ? 'text' : type.value
})

// `hasError` akan true jika array `errors` tidak kosong
const hasError = computed(() => errors.value && errors.value.length > 0)

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}
</script>

<style scoped>
/* Anda bisa menambahkan styling tambahan di sini jika diperlukan */
</style>