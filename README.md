# learn-backend

> 프론트엔드 개발자가 **백엔드를 처음부터** 배워가는 학습 저장소.
> "게시판" 하나를 단계마다 키우면서 NestJS → DB → 인증 → Docker → MSA까지 도달하는 걸 목표로 한다.

React/Next로 API를 **호출하는 쪽**만 해오다가, 이제 **받아서 처리하는 쪽**(백엔드)을 배운다.
매 단계 배운 내용은 [`study-blog/`](./study-blog) 폴더에 학습 노트로 기록한다.

## 기술 스택 (최종 목표)

| 영역 | 사용 기술 |
|------|-----------|
| 프레임워크 | NestJS + TypeScript |
| DB | MySQL + **Knex**(쿼리빌더, ORM 아님) |
| 인증/캐시 | Redis 세션 |
| 아키텍처 | RabbitMQ 기반 MSA (API Gateway 패턴) |
| 배포 | Docker + 네이버 클라우드(NCR) |

> 지금은 1단계라 위 스택을 전부 쓰진 않는다. 표준 백엔드부터 차근차근 쌓아 마지막에 도달하는 목표.

## 학습 로드맵

0. **기반 다지기** — HTTP(서버 관점), REST, 요청→응답 생명주기, Node 런타임
1. **표준 NestJS** — Module/Controller/Service, DI, 데코레이터, 요청 파이프라인, DTO 검증
2. **DB & Knex** — SQL 기본, 쿼리빌더, 트랜잭션, 마이그레이션
3. **인증 · 실전 API** — 세션 vs JWT, Guard, 파일 업로드, 전역 Exception Filter
4. **Docker & 배포** — Dockerfile, 멀티스테이지 빌드, docker compose, 클라우드 배포
5. **MSA & 메시지큐** — API Gateway, RabbitMQ, `@MessagePattern`, 서비스별 DB 분리, Redis 캐시

> **지금 어디까지 했는지 / 다음 할 일**은 [`CLAUDE.md`](./CLAUDE.md)의 "진행 상황" 섹션과
> [`study-blog/`](./study-blog)의 최신 학습 노트에서 확인한다. (README는 진도를 따라 갱신하지 않는다)

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 모드 (파일 저장 시 자동 재시작)
npm run start:dev
```

서버는 기본적으로 `http://localhost:3000` 에서 뜬다.

```bash
# 동작 확인 예시
curl http://localhost:3000/posts
curl http://localhost:3000/posts/1
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"새 글","content":"내용"}'
```

## 폴더 구조

```
src/
  main.ts            # 진입점 (서버 부팅)
  app.module.ts      # 모듈 (조립 설명서)
  app.controller.ts  # 컨트롤러 (라우팅 / 접수창구)
  app.service.ts     # 서비스 (로직 / 데이터)
study-blog/          # 단계별 학습 노트 (블로그용 글)
CLAUDE.md            # 학습 로드맵 & 진행 상황 (AI 페어 학습용 지침)
```

---

*이 저장소는 학습 기록용입니다. 코드보다 [`study-blog/`](./study-blog)의 노트에 "왜 그렇게 했는지"가 정리되어 있습니다.*
