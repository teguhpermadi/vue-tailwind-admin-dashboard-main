// src/schemas/teacherSchema.ts
import { z } from 'zod';
import { useI18n } from 'vue-i18n'; // Impor useI18n

// Kita akan mengekspor sebuah fungsi yang mengembalikan skema.
// Ini memungkinkan kita memanggil useI18n() di dalamnya,
// yang akan mendapatkan instance i18n yang benar di lingkungan Vue.
export const teacherSchema = () => {
  const { t } = useI18n(); // Dapatkan fungsi terjemahan 't'

  return z.object({
    // Aturan validasi untuk 'name'
    name: z.string()
      .min(1, t('validation.required', { field: t('common.name') })) // Gunakan terjemahan
      .min(3, t('validation.min_length', { field: t('common.name'), min: 3 })), // Gunakan terjemahan

    // Aturan validasi untuk 'gender'
    gender: z.enum(['male', 'female'], {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          // Gunakan terjemahan untuk pesan error invalid enum
          return { message: t('validation.invalid_gender') };
        }
        return { message: ctx.defaultError };
      },
    }),
  });
};

// Inferensi tipe dari skema Zod yang dikembalikan oleh fungsi.
// Gunakan ReturnType<typeof createTeacherSchema> untuk mendapatkan tipe dari hasil fungsi.
export type TeacherFormValues = z.infer<ReturnType<typeof teacherSchema>>;