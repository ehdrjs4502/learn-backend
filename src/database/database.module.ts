import { Global, Module } from '@nestjs/common';
import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile.js'; // knexfile의 접속 설정을 그대로 재사용(중복 방지)

// 주입할 때 쓸 "이름표"(토큰). Knex는 우리가 만든 class가 아니라서
// 타입만으로는 못 찾음 → 문자열 토큰으로 콕 집어 주입한다.
export const KNEX = 'KNEX_CONNECTION';

@Global() // 이 모듈을 앱 전체에 공개 → 어느 서비스든 KNEX를 주입받을 수 있음(매번 import 불필요)
@Module({
  providers: [
    {
      provide: KNEX, // "KNEX라는 이름표로"
      useFactory: (): Knex => knex(knexConfig), // "이 함수가 만든 연결 객체를 제공하라"
    },
  ],
  exports: [KNEX], // 다른 모듈이 쓸 수 있게 밖으로 내보냄
})
export class DatabaseModule {}
