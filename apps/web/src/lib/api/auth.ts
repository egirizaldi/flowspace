import { apiClient, ApiSuccessResponse } from '../api-client';
import { RegisterInput, LoginInput, SafeUser } from '@flowspace/shared';

export const authApi = {
  register: (data: RegisterInput): Promise<ApiSuccessResponse<SafeUser>> =>
    apiClient.post<SafeUser>('/auth/register', data),

  login: (data: LoginInput): Promise<ApiSuccessResponse<SafeUser>> =>
    apiClient.post<SafeUser>('/auth/login', data),

  logout: (): Promise<ApiSuccessResponse<void>> =>
    apiClient.post<void>('/auth/logout'),

  getMe: (): Promise<ApiSuccessResponse<SafeUser>> =>
    apiClient.get<SafeUser>('/auth/me'),
};
