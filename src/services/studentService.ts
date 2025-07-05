// src/services/studentService.ts
import api from './api'; // Pastikan ini mengarah ke instance Axios Anda yang sudah dikonfigurasi

// --- Interfaces ---

// Re-use AcademicYear interface if it's identical
export interface AcademicYear {
  id: string;
  year: string;
  semester: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  name: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface StudentGrade {
  id: string;
  academic_year_id: string;
  student_id: string;
  grade_id: string;
  academic_year: AcademicYear; // Nested academic year
  grade: Grade;               // Nested grade
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  gender: string;
  nisn: number; // Nomor Induk Siswa Nasional
  nis: number;  // Nomor Induk Siswa
  grades: StudentGrade[]; // Relasi dengan StudentGrade (many-to-many through pivot)
  created_at: string;
  updated_at: string;
  deleted_at?: string; // Untuk soft delete
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

export interface StudentsResponse {
  status: string;
  data: Student[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface SingleStudentResponse {
  status: string;
  data: Student;
  message?: string;
}

// Interface for import validation errors (re-used from teacherService)
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

// Payload untuk membuat siswa baru
export type CreateStudentPayload = Omit<Student, 'id' | 'grades' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Payload untuk memperbarui siswa (bisa parsial)
export type UpdateStudentPayload = Partial<Omit<Student, 'id' | 'grades' | 'created_at' | 'updated_at' | 'deleted_at'>>;

// --- Service Functions ---

/**
 * Mengambil daftar semua siswa dari API dengan dukungan pagination, filter (berdasarkan kolom), dan sorting.
 *
 * @param page Halaman yang diminta (opsional, default 1).
 * @param perPage Jumlah item per halaman (opsional, default 10).
 * @param filters Objek yang berisi key-value pair untuk filter (misal: `{ name: 'John Doe', nis: '12345' }`). Ini akan dikirim sebagai `filter[key]=value`.
 * @param sort Kunci kolom untuk pengurutan (opsional, misal: 'name' atau '-created_at').
 * @returns Promise yang resolve dengan objek StudentsResponse.
 * @throws Error jika permintaan API gagal.
 */
export const fetchStudents = async (
  page: number = 1,
  perPage: number = 10,
  filters: Record<string, string> = {},
  sort: string = ''
): Promise<StudentsResponse> => {
  try {
    const params: Record<string, any> = { page, per_page: perPage };

    for (const key in filters) {
      if (Object.prototype.hasOwnProperty.call(filters, key) && filters[key]) {
        params[`filter[${key}]`] = filters[key];
      }
    }

    if (sort) {
      params.sort = sort;
    }

    const response = await api.get<StudentsResponse>('/students', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching students:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mengambil detail satu siswa berdasarkan ID.
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param id ID (ULID) dari siswa yang akan diambil.
 * @returns Promise yang resolve dengan objek SingleStudentResponse.
 * @throws Error jika permintaan API gagal (misal: siswa tidak ditemukan, tidak ada izin).
 */
export const fetchStudentById = async (id: string): Promise<SingleStudentResponse> => {
  try {
    const response = await api.get<SingleStudentResponse>(`/students/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching student with ID ${id}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Membuat siswa baru.
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param studentData Objek yang berisi data siswa yang akan dibuat.
 * @returns Promise yang resolve dengan objek SingleStudentResponse (data siswa yang baru dibuat).
 * @throws Error jika validasi gagal atau ada masalah saat membuat siswa.
 */
export const createStudent = async (studentData: CreateStudentPayload): Promise<SingleStudentResponse> => {
    try {
        const response = await api.post<SingleStudentResponse>('/students', studentData);
        return response.data;
    } catch (error: any) {
        console.error('Error creating student:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Mengupdate data siswa yang sudah ada.
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param id ID (ULID) dari siswa yang akan diupdate.
 * @param studentData Objek yang berisi data siswa yang akan diupdate (bisa parsial).
 * @returns Promise yang resolve dengan objek SingleStudentResponse (data siswa yang diupdate).
 * @throws Error jika validasi gagal atau ada masalah saat mengupdate siswa.
 */
export const updateStudent = async (id: string, studentData: UpdateStudentPayload): Promise<SingleStudentResponse> => {
    try {
        const response = await api.put<SingleStudentResponse>(`/students/${id}`, studentData);
        return response.data;
    } catch (error: any) {
        console.error(`Error updating student with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus siswa (biasanya soft delete di backend Laravel jika menggunakan trait SoftDeletes).
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param id ID (ULID) dari siswa yang akan dihapus.
 * @returns Promise<void> jika penghapusan berhasil (backend biasanya mengembalikan 204 No Content).
 * @throws Error jika ada masalah saat menghapus siswa.
 */
export const deleteStudent = async (id: string): Promise<void> => {
    try {
        await api.delete(`/students/${id}`);
    } catch (error: any) {
        console.error(`Error deleting student with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus beberapa siswa secara bulk (biasanya soft delete di backend Laravel jika menggunakan trait SoftDeletes).
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param studentIds Array of IDs (ULID) dari siswa yang akan dihapus secara bulk.
 * @returns Promise<void> jika penghapusan berhasil (backend biasanya mengembalikan 204 No Content).
 * @throws Error jika ada masalah saat menghapus beberapa siswa secara bulk.
 */
export const deleteMultipleStudents = async (studentIds: string[]): Promise<void> => {
  try {
    await api.delete('/students/bulk-delete', { data: { ids: studentIds } });
  } catch (error: any) {
    console.error(`Error deleting multiple students with IDs ${studentIds.join(', ')}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mengembalikan siswa yang dihapus secara soft (jika backend menggunakan Soft Deletes).
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param id ID (ULID) dari siswa yang akan dikembalikan.
 * @returns Promise yang resolve dengan objek SingleStudentResponse (data siswa yang dikembalikan).
 * @throws Error jika ada masalah saat mengembalikan siswa.
 */
export const restoreStudent = async (id: string): Promise<SingleStudentResponse> => {
    try {
        const response = await api.post<SingleStudentResponse>(`/students/${id}/restore`);
        return response.data;
    } catch (error: any) {
        console.error(`Error restoring student with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Menghapus siswa secara permanen dari database (force delete).
 * Membutuhkan permission yang sesuai dari backend.
 *
 * @param id ID (ULID) dari siswa yang akan dihapus permanen.
 * @returns Promise<void> jika penghapusan berhasil.
 * @throws Error jika ada masalah saat menghapus permanen siswa.
 */
export const forceDeleteStudent = async (id: string): Promise<void> => {
    try {
        await api.delete(`/students/${id}/force-delete`);
    } catch (error: any) {
        console.error(`Error force deleting student with ID ${id}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Mengekspor data siswa ke file Excel dari API.
 * @returns Promise<Blob> Blob yang berisi data file Excel.
 * @throws Error jika permintaan API gagal.
 */
export const exportStudents = async (): Promise<Blob> => {
  try {
    const response = await api.get('/students/export', {
      responseType: 'blob', // Penting: memberitahu Axios untuk mengharapkan respons biner (file)
    });
    return response.data; // Ini akan menjadi Blob
  } catch (error: any) {
    console.error('Error exporting students:', error.response?.data || error.message);
    throw error; // Biarkan komponen pemanggil menangani error
  }
};

/**
 * Mengimpor data siswa dari file Excel ke API.
 * @param file Objek File yang akan diunggah (misal: dari input type="file").
 * @returns Promise<any> Respons dari API (biasanya berisi pesan sukses).
 * @throws Error jika permintaan API gagal, termasuk error validasi dari backend.
 */
export const importStudents = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file); // 'file' harus sesuai dengan nama input di backend (request->file('file'))

    const response = await api.post('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Sangat penting untuk upload file
      },
    });
    return response.data; // Berisi pesan sukses dari backend
  } catch (error: any) {
    console.error('Error importing students:', error.response?.data || error.message);
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
 * Mengunduh template Excel kosong untuk impor data siswa dari API.
 * @returns Promise<Blob> Blob yang berisi data file Excel template.
 * @throws Error jika permintaan API gagal.
 */
export const downloadStudentTemplate = async (): Promise<Blob> => {
  try {
    const response = await api.get('/students/template', {
      responseType: 'blob', // Penting: memberitahu Axios untuk mengharapkan respons biner (file)
    });
    return response.data; // Ini akan menjadi Blob
  } catch (error: any) {
    console.error('Error downloading student template:', error.response?.data || error.message);
    throw error; // Biarkan komponen pemanggil menangani error
  }
};
