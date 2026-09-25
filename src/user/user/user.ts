export class User {
  idUser: number;
  userName: string;
  password: string;
  token: string;

  constructor(
    idUser: number,
    userName: string,
    password: string,
    token: string = '',
  ) {
    this.idUser = idUser;
    this.userName = userName;
    this.password = password;
    this.token = token;
  }
}