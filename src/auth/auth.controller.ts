import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body('userName') userName: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(userName, password);
  }

  @Get('auth')
  auth() {
    return {
      message: 'Hello World',
    };
  }
}