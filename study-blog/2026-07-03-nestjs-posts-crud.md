# 프론트 개발자가 NestJS로 게시판 만들기 (1) — 라우팅부터 CRUD 맛보기까지

> 백엔드 학습 기록 · 단계 1 — 표준 NestJS
> 2026-07-03

## 들어가며

React/Next로 API를 "호출하는 쪽"만 하다가, 드디어 "받는 쪽"을 배우기 시작했다.
목표는 거창하지 않다. **메모리 배열에 게시글을 담아두고, HTTP로 읽고 쓰는 게시판**을 직접 짜보는 것.
DB도 메시지큐도 없이, 순수하게 "요청 → 처리 → 응답" 흐름만 몸에 익히는 게 이번 목표였다.

시작 상태는 `nest new`로 만든 기본 뼈대(Hello World) 그대로였다. 파일은 딱 4개.

## 배운 개념

### 1. NestJS의 3층 구조 (Module / Controller / Service)

서버는 결국 **"요청 오면 → 처리하고 → 응답한다"** 를 반복하는 기계다. 그 역할이 파일별로 나뉘어 있다.

| 파일 | 역할 | React로 치면 |
|------|------|-------------|
| `main.ts` | 서버를 켜고 포트에서 요청 대기 | `ReactDOM.createRoot().render()` |
| `app.module.ts` | 앱이 어떤 부품으로 구성되는지 조립 설명서 | 최상위 `<App>` |
| `app.controller.ts` | 어떤 URL로 오면 어떤 함수가 받을지 (접수창구) | 라우터 |
| `app.service.ts` | 실제 로직/데이터 (일하는 곳) | 커스텀 훅 / 유틸 |

**왜 나누나?** 컨트롤러(=컴포넌트)에 데이터랑 로직을 다 때려박으면 지저분하다.
React에서 컴포넌트에 fetch·필터·정렬 다 넣지 않고 커스텀 훅으로 빼는 것과 똑같은 이유(재사용·테스트·가독성).
그래서 **컨트롤러는 요청/응답에만 집중하고, 데이터와 로직은 Service로 뺀다.**

### 2. 라우팅 — 데코레이터의 괄호 안 문자열이 곧 URL

```ts
@Get()         // GET /        (괄호 비면 기본 경로)
@Get('ping')   // GET /ping    (괄호 문자열이 하위 경로)
@Get('posts')  // GET /posts
```

React Router의 `<Route path="ping">`와 같은 감각. 차이는 **화면을 그리는 대신 응답 데이터를 돌려준다**는 것뿐.

서버를 `--watch` 모드(`npm run start:dev`)로 띄우면, 라우트가 등록될 때마다 로그가 뜬다:

```
Mapped {/ping, GET} route
```

이 줄이 "라우트 등록 성공" 신호다. **라우트가 안 먹으면 제일 먼저 이 로그부터 확인**하면 된다.

### 3. 객체/배열을 return하면 NestJS가 자동으로 JSON으로 바꿔준다

```ts
@Get('posts')
getPosts() {
  return [{ id: 1, title: '첫 글' }];  // 배열을 그냥 return
}
```

이러면 응답에 `Content-Type: application/json`이 **자동으로** 붙는다.
프론트에서 `axios.get('/posts')` 하면 `res.data`에 이 배열이 그대로 담기는 이유가 이것.
`res.json()` 같은 걸 서버가 알아서 해준다.

### 4. `this`가 다시 등장한다 (DI + 클래스 필드)

```ts
constructor(private readonly appService: AppService) {}
// ...
return this.appService.getPosts();
```

`private readonly appService`는 TS 축약 문법으로, **클래스에 `appService` 필드를 만들고 거기 저장**한다.
메서드 안에서 그 필드를 쓰려면 "이 객체의 것"이라고 지목해야 하는데 그게 `this`.
`this` 없이 `appService`라고 쓰면 JS는 지역 변수를 찾다가 없어서 에러난다.

> 옛날 React 클래스 컴포넌트의 `this.props`, `this.state`와 똑같다. 함수형+훅에선 안 쓰던 `this`가, 클래스 기반인 NestJS에서 다시 나온다.

그리고 `new AppService()`를 직접 안 했는데도 `appService`가 채워져 있다. NestJS가 알아서 만들어 넣어준다 = **의존성 주입(DI)**. (이건 다음에 제대로 배울 주제)

### 5. 메모리에 상태를 유지하려면 "필드"로 올려야 한다

```ts
getPosts() {
  return [{...}, {...}];  // ❌ 호출될 때마다 새 배열 → 추가해도 사라짐
}
```

메서드 안에서 만든 배열은 **매 호출마다 초기화**된다.
React에서 컴포넌트 함수 안의 `let posts = []`가 매 렌더마다 리셋되는 것과 같다.
값이 유지되려면 `useState`에 담듯, **클래스 필드로 올려야** 한다:

```ts
export class AppService {
  private posts = [ ... ];   // 필드 → 객체가 사는 동안 유지됨
  getPosts() { return this.posts; }
}
```

> 단, 서버를 재시작하면 메모리는 다 날아간다. 그래서 나중에 DB를 배운다. 지금은 "켜져 있는 동안만 유지"로 충분.

### 6. 입력 타입과 저장 타입은 다르다 (`Omit`)

게시글을 새로 쓸 때 클라이언트는 `id`를 보내지 않는다. **id는 서버가 붙이는 값**이다.

- 저장된 글: `{ id, title, content }` — id 있음
- 생성 입력: `{ title, content }` — id 없음

그래서 생성 메서드의 입력 타입에서 id를 빼야 한다. TS의 `Omit`이 이럴 때 쓰는 도구:

```ts
createPost(post: Omit<Post, 'id'>) {   // "Post에서 id만 뺀 타입"
  const newPost = { id: this.posts.length + 1, ...post };
  this.posts.push(newPost);
  return newPost;
}
```

React로 치면 등록 폼에서 사용자가 입력하는 데이터와, 저장 후 돌려받는 데이터(`id`, `createdAt` 포함)가 다른 것과 같다.
(이렇게 "요청으로 들어오는 데이터의 모양"을 정의하는 걸 나중에 **DTO**라고 부른다고 함)

### 7. 요청 바디와 경로 파라미터 꺼내기 — `@Body`, `@Param`

- `@Body()` → 요청 바디(JSON)를 꺼내준다. 프론트의 `axios.post('/posts', body)`에서 그 body.
- `@Param('id')` → URL 경로의 변수(`:id`)를 꺼내준다. React Router의 `useParams()`와 같은 역할.

```ts
@Post('posts')
createPost(@Body() body: any) {
  return this.appService.createPost(body);
}

@Get('posts/:id')                     // :id = "이 자리는 변수"
getPost(@Param('id') id: string) {
  return this.appService.getPost(Number(id));  // ← Number() 주의!
}
```

### 8. HTTP 상태 코드는 서버가 상황에 맞게 골라준다

`curl`로 응답을 날것으로 보면, 브라우저가 숨기던 상태 코드가 보인다.

- `GET` 성공 → **200 OK**
- `POST`로 생성 → **201 Created** (NestJS가 `@Post`에 자동으로 붙여줌)

"새로 만들었으면 201로 알려주는 게 REST 관례"라서 프레임워크가 알아서 구분해준다.

## 실제로 해본 것

최종 `app.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  getPing(): string {
    return 'pong';
  }

  @Get('posts')
  getPosts(): any {
    return this.appService.getPosts();
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.appService.getPost(Number(id));
  }

  @Post('posts')
  createPost(@Body() body: any) {
    return this.appService.createPost(body);
  }
}
```

최종 `app.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

interface Post {
  id: number;
  title: string;
  content: string;
}

@Injectable()
export class AppService {
  private posts = [
    { id: 1, title: '첫 글', content: '안녕' },
    { id: 2, title: '둘째 글', content: '반가워' },
  ];

  getHello(): string {
    return 'Hello World!';
  }

  getPosts(): Post[] {
    return this.posts;
  }

  getPost(id: number) {
    return this.posts.find((post) => post.id === id);
  }

  createPost(post: Omit<Post, 'id'>) {
    const newPost = { id: this.posts.length + 1, ...post };
    this.posts.push(newPost);
    return newPost;
  }
}
```

`curl`로 확인한 결과:

```bash
# 목록 조회
$ curl http://localhost:3000/posts
[{"id":1,...},{"id":2,...}]              [HTTP 200]

# 새 글 생성 (body 전송)
$ curl -X POST http://localhost:3000/posts \
    -H "Content-Type: application/json" \
    -d '{"title":"세번째 글","content":"..."}'
{"id":3,"title":"세번째 글",...}          [HTTP 201]   ← 서버가 id=3 부여, 201!

# 단건 조회
$ curl http://localhost:3000/posts/2
{"id":2,"title":"둘째 글",...}            [HTTP 200]

# 없는 글 조회
$ curl http://localhost:3000/posts/999
(빈 응답)                                 [HTTP 200]   ← ⚠️ 문제! (아래 참고)
```

## 막혔던 점 / 삽질

### ① `createPost`에서 `id` 타입 에러 (ts2783)

```ts
const newPost = { id: this.posts.length + 1, ...post };
//                 ↑ id 지정          ↑ post에도 id가 있음 → 중복
```

파라미터를 `post: Post`로 뒀더니 `Post`에 `id`가 포함돼서, `{ id: ..., ...post }`에서 **id가 두 번 지정**됐다.
표면 원인은 중복 키였지만, **진짜 원인은 타입 설계**였다 — 생성 입력에는 애초에 id가 없어야 한다.
→ `post: Omit<Post, 'id'>`로 바꿔서 해결.

### ② "분명 있는 데이터인데 안 찾아진다" 함정 (문자열 vs 숫자)

`@Param('id')`로 꺼낸 값은 **항상 문자열**이다 (URL은 통째로 글자니까).
그런데 데이터의 `post.id`는 숫자다. JS에서 `"2" === 2`는 `false`.
그래서 `Number(id)`로 변환하지 않으면 `.find`가 아무것도 못 찾고 `undefined`가 된다.
→ `getPost(Number(id))`로 숫자 변환해서 해결. **이건 백엔드 초보 단골 버그**라고 함.

### ③ 없는 글 조회 시 `200`이 뜨는 문제 (다음 과제)

`/posts/999`처럼 없는 글을 조회하면 `.find`가 `undefined`를 반환하고,
NestJS는 이걸 빈 응답 + 기본값 **200 OK**로 처리해버린다.
근데 이건 잘못됐다 — 클라이언트가 "성공"으로 받고 `res.data.title` 하다가 터진다.
없으면 **404 Not Found**로 정직하게 알려줘야 한다.

```ts
// 다음에 이렇게 고칠 예정
if (!post) {
  throw new NotFoundException('그런 글 없어요');  // → 자동 404
}
```

이건 NestJS의 예외 처리(Exception Filter)와 이어지는 주제라 다음 세션 시작점으로 남겨뒀다.

## 오늘의 정리

- **컨트롤러(접수창구)와 서비스(로직/데이터)를 나누는 3층 구조**가 NestJS의 뼈대다. React의 컴포넌트/커스텀 훅 분리와 같은 발상.
- 데코레이터(`@Get` `@Post` `@Body` `@Param`)로 라우팅과 요청 데이터 추출을 선언적으로 처리하고, 객체를 return하면 JSON·상태코드는 프레임워크가 챙겨준다.
- 삽질 포인트 셋: **타입 중복(Omit으로 해결)**, **문자열↔숫자 변환(Number)**, **없는 자원에 200 대신 404가 필요**.
- **다음에 이어서 할 것**: `NotFoundException`으로 404 응답 만들기 → 그리고 Exception Filter로 확장.
