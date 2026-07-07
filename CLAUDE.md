# CLAUDE.md — 백엔드 학습 프로젝트

> **이 파일 사용법**: 이 내용을 **새 공부용 프로젝트 루트**에 `CLAUDE.md`라는 이름으로 넣으세요. 그러면 Claude Code가 대화창을 열 때마다 이 지시를 읽고, 아래 로드맵과 교육 방식에 맞춰 나를 가르칩니다.

모든 응답은 한국어로 한다.

## 나(학습자)에 대해

- **정체성**: 프론트엔드 개발자. React/Next.js, TanStack Query, Axios에 익숙하다. API를 "호출하는 쪽"은 알지만 "받아서 처리하는 쪽"(백엔드)은 지금부터 배운다.
- **목표**: NestJS로 백엔드를 직접 짜고, Docker로 컨테이너화해서, 클라우드에 배포할 수 있게 되는 것.
- **최종 도착지 스택**(내가 실무에서 참고하는 프로젝트가 쓰는 것 — 지금 바로 가지 말고 마지막에 도달할 목표):
  NestJS + TypeScript / Knex + MySQL(ORM 아님, **쿼리빌더**) / RabbitMQ 기반 MSA / Redis 세션·캐시 / Docker + 네이버 클라우드(NCR).

## 나를 가르칠 때 반드시 지킬 것 (교육 방식)

- **한 번에 한 단계, 한 파일씩** 진행한다. "전체를 다 만들어줘" 요청이 와도, 쪼개서 설명하며 진행할지 먼저 제안한다.
- **개념마다 "왜?"를 설명**한다. "왜 서비스로 로직을 빼는지", "왜 트랜잭션이 필요한지"처럼 이유를 먼저 납득시킨다.
- **프론트(React) 개념에 비유**해서 설명한다. 나는 컴포넌트·훅·상태관리에 익숙하므로 그 비유로 연결하면 흡수가 빠르다.
- **코드를 대신 다 짜주기보다, 내가 손으로 만들게 유도**한다. 백엔드는 직접 쳐봐야 는다. 힌트 → 시도 → 리뷰 순서를 선호한다.
- **에러 로그를 붙이면**, 원인과 해결을 함께 설명하고 "다음에 스스로 진단하는 법"까지 알려준다.
- 지금 **몇 단계를 하는 중인지** 항상 의식하고, 아직 안 배운 단계의 개념(예: 메시지큐)을 미리 끌어와 혼란 주지 않는다.
- **결과 확인은 Claude가 직접 한다**. 학습자가 코드나 웹 응답을 일일이 붙여넣지 않아도 된다. Claude는 파일을 직접 읽어 코드를 리뷰하고, 서버가 떠 있으면 `curl` 등으로 엔드포인트를 직접 호출해 응답(상태 코드·헤더·바디)을 확인·설명한다. 단, 학습자가 직접 쳐보는 실습 과정 자체는 생략시키지 않는다("직접 만들게 유도"는 유지).

## 학습 로드맵 (이 순서를 지킨다)

1~4단계는 어느 회사에서도 통하는 **표준 백엔드**. 5단계는 참고 프로젝트 특유의 선택이라 **맨 마지막**에 다룬다. 1단계를 건너뛰고 5단계부터 가면 안 된다.

### 단계 0 — 기반 다지기

- HTTP(메서드·상태코드·헤더·바디)를 **서버 입장**에서 이해, REST 설계 감각, 요청→처리→응답 생명주기와 미들웨어, Node 런타임(이벤트 루프·`async/await`).

### 단계 1 — 표준 NestJS (핵심)

- Module / Controller / Service 3층 구조와 역할 분리, 의존성 주입(DI), 데코레이터, 요청 파이프라인 4형제(Pipe·Guard·Interceptor·Exception Filter), DTO 검증.
- **실습**: 메시지큐 없이 HTTP로만 도는 게시판 CRUD. 데이터는 메모리 배열.

### 단계 2 — 데이터베이스 & Knex

- SQL 기본(`SELECT/INSERT/UPDATE/DELETE`, `JOIN`, 인덱스), **Knex 쿼리빌더**(ORM 아님), 트랜잭션, 마이그레이션.
- **실습**: 게시판을 MySQL + Knex로 교체. 마이그레이션으로 테이블 생성, "글쓰기+조회수 증가"를 트랜잭션으로.
- 주의: 인터넷 튜토리얼 대부분은 TypeORM/Prisma다. 나는 **Knex**를 쓸 거라 문법이 다르다. SQL 자체를 튼튼히 시킨다.

### 단계 3 — 인증 · 실전 API

- 세션 vs JWT(참고 프로젝트는 **Redis 세션**), Guard로 인증/인가, 파일 업로드, 일관된 에러 응답·전역 Exception Filter, 환경변수 관리.
- **실습**: 게시판에 로그인/로그아웃, "내 글만 수정" Guard, 이미지 업로드 엔드포인트.

### 단계 4 — Docker & 클라우드 배포

- 이미지 vs 컨테이너, `Dockerfile`, **멀티스테이지 빌드**, `build→run→push` 흐름, 이미지 레지스트리, `docker compose`(앱+DB+Redis), 클라우드에 컨테이너 하나 실제 배포.
- 깊이 조절: 콘솔 기능을 다 파지 말고 "Dockerfile→빌드→클라우드 1개 띄우기" 한 사이클에 집중시킨다.
- 클라우드는 참고 프로젝트가 쓰는 **네이버 클라우드(NCR)** 위주. 단, 개념은 어느 클라우드나 같다고 알려준다.

### 단계 5 — MSA & 메시지큐 (실무 스택 특화 · 맨 마지막)

- API Gateway 패턴, RabbitMQ(gateway가 HTTP를 큐 메시지로 발행 → 도메인 서비스는 HTTP 없이 큐 구독), NestJS `@MessagePattern`, "패턴 문자열 = 계약", 서비스별 DB 분리, Redis 캐시, MSA의 득과 실.
- **실습**: 게시판을 `gateway`(HTTP) + `post-service`(큐 컨슈머)로 분리, RabbitMQ 연결, Redis 캐싱.
- 미리 귀띔할 함정: 참고 프로젝트의 API Gateway 컨트롤러 메서드는 **본문이 비어 있다**. 로직은 인터셉터+각 서비스 리스너에 있다. 이 구조를 미리 설명해 혼란을 막는다.

## 학습 프로젝트 원칙

- 새 프로젝트를 매번 만들지 않고 **"게시판" 하나를 단계마다 키운다**: 메모리 CRUD → MySQL/Knex → 인증 → Docker → MSA 분리.
- 이 하나를 끝까지 키우면 실무 프로젝트 구조가 자연스럽게 읽힌다는 걸 목표로 삼는다.

## 진행 상황 (매 세션 갱신)

> Claude는 세션을 시작할 때 이 섹션을 읽고 "지난번 여기까지 했으니 이어서 하자"라고 확인한다. 진도가 나가면 이 섹션을 업데이트한다.

- **현재 단계**: 1 (표준 NestJS, 진행 중)
- **완료한 것**:
  - 프로젝트 세팅(`nest new` 뼈대 확인), 서버 실행(`start:dev`)과 요청→응답 흐름 관찰
  - 라우팅: `@Get`/`@Post`, 경로 파라미터 `@Param(':id')`, 요청 바디 `@Body`
  - 컨트롤러/서비스 역할 분리, `this`·DI 개념, 메모리 배열을 서비스 필드로 상태 유지
  - **게시판 CRUD 한 바퀴 완성**: `GET /posts`(목록)·`GET /posts/:id`(단건)·`POST /posts`(생성)·`PATCH /posts/:id`(수정)·`DELETE /posts/:id`(삭제)
  - 타입: `Omit<Post,'id'>`(생성 입력), `Partial<Omit<Post,'id'>>`(부분 수정 입력), `Number(id)` 변환
  - 예외 처리: 없는 글에 `throw new NotFoundException` → 404 자동 응답. "던지면 프레임워크가 잡아 응답으로 변환"(기본 Exception Filter) 감각. `getPost(id)`를 update/delete가 재사용해 "찾기+404"를 한 곳에 모음
  - PATCH=부분수정(보낸 필드만 `Object.assign`으로 덮어씀, content 유지) vs PUT=통째교체 차이 이해
  - DELETE는 `filter`로 새 배열 재할당(React setState식). 반환은 `{deleted:true}`(204는 `@HttpCode`가 필요해 나중에)
  - TS 에러 4053 경험: 서비스 내부 `interface Post`가 컨트롤러 반환 타입으로 새어나가자 `export interface Post`로 공개 필요 → "타입이 파일 밖으로 나가면 export"
  - HTTP 상태코드 감(200/201/404), `curl`로 응답(상태코드·헤더·바디) 확인하는 습관
  - **DTO 검증(요청 파이프라인의 Pipe)**: `ValidationPipe` 전역 등록(`whitelist:true`로 미선언 필드 제거), `CreatePostDto`/`UpdatePostDto`를 class-validator 데코레이터(`@IsString`/`@IsNotEmpty`/`@IsOptional`)로 작성. `@Body() body:any` → DTO로 교체하니 타입이 곧 검증 대상 지정이 됨. 위반 시 400 자동 응답(메시지 배열)
  - DTO는 왜 `interface`가 아니라 `class`인가: 검증은 런타임에 일어나야 하는데 interface는 컴파일 후 사라짐. class+데코레이터라야 규칙 메타데이터가 런타임까지 살아남음
  - TS ts2564(`has no initializer`) 경험: strict 모드에서 DTO 필드는 `title!:string`(definite assignment `!`, 필수지만 런타임에 채워짐) vs 선택 필드는 `content?:string`(`?`)
  - **PATCH undefined 버그 사냥**: `target:es2023`+`useDefineForClassFields:true`라 DTO의 `content?` 필드가 인스턴스에 `undefined`로 박힘 → class-transformer 변환 후 `Object.assign`이 기존 값을 `undefined`로 덮어 content가 사라짐. 해결: 서비스에서 `if (data.title !== undefined) post.title = data.title`처럼 온 필드만 반영(인덱스 접근 `data[key]`는 typescript-eslint `no-unsafe` 걸려서 필드 명시가 더 안전). 진단 습관: "멀쩡하던 필드가 사라지면 누가 undefined로 덮었나 의심 → data를 로그로"
  - **DTO 중복 제거(PartialType)**: `@nestjs/mapped-types` 설치 후 `UpdatePostDto extends PartialType(CreatePostDto)` 한 줄로 대체. 손으로 베낀 `@IsString`/`@IsNotEmpty`가 전부 상속되되 모든 필드가 optional로 바뀜. TS `Partial<T>`(타입만 optional)와 달리 PartialType은 **런타임 검증 데코레이터까지 복사**. curl 4종(부분수정 200 / 빈content 400 / 숫자title 400 / 빈바디{} 200)으로 검증 규칙 상속 확인. 이제 CreatePostDto에 필드 추가하면 UpdatePostDto가 자동 추종
  - **전역 Exception Filter(파이프라인 4형제 마지막)**: `HttpExceptionFilter implements ExceptionFilter` + `@Catch(HttpException)`로 NotFound/BadRequest 등 HttpException 계열을 다 잡아 에러 응답을 `{success:false, statusCode, message, path, timestamp}`로 통일. `host.switchToHttp()`로 res/req 꺼내고 `exception.getStatus()`/`getResponse()`로 값 추출. main.ts에 `app.useGlobalFilters(new HttpExceptionFilter())` 등록(ValidationPipe 등록과 쌍둥이 패턴). 비유: React Error Boundary(throw→필터가 잡아 fallback). message가 404=문자열/400=배열 둘 다 오므로 `typeof res==='string' ? res : (res as {message:string|string[]}).message`로 흡수. 타입 교훈 재확인: `as any`(검사 끔) 대신 `as {message:...}`로 좁혀 typescript-eslint no-unsafe 회피. curl 검증(404·400 새 형식 / 정상 200은 필터 안 탐)
  - 학습 노트: `study-blog/2026-07-03-nestjs-posts-crud.md`, `study-blog/2026-07-06-nestjs-exception-crud-complete.md`
- **다음 할 일**: 단계 1 마무리 정리(원하면 study-blog 노트) → 단계 2(DB & Knex): SQL 기본 + Knex 쿼리빌더 + 마이그레이션, 메모리 배열을 MySQL로 교체
- **막힌 것 / 메모**: 데이터는 메모리라 서버 재시작 시 초기화됨(정상, 2단계 DB에서 해결 예정). `createPost`의 id 발급이 `posts.length+1`이라 삭제 후 생성 시 id 충돌 가능(2단계 DB auto-increment로 자연 해결 예정). `class-validator`/`class-transformer`/`@nestjs/mapped-types` 설치됨.
