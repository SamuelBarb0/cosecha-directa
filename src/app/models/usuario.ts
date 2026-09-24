export interface Usuario {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string;
}

export interface Sesion {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}
