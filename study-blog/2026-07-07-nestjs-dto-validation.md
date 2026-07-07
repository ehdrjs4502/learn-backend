# 프론트 개발자가 NestJS로 게시판 만들기 (3) — DTO 검증과 PATCH undefined 버그 추적

> 백엔드 학습 기록 · 단계 1 — 표준 NestJS
> 2026-07-07

## 들어가며

지난 (2)편까지 게시판 CRUD를 한 바퀴 완성했지만, 큰 구멍이 하나 있었다.
바로 `@Body() body: any` — **서버가 요청을 전혀 검증하지 않는 상태**다.
이번엔 요청 파이프라인의 **Pipe**(`ValidationPipe` + class-validator)로 그 구멍을 막았다.
그리고 그 과정에서 예상 못 한 버그("수정했더니 다른 필드가 사라짐")를 만나 원인을 끝까지 추적했다.

## 배운 개념

### 1. 서버 검증은 "선택"이 아니라 "방어선"이다

지금 생성 라우트는 이랬다:

```ts
@Post('posts')
createPost(@Body() body: any) {   // any = "아무거나 받겠다"
```

`any`라서 이런 요청이 다 통과한다:
- `{}` (빈 객체) → title/content 없는 글 생성
- `{"title": 123}` → 제목이 숫자
- `{"title":"글","content":"내용","isAdmin":true}` → 안 받기로 한 필드까지 섞여 들어옴

프론트에서도 폼 검증(zod, react-hook-form)을 하지만, **프론트 검증은 우회할 수 있다.**
`curl`, Postman, 개발자도구로 얼마든지 이상한 요청을 보낼 수 있으니까.
그래서 **서버는 반드시 자기 손으로 다시 검증**해야 한다. 프론트 검증은 UX용, 서버 검증은 진짜 방어선.

### 2. DTO + ValidationPipe — 요청이 컨트롤러에 닿기 전에 검문

- **DTO**(Data Transfer Object) = "이 요청 바디는 이런 모양이고 이런 규칙을 지켜야 한다"를 클래스로 선언한 것. 프론트의 zod 스키마와 같은 역할.
- **ValidationPipe** = 요청이 컨트롤러에 들어오기 **직전에** 바디를 DTO 규칙으로 검사하는 검문소. 위반이면 컨트롤러 코드는 실행조차 안 되고 **400 Bad Request**가 자동 응답된다.

`main.ts`에서 앱 전체에 검문소를 세운다:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

> `useGlobalPipes`는 `app.listen()` **전에** 등록해야 한다. 서버가 요청을 받기 시작하기 전에 검문소를 세워야 하니까.

`whitelist: true`의 효과: **DTO에 선언 안 된 필드는 자동으로 걷어낸다.** 위 `isAdmin: true` 같은 잉여 필드가 저절로 잘린다.

> **비유**: `ValidationPipe`는 React Router의 loader처럼, 진입 전에 데이터를 막아서서 규칙 검사를 하고 통과 못하면 되돌려보낸다.

### 3. DTO는 왜 `interface`가 아니라 `class`인가

지난편의 `Post`는 `interface`였다. 그런데 DTO는 **반드시 `class`**여야 한다.

- `interface`는 **컴파일 후 완전히 사라진다.** 타입 검사용일 뿐 런타임에 존재하지 않는다.
- 검증은 **런타임에 실제 요청이 들어왔을 때** 일어난다. ValidationPipe가 실행 중에 "이 요청이 규칙을 지켰나?"를 검사하려면, 규칙 정보가 런타임까지 살아남아야 한다.
- `class` + 데코레이터는 컴파일 후에도 남아서, 데코레이터가 심어둔 규칙 메타데이터를 런타임에 읽을 수 있다.

```ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
```

### 4. `@Body()`의 타입이 곧 "검증 대상 지정"이다

```ts
@Post('posts')
createPost(@Body() dto: CreatePostDto) {   // any → CreatePostDto
  return this.appService.createPost(dto);
}
```

`@Body()`의 타입을 `CreatePostDto`로 바꾸는 순간, ValidationPipe가 "이 바디를 `CreatePostDto` 규칙으로 검사해야겠구나"를 안다. `any`일 땐 검사할 규칙 자체를 몰라서 그냥 통과시켰던 것.

> `axios.post<T>(...)`의 제네릭은 런타임에 아무 일도 안 하는 타입 힌트지만, `@Body() dto: CreatePostDto`는 **런타임에 진짜 검사가 걸린다.** 데코레이터 + `emitDecoratorMetadata` 덕분에 타입 정보가 런타임까지 살아남아 ValidationPipe가 읽기 때문. "타입인데 런타임에 동작한다"가 NestJS의 묘미.

### 5. 수정 DTO = "모든 필드가 선택" (`@IsOptional`)

PATCH는 보낸 필드만 고치므로, 규칙은 생성과 같되 **필수 → 선택**만 다르다.

```ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()   // 안 보내면 나머지 검증을 통째로 건너뜀
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}
```

`@IsOptional()`의 동작: 값이 안 왔으면(`undefined`) 나머지 검증을 건너뛰고, 값이 왔으면 규칙을 검사한다. 딱 "부분 수정"에 맞는다.

> 실무에선 `PartialType(CreatePostDto)`(`@nestjs/mapped-types`) 한 줄로 이 중복을 없앤다. `CreatePostDto`의 모든 필드를 자동으로 optional로 만들어주는 도구다(TS `Partial`의 NestJS 런타임판). 이번엔 원리를 손으로 익히려고 직접 작성했다.

## 실제로 해본 것

생성(POST) 검증 확인:

```bash
# 정상 → 201
$ curl -X POST /posts -d '{"title":"정상 글","content":"내용 있음"}'
{"id":3,...}                                                    [201]

# 빈 객체 → 400 (위반 규칙을 배열로 전부 모아줌)
$ curl -X POST /posts -d '{}'
{"message":["title should not be empty","title must be a string",
            "content should not be empty","content must be a string"],
 "error":"Bad Request","statusCode":400}                        [400]

# 숫자 제목 → 400
$ curl -X POST /posts -d '{"title":123,"content":"x"}'
{"message":["title must be a string"],...}                      [400]

# 잉여 필드 isAdmin → 201이지만 응답에 isAdmin이 사라짐 (whitelist)
$ curl -X POST /posts -d '{"title":"화이트","content":"리스트","isAdmin":true}'
{"id":4,"title":"화이트","content":"리스트"}                    [201]
```

에러 `message`가 **배열**로 오는 게 포인트. `@IsNotEmpty()`, `@IsString()` 데코레이터 하나하나가 메시지 한 줄씩으로 나온다. 프론트에서 이 배열을 받아 필드별 에러로 뿌리기 좋다.

## 막혔던 점 / 삽질

### ① `ts(2564)` — DTO 필드 초기화 에러

DTO를 만들자마자 뜬 에러:

```
Property 'title' has no initializer and is not definitely assigned in the constructor. ts(2564)
```

재밌는 건, `tsc`(프로젝트 전체)로는 통과하는데 IDE에서만 떴다는 것. 실험해보니 이 에러는 **`--strict`(정확히는 `strictPropertyInitialization`)가 켜져 있을 때** 나온다.

- 의미: "필드를 선언했는데 초기값도 생성자 할당도 없으니 `undefined`일 수 있어 위험하다."
- 하지만 DTO는 특수 케이스 — 값을 우리 코드가 직접 안 넣고 class-transformer가 런타임에 채운다.
- 해결: 필드 뒤에 `!`를 붙여 "내가 책임지고 채워질 거니 믿어라"라고 컴파일러에 약속. → `title!: string`

교훈: **IDE엔 에러가 뜨는데 `tsc`/빌드는 통과한다 → 십중팔구 IDE의 TS 서버가 오래된 상태(stale)이거나 strict 설정 차이.** 특히 패키지를 방금 설치했을 때 단골이다. 코드를 의심하기 전에 TS 서버부터 재시작(`TypeScript: Restart TS Server`)해보자.

### ② PATCH를 했더니 다른 필드가 사라지는 버그

PATCH 검증을 붙이고 테스트하니 이상한 결과가 나왔다:

```bash
# title만 수정했는데 content가 사라짐!
$ curl -X PATCH /posts/1 -d '{"title":"수정됨"}'
{"id":1,"title":"수정됨"}          ← content "안녕"이 없어짐

# 빈 객체를 보냈더니 title/content 둘 다 날아감!
$ curl -X PATCH /posts/1 -d '{}'
{"id":1}
```

**진단 과정** — 순수 class-transformer로 재현해보니 원인이 드러났다:

```
'content' in dto ? => true | dto.content = undefined
Object.assign(post, dto) = {"id":1,"title":"수정됨"}   ← content가 undefined로 덮임
```

`JSON.stringify(dto)`는 `{"title":"수정됨"}`으로 보이지만, 사실 **`dto`에 `content` 키가 `undefined`로 존재**했다. 그래서 `Object.assign`이 기존 `content:"안녕"`을 `undefined`로 덮어버린 것.

**원인 3단 체인:**
1. `tsconfig`가 `target: es2023` + `useDefineForClassFields: true`라서, `content?: string` 필드 선언이 컴파일되면 **인스턴스 생성 시 `content = undefined`가 실제로 박힌다.**
2. ValidationPipe(class-transformer)가 바디를 DTO 인스턴스로 만들 때 `title`만 채우고 `content`는 박혀 있던 `undefined` 그대로 남긴다 → `{ title:"수정됨", content:undefined }`.
3. 서비스의 `Object.assign(post, dto)`가 `undefined`도 값이라며 기존 값을 덮어쓴다.

**해결** — PATCH의 의미는 "**보낸 필드만** 반영"이므로, `undefined`인 필드는 건너뛰면 된다:

```ts
updatePost(id: number, data: UpdatePostDto) {
  const post = this.getPost(id);
  if (data.title !== undefined) post.title = data.title;
  if (data.content !== undefined) post.content = data.content;
  return post;
}
```

처음엔 `for...of`로 `data[key]`를 돌렸는데, typescript-eslint의 `Unsafe assignment`(no-unsafe) 경고가 났다. `string` 변수로 인덱싱(`data[key]`)하면 TS가 타입을 `any`로 떨궈서다. **필드가 몇 개 안 되면 인덱스 루프보다 필드를 명시하는 게 더 타입 안전하고 읽기 좋다.**

교훈: **멀쩡하던 필드가 응답에서 사라지면 → "누가 `undefined`로 덮었나?"를 의심.** 서비스 메서드 맨 위에 `console.log(data)` 한 줄 찍어 "들어온 데이터"를 눈으로 확인하는 게 1번 진단법이다.

## 오늘의 정리

- **서버 검증은 방어선.** `ValidationPipe`(전역 Pipe) + class-validator 데코레이터 DTO로 잘못된 요청을 컨트롤러 진입 전에 400으로 막았다. `whitelist:true`로 잉여 필드도 걷어냄.
- DTO는 **런타임에 검증이 돌아야 해서 `class`**여야 한다. strict 모드에선 필드에 `!`(필수)·`?`(선택) 초기화 표시가 필요.
- PATCH에서 **`useDefineForClassFields` + class-transformer + `Object.assign`**이 겹쳐 안 보낸 필드가 `undefined`로 덮이는 버그를 진단·수정했다("온 필드만 반영").
- **다음에 이어서 할 것**: (선택) `PartialType`으로 DTO 중복 제거 → 전역 Exception Filter 커스터마이징으로 에러 응답 포맷 통일 → 단계 2(DB & Knex).
