import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Không có token');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token không đúng định dạng');
    }

    try {
      this.jwtService.verify(token, {
        secret: 'baitap2_secret_key',
      });

      next();
    } catch {
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc đã hết hạn',
      );
    }
  }
}