export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    nombre: string;
    email: string;
  };
}