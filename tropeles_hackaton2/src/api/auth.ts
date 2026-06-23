import { apiFetch } from './client';
import type { LoginResponse, User } from '../types/api';
export function login(teamCode: string, email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ teamCode, email, password }),
  });
}
export function getMe() {
  return apiFetch<User>('/auth/me');
}
