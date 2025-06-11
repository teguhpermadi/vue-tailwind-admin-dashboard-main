// src/schemas/teacherSchema.ts
import { z } from 'zod';

export const teacherSchema = z.object({
  // Aturan validasi untuk 'name'
  // Harus berupa string, tidak boleh kosong, dan minimal 3 karakter
  name: z.string()
    .min(1, 'Nama guru tidak boleh kosong.')
    .min(3, 'Nama guru minimal 3 karakter.'),

  // Aturan validasi untuk 'gender'
  // Harus berupa string yang hanya boleh 'male' atau 'female'
  gender: z.enum(['male', 'female'], {
    errorMap: (issue, ctx) => {
      if (issue.code === z.ZodIssueCode.invalid_enum_value) {
        return { message: 'Jenis kelamin harus Laki-laki atau Perempuan.' };
      }
      return { message: ctx.defaultError };
    },
  }),
});

// Inferensi tipe dari skema Zod.
// Ini akan secara otomatis membuat tipe TypeScript berdasarkan skema di atas.
export type TeacherFormValues = z.infer<typeof teacherSchema>;