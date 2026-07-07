# 프론트 개발자가 NestJS로 게시판 만들기 (4) — DTO 중복 제거(PartialType)와 전역 Exception Filter

> 백엔드 학습 기록 · 단계 1 — 표준 NestJS
> 2026-07-07

## 들어가며

(3)편에서 DTO 검증(`ValidationPipe`)을 붙이면서 요청 파이프라인의 **Pipe**를 배웠다.
이번엔 두 가지를 했다.

1. `CreatePostDto`를 손으로 베낀 `UpdatePostDto`의 **중복을 `PartialType`으로 제거**
2. 파이프라인 4형제의 마지막, **Exception Filter**를 직접 만들어 에러 응답 형식을 통일

이걸로 단계 1(표준 NestJS)의 핵심을 한 바퀴 다 돌았다.

## 배운 개념

### 1. PartialType — "생성 DTO를 물려받아 전부 선택으로"

(3)편까지 `UpdatePostDto`는 `CreatePostDto`를 손으로 베낀 거였다.

```ts
// 전 — create랑 필드가 똑같다. 검증 규칙까지 그대로 베낌
export class UpdatePostDto {
  @IsOptional() @IsString() @IsNotEmpty()
  title?: string;
  @IsOptional() @IsString() @IsNotEmpty()
  content?: string;
}
```

문제는 **나중에 `CreatePostDto`에 필드(예: `tags`)를 추가하면 `UpdatePostDto`에도 똑같이 또 추가**해야 한다는 것. 안 하면 두 DTO가 슬금슬금 어긋난다.

`@nestjs/mapped-types`의 `PartialType`은 이걸 한 줄로 해결한다:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

의미: **"CreatePostDto의 모든 필드를, 검증 데코레이터까지 그대로 물려받되, 전부 `@IsOptional`(선택)로 바꿔라."**

> **프론트 비유**: TS의 `type UpdateProps = Partial<CreateProps>` 랑 정확히 같은 발상이다.
> 다만 `Partial<T>`는 **타입만** optional로 만드는 반면,
> `PartialType`은 **타입 + 런타임 검증 데코레이터(`@IsString` 등)까지** 복사하면서 전부 optional로 만든다.
> (3)편에서 배운 "검증은 런타임 메타데이터라 class가 필요하다"의 연장선.

이제 `CreatePostDto`에 필드를 추가하면 `UpdatePostDto`는 **자동으로 따라온다.**

### 2. 요청 파이프라인 4형제 — 지금 어디쯤인가

요청이 컨트롤러에 닿기까지, 응답이 나가기까지 거치는 관문 4개:

| 형제 | 역할 | 진도 |
|---|---|---|
| **Pipe** | 들어오는 데이터 변환·검증 | ✅ ValidationPipe |
| **Guard** | 통과시킬지 말지(인증/인가) | 단계 3에서 |
| **Interceptor** | 요청/응답 전후를 감싸기(로깅·응답 변형) | 나중 |
| **Exception Filter** | 던져진 예외를 잡아 응답으로 변환 | ← 이번 |

### 3. Exception Filter = React의 Error Boundary

지금까지 `throw new NotFoundException('...')` 하면 **Nest의 기본 Exception Filter**가 그걸 받아
`{statusCode, message, error}` JSON으로 바꿔줬다. 우리는 그 기본 필터를 **우리 것으로 교체**해서
응답 모양을 회사 표준처럼 통일할 거다.

> **프론트 비유**: Exception Filter = **Error Boundary**.
> 컴포넌트 트리 어디서 에러가 터지든 하나의 Error Boundary가 잡아 fallback UI를 보여주듯,
> 앱의 어느 컨트롤러/서비스에서 예외가 던져지든 **전역 Exception Filter 하나가 다 잡아서**
> 일관된 에러 응답 JSON을 만든다. `throw`가 곧 "Error Boundary로 점프".

필터의 해부도 — 핵심 부품 3개:

- **`@Catch(HttpException)`** — "무엇을 잡을지" 선언. `NotFoundException`, `BadRequestException` 등이
  전부 `HttpException`의 자식이라 이 하나로 다 걸린다. (예상 못 한 순수 에러는 Nest 기본 필터가 500으로 처리)
- **`ArgumentsHost`** — 지금 요청이 HTTP인지 큐 메시지인지 등 실행 맥락을 담은 상자.
  `host.switchToHttp()`로 HTTP 맥락을 꺼내 `.getResponse()`(Express `res`)·`.getRequest()`(Express `req`)를 얻는다.
- **`exception.getStatus()` / `exception.getResponse()`** — 던져진 예외에서 상태코드·원본 메시지를 뽑는 메서드.

## 실제로 해본 것

### 설치

```bash
npm install @nestjs/mapped-types   # PartialType 제공 (설치된 버전 2.1.1)
```

### 만든 필터 — `src/filters/http-exception.filter.ts`

```ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus(); // 예: 404
    const res = exception.getResponse(); // string 또는 {message, error, statusCode}
    // 404는 message가 문자열, ValidationPipe의 400은 배열 → 이렇게 통일해서 꺼냄
    const message =
      typeof res === 'string'
        ? res
        : (res as { message: string | string[] }).message;

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 전역 등록 — `src/main.ts`

```ts
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

`ValidationPipe`를 `useGlobalPipes`로 등록했던 것과 **쌍둥이 패턴**. 필터는 메서드 이름만 `useGlobalFilters`.
파일만 만들고 등록을 안 하면 여전히 기본 필터가 동작하니 이 한 줄이 필수다.

### curl로 확인 — PartialType 검증 상속 (4종)

```
PATCH /posts/1  {"content":"수정된 내용"}  → 200, title 유지          (부분수정 OK)
PATCH /posts/1  {"content":""}            → 400 "should not be empty" (@IsNotEmpty 상속됨)
PATCH /posts/1  {"title":123}             → 400 "must be a string"    (@IsString 상속됨)
PATCH /posts/1  {}                        → 200                        (모든 필드 optional화)
```

손으로 베꼈던 검증 규칙이 **한 줄 상속으로 그대로 살아있음**을 확인. 코드는 13줄 → 3줄.

### curl로 확인 — 커스텀 Exception Filter (3종)

```
GET  /posts/999            → 404
  {"success":false,"statusCode":404,"message":"글을 찾을 수 없습니다.",
   "path":"/posts/999","timestamp":"2026-07-07T07:33:23.503Z"}

POST /posts {"title":""}   → 400
  {"success":false,"statusCode":400,
   "message":["title should not be empty","content should not be empty","content must be a string"],
   "path":"/posts","timestamp":"..."}

GET  /posts/1              → 200
  {"id":1,"title":"첫 글","content":"안녕"}   ← 정상 응답은 필터를 안 탐
```

주목할 점:
- **404는 문자열, 400은 배열** 메시지인데 `typeof res === 'string' ? ... : (res as {...}).message` 분기가 둘 다 흡수.
- **정상 응답(200)은 필터를 안 탄다.** Exception Filter는 "예외가 던져졌을 때만" 깨어난다.
  Error Boundary가 에러 없는 렌더에 관여 안 하는 것과 같다.

## 막혔던 점 / 삽질

### `res as any` 로 타입 에러

필터에서 처음엔 `(res as any).message`로 썼는데 타입 에러가 났다.
(3)편에서 `data[key]` 때 만났던 **typescript-eslint의 `no-unsafe-*` 규칙**이 또 나온 것.

`any`로 캐스팅하면 **그 순간부터 타입 검사가 통째로 꺼지고**, `.message` 접근도 그 결과를 변수에 담는 것도
전부 "위험한 any 접근"으로 걸린다.

**교훈(반복 확인): `any`(검사 끄기) 대신 구체 타입으로 "좁혀라".**

```ts
// ❌ 검사 자체를 끔
(res as any).message
// ✅ 딱 필요한 모양으로만 캐스팅 → 타입 있는 접근이 됨
(res as { message: string | string[] }).message
```

`getResponse()`가 객체일 때 모양은 `{ statusCode, message, error }`고, 그중 `message`는
문자열(NotFound) 또는 문자열 배열(ValidationPipe 400)이라 `string | string[]`로 정확히 좁힐 수 있다.

## 오늘의 정리

- `PartialType(CreatePostDto)` 한 줄로 Update DTO의 중복 제거 — 검증 규칙까지 상속되고 전부 optional화된다(`Partial<T>`의 런타임 버전).
- Exception Filter는 앱 전역의 Error Boundary — `@Catch`로 잡을 예외를 정하고, `host.switchToHttp()`로 res/req를 꺼내 응답을 직접 쓴다. `useGlobalFilters`로 등록.
- 이걸로 단계 1(표준 NestJS) 핵심을 완주. **다음은 단계 2 — DB & Knex.** 메모리 배열을 MySQL로 교체하고 SQL/쿼리빌더/마이그레이션을 배운다.
