// src/services/profileService.ts
import api from './api'; // Pastikan ini mengarah ke instance Axios Anda yang sudah dikonfigurasi

// --- Interfaces ---

// Interface untuk data User dasar
export interface UserData {
  id: string;
  name: string;
  email: string;
  userable_id: string | null;
  userable_type: string | null;
  created_at: string;
  updated_at: string;
}

// Interface untuk profil Teacher
export interface TeacherProfile {
  id: string;
  name: string;
  gender: string; // 'male' atau 'female'
  // Tambahkan properti lain dari model Teacher Anda jika relevan
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Interface untuk profil Student
export interface StudentProfile {
  id: string;
  name: string;
  gender: string; // 'L' atau 'P'
  nisn: string;
  nis: string;
  // Tambahkan properti lain dari model Student Anda jika relevan
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Interface untuk UserProfile lengkap, termasuk userable (polymorphic)
// 'userable' bisa berupa TeacherProfile atau StudentProfile atau null
export interface UserProfile extends UserData {
  userable?: TeacherProfile | StudentProfile | null;
}

// Response API untuk fetch user profile
export interface UserProfileResponse {
  data: UserProfile;
  message?: string; // Opsional jika API mengembalikan pesan
}

// Response API untuk link profile
export interface LinkProfileResponse {
  message: string;
  user: UserProfile; // Mengembalikan user yang sudah ditautkan
}

// Payload untuk request link profile
export interface LinkProfilePayload {
  token: string;
}

// --- Service Functions ---

/**
 * Mengambil data profil user yang sedang login dari API.
 * Asumsi endpoint /api/user akan mengembalikan UserResource yang sudah memuat relasi userable.
 *
 * @returns Promise<UserProfile> Objek profil user.
 * @throws Error jika permintaan API gagal.
 */
export const fetchUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get<UserProfileResponse>('/user');
    return response.data.data; // Mengakses properti 'data' dari respons
  } catch (error: any) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mengirim token untuk menautkan akun user yang sedang login dengan profil (Teacher/Student).
 * Asumsi endpoint /api/link-profile akan menerima token di body request.
 *
 * @param payload Objek berisi token penautan.
 * @returns Promise<LinkProfileResponse> Respons dari API.
 * @throws Error jika permintaan API gagal atau validasi token.
 */
export const linkProfileAccount = async (payload: LinkProfilePayload): Promise<LinkProfileResponse> => {
  try {
    const response = await api.post<LinkProfileResponse>('/link-profile', payload);
    return response.data;
  } catch (error: any) {
    console.error('Error linking profile account:', error.response?.data || error.message);
    throw error;
  }
};
