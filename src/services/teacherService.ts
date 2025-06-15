// src/services/teacherService.ts
import api from './api'; // Pastikan ini mengarah ke instance Axios Anda yang sudah dikonfigurasi

// --- Interfaces ---
export interface AcademicYear {
  id: string;
  year: string;
  semester: string;
  teacher_id: string;
  teacher: any;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherSubject {
  id: string;
  academic_year_id: string;
  teacher_id: string;
  subject_id: string;
  academic_year: AcademicYear;
  teacher: any;
  subject: Subject;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  name: string;
  gender: string;
  subject_count: string;
  subjects: TeacherSubject[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PaginationMeta {
  current_page: string;
  from: string;
  last_page: string;
  per_page: string;
  to: string;
  total: string;
}

export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export interface TeachersResponse {
  status: string;
  data: Teacher[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface SingleTeacherResponse {
  status: string;
  data: Teacher;
  message?: string;
}

// NEW: Interface for import validation errors
export interface ImportValidationError {
  row: number;
  attribute: string;
  errors: string[];
  values: Record<string, any>;
}

export interface ImportErrorResponse {
    message: string;
    errors: ImportValidationError[];
}

export type CreateTeacherPayload = Omit<Teacher, 'id' | 'subjects' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type UpdateTeacherPayload = Partial<Omit<Teacher, 'id' | 'subjects' | 'created_at' | 'updated_at' | 'deleted_at'>>;

// --- Service Functions ---

/**
 * Mengambil daftar semua guru dari API dengan dukungan pagination, filter (berdasarkan kolom), dan sorting.
 *
 * @param page Halaman yang diminta (opsional, default 1).
 * @param perPage Jumlah item per halaman (opsional, default 10).
 * @param filters Objek yang berisi key-value pair untuk filter (misal: `{ name: 'teguh', email: 'mail.com' }`). Ini akan dikirim sebagai `filter[key]=value`.
 * @param sortBy Kunci kolom untuk pengurutan (opsional).
 * @param sortDirection Arah pengurutan ('asc' | 'desc', opsional).
 * @returns Promise yang resolve dengan objek TeachersResponse.
 * @throws Error jika permintaan API gagal.
 */
export const fetchTeachers = async (
  page: number = 1,
  perPage: number = 10,
  filters: Record<string, string> = {},
  sort: string = '' // <--- PERUBAHAN DI SINI: Hanya satu parameter 'sort'
): Promise<TeachersResponse> => {
  try {
    const params: Record<string, any> = { page, per_page: perPage };

    for (const key in filters) {
      if (Object.prototype.hasOwnProperty.call(filters, key) && filters[key]) {
        params[`filter[${key}]`] = filters[key];
      }
    }

    if (sort) { // <--- PERUBAHAN DI SINI: Hanya menambahkan 'sort' jika ada
      params.sort = sort;
    }

    const response = await api.get<TeachersResponse>('/teachers', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching teachers:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mengambil detail satu guru berdasarkan ID.
 * Membutuhkan permission seperti 'view-teacher' dari backend.
 *
 * @param id ID (ULID) dari guru yang akan diambil.
 * @returns Promise yang resolve dengan objek SingleTeacherResponse.
 * @throws Error jika permintaan API gagal (misal: guru tidak ditemukan, tidak ada izin).
 */
export const fetchTeacherById = async (id: string): Promise<SingleTeacherResponse> => {
  try {
    const response = await api.get<SingleTeacherResponse>(`/teachers/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching teacher with ID ${id}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Membuat guru baru.
 * Membutuhkan permission seperti 'create-teacher' dari backend.
 *
 * @param teacherData Objek yang berisi data guru yang akan dibuat.
 * @returns Promise yang resolve dengan objek SingleTeacherResponse (data guru yang baru dibuat).
 * @throws Error jika validasi gagal atau ada masalah saat membuat guru.
 */
export const createTeacher = async (teacherData: CreateTeacherPayload): Promise<SingleTeacherResponse> => {
    try {
        const response = await api.post<SingleTeacherResponse>('/teachers', teacherData);
        return response.data;
    } catch (error: any) {
        console.error('Error creating teacher:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Mengupdate data guru yang sudah ada.
 * Membutuhkan permission seperti 'update-teacher' dari backend.
 *
 * @param id ID (ULID) dari guru yang akan diupdate.
 * @param teacherData Objek yang berisi data guru yang akan diupdate (bisa parsial).
 * @returns Promise yang resolve dengan objek SingleTeacherResponse (data guru yang diupdate).
 * @throws Error jika validasi gagal atau ada masalah saat mengupdate guru.
 */
export const updateTeacher = async (id: string, teacherData: UpdateTeacherPayload): Promise<SingleTeacherResponse> => {
    try {
        const response = await api.put<SingleTeacherResponse>(`/teachers/${id}`, teacherData);
        return response.data;
    } catch (error: any) {
        console.error(`Error updating teacher with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus guru (biasanya soft delete di backend Laravel jika menggunakan trait SoftDeletes).
 * Membutuhkan permission seperti 'delete-teacher' dari backend.
 *
 * @param id ID (ULID) dari guru yang akan dihapus.
 * @returns Promise<void> jika penghapusan berhasil (backend biasanya mengembalikan 204 No Content).
 * @throws Error jika ada masalah saat menghapus guru.
 */
export const deleteTeacher = async (id: string): Promise<void> => {
    try {
        await api.delete(`/teachers/${id}`);
    } catch (error: any) {
        console.error(`Error deleting teacher with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus beberapa guru secara bulk (biasanya soft delete di backend Laravel jika menggunakan trait SoftDeletes).
 * Membutuhkan permission seperti 'delete-teacher' dari backend.
 *
 * @param teacherIds Array of IDs (ULID) dari guru yang akan dihapus secara bulk.
 * @returns Promise<void> jika penghapusan berhasil (backend biasanya mengembalikan 204 No Content).
 * @throws Error jika ada masalah saat menghapus beberapa guru secara bulk.
 */
export const deleteMultipleTeachers = async (teacherIds: string[]): Promise<void> => {
  try {
    await api.delete('/teachers/bulk-delete', { data: { ids: teacherIds } });
  } catch (error: any) {
    console.error(`Error deleting multiple teachers with IDs ${teacherIds.join(', ')}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mengembalikan guru yang dihapus secara soft (jika backend menggunakan Soft Deletes).
 * Membutuhkan permission seperti 'restore-teacher' dari backend.
 *
 * @param id ID (ULID) dari guru yang akan dikembalikan.
 * @returns Promise yang resolve dengan objek SingleTeacherResponse (data guru yang dikembalikan).
 * @throws Error jika ada masalah saat mengembalikan guru.
 */
export const restoreTeacher = async (id: string): Promise<SingleTeacherResponse> => {
    try {
        const response = await api.post<SingleTeacherResponse>(`/teachers/${id}/restore`);
        return response.data;
    } catch (error: any) {
        console.error(`Error restoring teacher with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus guru secara permanen dari database (force delete).
 * Membutuhkan permission seperti 'forceDelete-teacher' dari backend.
 *
 * @param id ID (ULID) dari guru yang akan dihapus permanen.
 * @returns Promise<void> jika penghapusan berhasil.
 * @throws Error jika ada masalah saat menghapus permanen guru.
 */
export const forceDeleteTeacher = async (id: string): Promise<void> => {
    try {
        await api.delete(`/teachers/${id}/force-delete`);
    } catch (error: any) {
        console.error(`Error force deleting teacher with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Mengekspor data guru ke file Excel dari API.
 * @returns Promise<Blob> Blob yang berisi data file Excel.
 * @throws Error jika permintaan API gagal.
 */
export const exportTeachers = async (): Promise<Blob> => {
  try {
    const response = await api.get('/teachers/export', {
      responseType: 'blob', // Penting: memberitahu Axios untuk mengharapkan respons biner (file)
    });
    return response.data; // Ini akan menjadi Blob
  } catch (error: any) {
    console.error('Error exporting teachers:', error.response?.data || error.message);
    throw error; // Biarkan komponen pemanggil menangani error
  }
};

/**
 * Mengimpor data guru dari file Excel ke API.
 * @param file Objek File yang akan diunggah (misal: dari input type="file").
 * @returns Promise<any> Respons dari API (biasanya berisi pesan sukses).
 * @throws Error jika permintaan API gagal, termasuk error validasi dari backend.
 */
export const importTeachers = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file); // 'file' harus sesuai dengan nama input di backend (request->file('file'))

    const response = await api.post('/teachers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Sangat penting untuk upload file
      },
    });
    return response.data; // Berisi pesan sukses dari backend
  } catch (error: any) {
    console.error('Error importing teachers:', error.response?.data || error.message);
    // Tangani error validasi spesifik dari Laravel Excel (status 422)
    if (error.response && error.response.status === 422) {
      // Melemparkan seluruh data respons error agar komponen pemanggil bisa menampilkannya
      // Misalnya, { message: "The given data was invalid.", errors: [...] }
      const errorData: ImportErrorResponse = error.response.data;
      throw errorData; // Melemparkan objek error yang sudah diparsing
    }
    throw error; // Melemparkan error lain ke komponen pemanggil
  }
};

/**
 * Mengunduh template Excel kosong untuk impor data guru dari API.
 * @returns Promise<Blob> Blob yang berisi data file Excel template.
 * @throws Error jika permintaan API gagal.
 */
export const downloadTeacherTemplate = async (): Promise<Blob> => {
  try {
    const response = await api.get('/teachers/template', {
      responseType: 'blob', // Penting: memberitahu Axios untuk mengharapkan respons biner (file)
    });
    return response.data; // Ini akan menjadi Blob
  } catch (error: any) {
    console.error('Error downloading teacher template:', error.response?.data || error.message);
    throw error; // Biarkan komponen pemanggil menangani error
  }
};