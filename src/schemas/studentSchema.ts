// src/schemas/studentSchema.ts
import { z } from 'zod';
import { useI18n } from 'vue-i18n'; // Impor useI18n

// Kita akan mengekspor sebuah fungsi yang mengembalikan skema.
// Ini memungkinkan kita memanggil useI18n() di dalamnya,
// yang akan mendapatkan instance i18n yang benar di lingkungan Vue.
export const studentSchema = () => {
  const { t } = useI18n(); // Dapatkan fungsi terjemahan 't'

  return z.object({
    // Aturan validasi untuk 'name' (Nama Siswa)
    name: z.string()
      .min(1, t('validation.required', { field: t('common.name') })) // 'Nama' wajib diisi
      .min(3, t('validation.min_length', { field: t('common.name'), min: 3 })), // Minimal 3 karakter

    // Aturan validasi untuk 'gender' (Jenis Kelamin)
    gender: z.enum(['male', 'female'], { // Diasumsikan 'L' untuk Laki-laki dan 'P' untuk Perempuan
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          return { message: t('validation.invalid_gender') }; // Pesan error untuk jenis kelamin tidak valid
        }
        return { message: ctx.defaultError };
      },
    }),

    // Aturan validasi untuk 'nisn' (Nomor Induk Siswa Nasional)
    nisn: z.string()
      .min(1, t('validation.required', { field: t('student.nisn') })) // 'NISN' wajib diisi
      .regex(/^\d{10}$/, t('validation.invalid_nisn')) // Asumsi NISN adalah 10 digit angka
      .optional() // Opsional jika NISN tidak selalu wajib
      .or(z.literal('')), // Memungkinkan string kosong jika optional

    // Aturan validasi untuk 'nis' (Nomor Induk Siswa)
    nis: z.string()
      .min(1, t('validation.required', { field: t('student.nis') })) // 'NIS' wajib diisi
      .regex(/^\d{8}$/, t('validation.invalid_nis')) // Asumsi NIS adalah 8 digit angka
      .optional() // Opsional jika NIS tidak selalu wajib
      .or(z.literal('')), // Memungkinkan string kosong jika optional
  });
};

// Inferensi tipe dari skema Zod yang dikembalikan oleh fungsi.
// Gunakan ReturnType<typeof studentSchema> untuk mendapatkan tipe dari hasil fungsi.
export type StudentFormValues = z.infer<ReturnType<typeof studentSchema>>;
