import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './config';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql', ...dbConfig,
      entities: [Order, OrderItem], synchronize: false,
      options: { encrypt: false, trustServerCertificate: true },
    }),
    TypeOrmModule.forFeature([Order, OrderItem]),
    JwtModule.register({ secret: 'baitap2_secret_key' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, JwtAuthGuard],
})
export class AppModule {}
