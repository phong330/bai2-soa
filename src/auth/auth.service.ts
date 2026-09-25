import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user/user';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(userName: string, password: string) {
    // Password 123456 đã được client chuyển thành Base64: MTIzNDU2
    const user = new User(
      1,
      'admin',
      'MTIzNDU2',
    );

    if (userName !== user.userName || password !== user.password) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    const payload = {
      idUser: user.idUser,
      userName: user.userName,
    };

    user.token = this.jwtService.sign(payload);

    return {
      message: 'Đăng nhập thành công',
      token: user.token,
    };
  }
}