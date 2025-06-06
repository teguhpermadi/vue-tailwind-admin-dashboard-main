// src/services/authService.ts
import api from './api'

export interface LoginPayload {
  email: string
  password: string
}

export interface User {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  user: User
  token: string
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', payload)

  const data = response.data.data // ambil dari data.data
  const token = data.token
  const user = data.user

  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))

  return {
    user,
    token,
  }
}

export const register = async (data: {
  name: string
  email: string
  password: string
  password_confirmation: string
}) => {
  const response = await api.post('/auth/register', {
    ...data,
    token: 'daftar-bebas-token', // Ubah kalau backend butuh token unik (atau hilangkan jika tidak wajib)
  })
  return response.data
}

export const logout = () => {
  localStorage.removeItem('token')
}

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token')
}
