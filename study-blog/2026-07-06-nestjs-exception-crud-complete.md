# 프론트 개발자가 NestJS로 게시판 만들기 (2) — 404 예외 처리와 CRUD 완성

> 백엔드 학습 기록 · 단계 1 — 표준 NestJS
> 2026-07-06

## 들어가며

지난 (1)편은 "없는 글(`/posts/999`)을 조회하면 200 OK에 빈 응답이 온다"는 찜찜한 문제를 남겨두고 끝났다.
이번엔 그걸 **404로 정직하게 고치는 것**부터 시작해서, 비어 있던 **수정(PATCH)·삭제(DELETE)까지 채워 CRUD 한 바퀴를 완성**했다.
덤으로 TypeScript 에러 하나(4053)를 만나면서 "타입을 export한다는 게 무슨 의미인지"도 몸으로 배웠다.

## 배운 개념

### 1. 없으면 200이 아니라 404 — 예외를 "던진다"

왜 200이 문제일까? 프론트 입장에서 보면 명확하다.
`GET /posts/999`에 서버가 **200 OK**를 주면, TanStack Query의 `useQuery`는 **"성공"**으로 판단한다.
`isError`는 `false`, `data`는 `undefined`. 그럼 화면에서 `data.title`을 읽다가 터진다. 에러 분기가 아예 안 탄다.

서버가 **"그런 글 없음"을 상태 코드로 정직하게 말해줘야** 프론트가 `isError`로 잡아서 "글을 찾을 수 없습니다" 화면을 띄울 수 있다.
그게 **404 Not Found**다. HTTP 상태 코드는 서버가 클라이언트에게 결과를 알려주는 약속이다.

NestJS에서는 상태 코드별 예외 클래스를 미리 제공한다:

| 예외 클래스 | 상태 코드 |
|-------------|-----------|
| `NotFoundException` | 404 |
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |

`@nestjs/common`에서 가져다 **`throw` 하기만 하면**, 프레임워크가 알아서 잡아서 HTTP 응답으로 바꿔준다.

```ts
getPost(id: number) {
  const post = this.posts.find((post) => post.id === id);
  if (!post) {
    throw new NotFoundException('글을 찾을 수 없습니다.');
  }
  return post;
}
```

> **React 비유**: 자식 컴포넌트에서 `throw` 하면 부모를 뚫고 올라가 Error Boundary가 잡는다.
> NestJS도 똑같다. **서비스 어디서 던지든** 컨트롤러·파이프라인을 다 건너뛰고 최종적으로 프레임워크가 잡아 에러 응답으로 만든다.

### 2. 던진 예외가 JSON으로 변신하는 건 "기본 Exception Filter"가 하는 일

`throw new NotFoundException('글을 찾을 수 없습니다.')` 한 줄의 결과를 `curl`로 보면:

```
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"message":"글을 찾을 수 없습니다.","error":"Not Found","statusCode":404}
```

이 JSON 모양(`message`/`error`/`statusCode`)을 만들어준 게 NestJS에 **기본 내장된 전역 Exception Filter**다.
지금은 "예외를 던지면 프레임워크가 응답으로 바꿔준다"만 기억하면 되고, 이 기본 포맷을 내 입맛대로 바꾸는 건 다음 주제(전역 Exception Filter 커스터마이징).

### 3. PATCH = 부분 수정, PUT = 통째 교체

| 메서드 | 의미 | 바디 |
|--------|------|------|
| **PUT** | 리소스를 통째로 교체 | 모든 필드 필요 (안 보낸 건 비워짐) |
| **PATCH** | 보낸 필드만 부분 수정 | 바꿀 필드만 |

게시판 글 수정은 보통 "제목만" 또는 "내용만" 고치니까 **부분 수정 = PATCH**가 자연스럽다.

부분 수정의 입력 타입은 `Partial<Omit<Post, 'id'>>`로 잡았다.
- `Omit<Post, 'id'>` = `{ title, content }` (지난편에서 생성 입력에 썼던 그것)
- `Partial<...>` = 그 필드들을 **전부 선택적(optional)** 으로 = `{ title?, content? }`
- PATCH는 일부만 오니까 딱 맞다.

덮어쓰기는 `Object.assign(post, data)`로 했다. `data`에 담긴 필드만 `post`에 덮어써지고, 안 온 필드는 그대로 유지된다 → 이게 "부분 수정"의 실제 동작.

```ts
updatePost(id: number, data: Partial<Omit<Post, 'id'>>) {
  const post = this.getPost(id);       // ← 찾기 + 404를 재사용!
  return Object.assign(post, data);
}
```

### 4. 로직 재사용 — "찾기 + 404"를 한 곳에 모으기

`updatePost`도 `deletePost`도 "먼저 그 글을 찾고, 없으면 404" 가 필요하다.
근데 그 로직은 이미 `getPost`에 있다. 그래서 **복붙하지 않고 `this.getPost(id)`를 호출**해서 재사용했다.

`getPost`는 못 찾으면 알아서 `throw` 하니까, `updatePost`/`deletePost`는 그냥 부르기만 하면
없는 글일 때 그 자리에서 예외가 던져져 뒤 코드가 실행되지 않는다.

> **React 비유**: 여러 컴포넌트가 쓰는 로직을 커스텀 훅 하나로 빼서 재사용하는 것과 같다.
> 백엔드에서도 "검증 + 조회"를 한 메서드로 모아두면 규칙이 한 곳에만 있어 관리가 쉽다.

### 5. DELETE — filter로 새 배열 재할당 (React setState 방식)

배열에서 항목을 지우는 방법은 두 가지:
1. `findIndex` + `splice(index, 1)` — 원본 배열을 직접 수정
2. `filter`로 "그 id가 아닌 것만" 남겨 **새 배열로 재할당**

2번을 골랐다. `this.posts = this.posts.filter(p => p.id !== id)` — 익숙하지 않나?
React의 `setPosts(posts.filter(p => p.id !== id))`와 똑같은 발상이다.

```ts
deletePost(id: number) {
  this.getPost(id);   // 없으면 여기서 404 던져짐
  this.posts = this.posts.filter((post) => post.id !== id);
  return { deleted: true };
}
```

삭제 응답은 원래 **204 No Content**(바디 없음)가 정석이지만, NestJS에서 204를 주려면
`@HttpCode(204)` 데코레이터가 필요하다(반환값을 비워야 함). 지금은 감을 잡는 단계라 `{ deleted: true }` + 200으로 갔다.

## 실제로 해본 것

최종 `app.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';

export interface Post {          // ← export (아래 삽질 참고)
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

  getPost(id: number) {
    const post = this.posts.find((post) => post.id === id);
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    return post;
  }

  updatePost(id: number, data: Partial<Omit<Post, 'id'>>) {
    const post = this.getPost(id);
    return Object.assign(post, data);
  }

  deletePost(id: number) {
    this.getPost(id);
    this.posts = this.posts.filter((post) => post.id !== id);
    return { deleted: true };
  }
}
```

컨트롤러에 추가한 라우트:

```ts
@Patch('posts/:id')
updatePost(@Param('id') id: string, @Body() body: any) {
  return this.appService.updatePost(Number(id), body);
}

@Delete('posts/:id')
deletePost(@Param('id') id: string) {
  return this.appService.deletePost(Number(id));
}
```

`curl`로 확인한 결과:

```bash
# 부분 수정: title만 보냈는데 content는 유지되나?
$ curl -X PATCH http://localhost:3000/posts/2 \
    -H "Content-Type: application/json" -d '{"title":"고친 제목"}'
{"id":2,"title":"고친 제목","content":"반가워"}   [200]  ← content 유지! (PATCH의 핵심)

# 없는 글 수정
$ curl -X PATCH http://localhost:3000/posts/999 -d '{"title":"x"}'
                                                  [404]

# 삭제
$ curl -X DELETE http://localhost:3000/posts/1
{"deleted":true}                                  [200]

# 삭제 후 목록 — 1 사라지고 2(수정본)만 남음
$ curl http://localhost:3000/posts
[{"id":2,"title":"고친 제목","content":"반가워"}]  [200]

# 없는 글 삭제
$ curl -X DELETE http://localhost:3000/posts/999
                                                  [404]
```

특히 첫 번째가 중요하다. `{title}`만 보냈는데 `content`("반가워")가 안 날아갔다.
`Object.assign`이 "보낸 필드만 덮어쓰기"를 해준 결과이자, **PATCH(부분 수정)가 PUT(통째 교체)과 다른 지점**이다.

## 막혔던 점 / 삽질

### TypeScript 에러 4053 — "타입 이름을 부를 수 없다"

`updatePost`를 컨트롤러에 추가하자 이런 에러가 떴다:

```
Return type of public method from exported class has or is using name 'Post'
from external module ".../app.service" but cannot be named. ts(4053)
```

**원인 추적**:
1. 서비스의 `updatePost`는 `Post`(인터페이스)를 반환한다.
2. 컨트롤러의 `updatePost`는 `return this.appService.updatePost(...)` 하니까, **컨트롤러 메서드의 반환 타입도 자동으로 `Post`로 추론**된다.
3. 그런데 `app.service.ts`의 `interface Post`는 `export`가 없었다. export 안 된 타입은 **그 파일 밖에서는 이름으로 참조할 수 없다.**
4. TS가 컨트롤러의 공개 메서드 타입을 표현하려는데 `Post`를 바깥에서 못 부른다 → 에러.

**해결**: `interface Post` → `export interface Post` (한 단어 추가).

핵심 규칙:
> 파일 안에서만 쓰는 타입은 export 안 해도 되지만,
> 그 타입이 다른 파일로 "새어 나가면"(직접 쓰든, 반환값 추론으로 물려받든) **export해서 이름을 공개**해야 한다.

> **React 비유**: 컴포넌트 파일의 `type Props`도 그 파일에서만 쓰면 export 안 해도 된다.
> 근데 다른 파일이 그 `Props`를 참조하는 순간 `export type Props`로 바꿔야 하는 것과 똑같다.
> 지금 `Post`가 서비스 안에만 있다가 컨트롤러 반환 타입으로 흘러나간 상황이었다.

### (참고) 한글이 깨져 보였던 것

`curl` 출력에서 수정한 제목이 `??ģ ??`처럼 깨져 보였는데, 이건 **Windows 터미널의 출력 인코딩** 문제일 뿐
실제 저장된 데이터는 멀쩡했다(옆의 `content:"반가워"`는 정상 출력). 데이터 버그가 아니라 표시 문제였다.

## 오늘의 정리

- **없는 자원엔 `throw new NotFoundException` → 404**. "던지면 프레임워크가 잡아 응답으로 변환"이 NestJS 예외 처리의 핵심이고, 이건 기본 Exception Filter가 해주는 일이다.
- **PATCH = 부분 수정**(`Partial` 타입 + `Object.assign`으로 보낸 필드만 덮어씀), **DELETE = filter로 새 배열 재할당**. "찾기+404"는 `getPost`를 재사용해 한 곳에 모았다.
- TS 4053으로 "**타입이 파일 밖으로 나가면 export**"라는 규칙을 배웠다.
- 이걸로 **게시판 CRUD 한 바퀴 완성**(생성·조회·수정·삭제 + 404).
- **다음에 이어서 할 것**: `@Body() body: any`의 무방비 상태를 걷어내기 — class-validator + ValidationPipe로 **DTO 검증**(요청 파이프라인의 Pipe). 프론트의 zod 스키마 검증의 서버판.
