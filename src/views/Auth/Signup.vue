<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 w-full lg:w-1/2">
          <div class="w-full max-w-md pt-10 mx-auto">
            <router-link
              to="/"
              class="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg
                class="stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                  stroke=""
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Back to dashboard
            </router-link>
          </div>
          <!-- Form -->
          <div class="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div v-motion-bounce class="mb-5 sm:mb-8">
              <h1
                class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md"
              >
                Sign Up
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign up!
              </p>
            </div>
            <div>
              <!-- errors -->
              <div v-if="generalError" class="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">
                {{ generalError }}
              </div>

              <form @submit.prevent="handleSubmit">
                <div class="space-y-5">
                  <!-- Name -->
                  <InputField
                    id="fullname"
                    label="Name"
                    type="text"
                    placeholder="Enter your full name"
                    v-model="name"
                    :errors="errors.name"
                    required
                  />

                  <!-- email -->
                  <InputField
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    v-model="email"
                    :errors="errors.email"
                    required
                  />

                  <!-- password -->
                  <InputField
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    v-model="password"
                    :errors="errors.password"
                    required
                  />

                  <!-- password confirmation -->
                  <InputField
                    id="passwordConfirmation"
                    label="Password Confirmation"
                    type="password"
                    placeholder="Confirm your password"
                    v-model="passwordConfirmation"
                    :errors="errors.password_confirmation"
                    required
                  />
                  <!-- Checkbox -->
                  <div>
                    <div>
                      <label
                        for="checkboxLabelOne"
                        class="flex items-start text-sm font-normal text-gray-700 cursor-pointer select-none dark:text-gray-400"
                      >
                        <div class="relative">
                          <input
                            v-model="agreeToTerms"
                            type="checkbox"
                            id="checkboxLabelOne"
                            class="sr-only"
                          />
                          <div
                            :class="
                              agreeToTerms
                                ? 'border-brand-500 bg-brand-500'
                                : 'bg-transparent border-gray-300 dark:border-gray-700'
                            "
                            class="mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px]"
                          >
                            <span :class="agreeToTerms ? '' : 'opacity-0'">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                  stroke="white"
                                  stroke-width="1.94437"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                        <p class="inline-block font-normal text-gray-500 dark:text-gray-400">
                          By creating an account means you agree to the
                          <span class="text-gray-800 dark:text-white/90">
                            Terms and Conditions,
                          </span>
                          and our
                          <span class="text-gray-800 dark:text-white"> Privacy Policy </span>
                        </p>
                      </label>
                    </div>
                  </div>
                  <!-- Button -->
                  <div>
                    <button
                      type="submit"
                      :disabled="loading"
                      class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <Spinner v-if="loading" />
                      <span v-if="loading">Loading</span>
                      <span v-else>Sign Up</span>
                    </button>
                  </div>
                </div>
              </form>
              <div class="mt-5">
                <p
                  class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start"
                >
                  Already have an account?
                  <router-link
                    to="/signin"
                    class="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    >Sign In</router-link
                  >
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          class="relative items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid"
        >
          <div class="flex items-center justify-center z-1">
            <common-grid-shape />
            <div class="flex flex-col items-center max-w-xs">
              <router-link to="/" class="block mb-4">
                <img width="{231}" height="{48}" src="/images/logo/auth-logo.svg" alt="Logo" />
              </router-link>
              <p class="text-center text-gray-400 dark:text-white/60">
                Free and Open-Source Tailwind CSS Admin Dashboard Template
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import CommonGridShape from '@/components/common/CommonGridShape.vue'
import InputField from '@/components/forms/InputField.vue' // Import komponen baru
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { register } from '@/services/authService'
import { useRouter } from 'vue-router'
import Spinner from '@/components/common/Spinner.vue'

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const showPasswordConfirmation = ref(false)
const agreeToTerms = ref(false)
const router = useRouter()
const loading = ref(false)

// Ini akan menyimpan error spesifik per field
const errors = ref<Record<string, string[]>>({}) // Objek untuk menyimpan array pesan error per field
const generalError = ref<string | null>(null) // Untuk pesan error umum (misal: "Register failed")

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const togglePasswordConfirmationVisibility = () => {
  showPasswordConfirmation.value = !showPasswordConfirmation.value
}

const handleSubmit = async () => {
  // Reset semua error setiap kali form disubmit
  errors.value = {}
  generalError.value = null
  loading.value = true
  // Implement form submission logic here
  try {
    const { user } = await register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    router.push('/signin') // Ganti sesuai rute dashboard kamu
  } catch (err: any) {
    // Tangani error dari API
    if (err.response && err.response.data) {
      if (err.response.data.errors) {
        // Ini adalah validation errors dari Laravel (status 422 Unprocessable Entity)
        errors.value = err.response.data.errors
        generalError.value = err.response.data.message || 'There are validation errors.' // Pesan umum validasi
      } else if (err.response.data.message) {
        // Ini adalah error umum lainnya dari API (misal: "Unauthorized", "Not Found")
        generalError.value = err.response.data.message
      } else {
        generalError.value = 'An unexpected API error occurred.'
      }
    } else {
      // Ini adalah error jaringan atau error lain sebelum mencapai API
      generalError.value = 'Network error or server unreachable. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>
