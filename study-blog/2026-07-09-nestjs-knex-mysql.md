# 프론트 개발자가 NestJS로 게시판 만들기 (5) — 메모리 배열을 MySQL + Knex로 갈아엎기

> 백엔드 학습 기록 · 단계 2 — DB & Knex
> 2026-07-09

## 들어가며

단계 1 내내 데이터를 서비스의 **메모리 배열**(`private posts = [...]`)에 담아뒀다.
편했지만 치명적 구멍이 둘 있었다: **서버 재시작하면 다 날아가고**, 서버를 여러 대 띄우면 각자 다른 배열을 갖는다.
이번엔 이걸 진짜 데이터베이스(MySQL)로 옮기고, **Knex 쿼리빌더**로 CRUD를 다시 짰다.

> **프론트 비유**: 지금까지는 `useState`로만 버티던 앱이었다. 새로고침(=서버 재시작)하면 초기화.
> 이번 작업은 그 상태를 **서버 밖 영구 저장소(DB)** 로 옮기는 것 — "새로고침해도 남는" 상태로 만드는 셈.

## 배운 개념

### 1. Knex는 "쿼리빌더", mysql2는 "드라이버"

- **`knex`**: SQL을 문자열로 손코딩하는 대신 `.select().where()` 같은 메서드 체인으로 만들어주는 도구. (ORM 아님 — 테이블을 객체로 매핑해주진 않고, SQL을 편하게 조립해줄 뿐.)
- **`mysql2`**: Node가 실제로 MySQL과 통신하는 **드라이버**. Knex는 "어떤 SQL을 만들지"만 정하고, 실제 전송은 이 드라이버가 한다.

> **프론트 비유**: `knex`는 Axios 같은 상위 API, `mysql2`는 그 밑의 `fetch`/XHR. Knex 혼자선 DB와 말 못 하고 드라이버가 있어야 한다.

### 2. 접속 정보는 `.env`로 — 순수 Node는 자동으로 안 읽어준다

DB 비밀번호를 코드에 박으면 깃에 그대로 올라가서 위험하다. 그래서 `.env`에 넣고 `.gitignore`로 제외했다.

> **프론트 비유**: Next.js의 `.env.local`과 같은 발상. **딱 하나 다른 점** — Next.js는 `.env`를 자동으로 읽어주지만, 순수 Node는 안 읽어준다. 그래서 `dotenv`로 직접 "읽어들여야" 한다(`require('dotenv').config()`).

`.env`(실제 값)는 깃에서 빼고, `.env.example`(비번 자리를 비운 견본)만 커밋해서 "이런 변수들이 필요하다"를 팀에 알린다.

### 3. knexfile — Knex에게 주는 설정표 (왜 `.js`인가)

`knexfile.js`는 Knex CLI가 읽는 설정 파일이다. ① 어느 DB에 어떻게 접속하나, ② 마이그레이션 파일을 어디 둘까를 알려준다.

**`.js`로 만든 이유**: Knex CLI는 이 설정 파일을 **Node로 그냥 실행**한다. `.ts`로 만들면 실행 전 컴파일 도구(ts-node)가 필요하고, 우리 tsconfig(`module: nodenext`) 조합에선 자주 삐끗한다. 설정 파일 하나만 `.js`로 두는 건 흔한 관례다(앱 코드는 계속 TS).

```js
require('dotenv').config();

module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT), // .env 값은 전부 문자열이라 숫자로 변환
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  migrations: { directory: './migrations' },
};
```

`port`만 `Number(...)`로 감싼 이유: **`.env`에서 읽은 값은 전부 문자열**(`"3306"`)이라 숫자로 바꿔야 한다. (프론트에서 `input` value가 항상 string으로 오는 그 함정.)

### 4. NestJS에 Knex 연결하기 — DI로 주입

접속 설정은 knexfile에만 있고, 앱(NestJS)은 이 연결을 모른다. 서비스가 쿼리를 쏘려면 Knex 인스턴스를 손에 쥐어야 한다. 단계 1에서 배운 **DI(의존성 주입)** 를 다시 쓴다.

> **프론트 비유**: React에서 `QueryClient`를 한 번 만들어 `<QueryClientProvider>`로 앱 전체에 내려주고, 컴포넌트는 `useQueryClient()`로 꺼내 쓰는 것과 같다. Knex 연결을 한 번 만들어 앱 전체에 provide → 서비스가 주입받아 사용.

```ts
// src/database/database.module.ts
export const KNEX = 'KNEX_CONNECTION'; // 주입용 "이름표"(토큰)

@Global() // 앱 전체에 공개 → 어느 서비스든 매번 import 없이 주입 가능
@Module({
  providers: [{ provide: KNEX, useFactory: (): Knex => knex(knexConfig) }],
  exports: [KNEX],
})
export class DatabaseModule {}
```

**왜 문자열 토큰(`KNEX`)이 필요한가**: 단계 1의 `AppService`는 우리가 만든 class라서 Nest가 타입만 보고 찾아줬다.
하지만 Knex는 우리가 만든 class가 아니라 **타입만으론 못 찾는다.** 그래서 문자열 이름표로 콕 집어 주입한다.

```ts
constructor(@Inject(KNEX) private readonly knex: Knex) {}
```

### 5. 마이그레이션 — DB 구조의 git

빈 DB에 테이블을 만들어야 하는데, MySQL 콘솔에 `CREATE TABLE`을 손으로 치면 나만 알고 끝난다.
마이그레이션은 "이 테이블을 이렇게 만들어라"를 **코드 파일로 남겨** 깃에 올리는 것. 누구든 `migrate:latest` 한 방으로 같은 테이블을 얻는다.

각 파일엔 `up`(적용)과 `down`(되돌리기)이 있다. `return`이 필수인데, 테이블 생성은 **비동기**라 `return`을 안 하면 Knex가 언제 끝나는지 몰라서 안 끝났는데 넘어가버린다.

```js
exports.up = function (knex) {
  return knex.schema.createTable('posts', (table) => {
    table.increments('id');                        // 자동 증가 PK
    table.string('title').notNullable();           // VARCHAR(255)
    table.text('content').notNullable();           // 긴 글은 text
    table.integer('views').notNullable().defaultTo(0);
    table.timestamps(true, true);                  // created_at, updated_at 자동
  });
};
exports.down = function (knex) {
  return knex.schema.dropTable('posts');
};
```

실행하면 `posts` 말고 `knex_migrations`(어디까지 실행했는지 기록하는 장부), `knex_migrations_lock`(동시 실행 방지)도 생긴다.

### 6. CRUD를 Knex로 — 전부 async

| 하는 일 | 메모리 배열 (전) | Knex (후) |
|---|---|---|
| 전체 조회 | `this.posts` | `await knex('posts').select('*')` |
| 단건 조회 | `.find(p => p.id === id)` | `await knex('posts').where({ id }).first()` |
| 생성 | `.push(newPost)` | `await knex('posts').insert(dto)` → `[삽입된id]` |
| 수정 | `Object.assign` | `await knex('posts').where({ id }).update(dto)` |
| 삭제 | `.filter(...)` | `await knex('posts').where({ id }).del()` |

DB는 네트워크 왕복이라 모든 쿼리가 Promise → 메서드가 전부 `async`가 됐다.
**컨트롤러는 안 바꿔도 된다** — Nest가 서비스가 돌려준 Promise를 알아서 기다려준다(프론트에서 async 함수 return하면 알아서 await되던 것과 비슷).

## 실제로 해본 것

### MySQL 환경 세팅

- 설치돼 있던 MySQL 8.0의 **root 비밀번호를 까먹어서** 재설정부터 했다(아래 삽질 참고).
- 게시판 전용 DB와 계정을 만들었다. 앱이 root를 그대로 쓰면 사고 반경이 크니 **권한 최소화**.

```sql
CREATE DATABASE learn_backend CHARACTER SET utf8mb4;      -- 한글·이모지까지 안전한 인코딩
CREATE USER 'learn'@'localhost' IDENTIFIED BY 'Board!234';
GRANT ALL PRIVILEGES ON learn_backend.* TO 'learn'@'localhost'; -- 이 DB에 대해서만
FLUSH PRIVILEGES;
```

### 마이그레이션 실행 & 확인

```bash
npx knex migrate:make create_posts   # 빈 파일 생성
npx knex migrate:latest              # 실제 실행
```

```
DESCRIBE posts;
id          int unsigned  NO  PRI  auto_increment
title       varchar(255)  NO
content     text          NO
views       int           NO       0
created_at  timestamp     NO       CURRENT_TIMESTAMP
updated_at  timestamp     NO       CURRENT_TIMESTAMP
```

### CRUD 검증 (curl → 실제 MySQL)

```
POST /posts {"title":"DB 첫 글","content":"..."}  → 201, {"id":1,"views":0,"created_at":...}
POST /posts {"title":"둘째",...}                   → 201, {"id":2,...}   ← id 자동 발급
PATCH /posts/1 {"content":"수정된 내용"}            → 200
DELETE /posts/2                                    → 200, {"deleted":true}
GET /posts/999                                     → 404, 단계1 커스텀 필터 형식 그대로 유지
```

`id`가 DB의 auto-increment로 자동 발급되면서 **단계 1의 "삭제 후 생성 시 id 충돌" 문제가 자연 해결**됐다.

### 재시작 영속성 증명

서버를 완전히 죽였다가 새로 띄운 뒤 조회했더니 데이터가 그대로 살아있었다. 메모리 배열이었으면 사라졌을 것. **이게 DB로 옮긴 진짜 이유.**

## 막혔던 점 / 삽질

### 삽질 1: root 비밀번호 분실 → `--init-file`로 재설정

접속하려는데 root 비번이 기억이 안 났다. MySQL은 이런 경우를 위한 공식 절차가 있다.
평소엔 비번을 알아야 접속되지만, `--init-file` 옵션으로 서버를 띄우면 "서버가 켜지는 순간 이 SQL을 먼저 실행"시킬 수 있다. 거기에 `ALTER USER`를 넣어 **접속 없이** 비번을 바꿨다.

```powershell
# 관리자 PowerShell
net stop MySQL80
& "C:\...\mysqld.exe" --defaults-file="...my.ini" --init-file="C:\...\mysql-init.txt" --console
# ready for connections 뜨면 Ctrl+C
net start MySQL80
```

(`mysql-init.txt` 안에 `ALTER USER 'root'@'localhost' IDENTIFIED BY '새비번';`)

### 삽질 2: UPDATE/DELETE에서 `.where()` 빼먹으면 대참사

CRUD를 짤 때 `update`/`delete`에 `.where({ id })`를 안 붙였다.

```ts
await knex('posts').update(dto);  // ← WHERE 없음 = 모든 행을 덮어씀!
await knex('posts').del();        // ← WHERE 없음 = 테이블 통째 삭제!
```

메모리 배열 시절엔 `filter(p => p.id !== id)`처럼 "어느 것"인지가 코드에 자연히 있었지만,
SQL의 `UPDATE`/`DELETE`는 **`WHERE`가 없으면 전체 행에 적용**된다. 그 유명한 "WHERE 빼먹고 DB 날린" 사고.
**교훈: UPDATE/DELETE 쓸 땐 반사적으로 "WHERE 붙였나?" 확인.**

곁가지로 배운 것:
- `.del()` / `.delete()`는 **완전히 같은 별칭**(옛날 `delete`가 예약어라 `del`을 만든 것).
- `.del(인자)`의 인자는 WHERE가 아니라 **returning**(삭제 후 돌려받을 컬럼)이다. 게다가 MySQL은 returning 미지원이라 무시된다. **행을 고르는 건 언제나 `.where()`뿐.**
- `update()`의 반환값은 "바뀐 행 개수"(숫자)라, 갱신된 글을 돌려주려면 그 숫자가 아니라 원래 `id`로 다시 조회해야 한다(`return this.getPost(id)`).

## 오늘의 정리

- 게시판 데이터를 메모리 배열 → **MySQL + Knex**로 옮기고, 접속정보는 `.env`, 연결은 `DatabaseModule`로 DI 주입했다.
- 마이그레이션으로 테이블을 코드로 만들고, CRUD를 전부 async Knex 쿼리로 다시 짰다. id 충돌·재시작 초기화 문제가 사라졌다.
- 제일 무서운 건 `UPDATE`/`DELETE`의 `WHERE` 누락. 행 선택은 오직 `.where()`.
- **다음**: 트랜잭션(`knex.transaction`)으로 "조회 시 조회수 +1"을 원자적으로 처리 → 단계 2 마무리.
