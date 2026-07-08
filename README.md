# MY

파일공유, 팀 채널, 개발자 유틸리티를 넣은 Next.js 기반 내 서버

## 주요 기능

- 파일 공유 — 링크/공유코드 기반 파일 업로드, 만료 시간, 1회 다운로드, 비밀번호 보호
- 팀 저장소 / 팀 채널 — 공유코드로 접근하는 팀 메모·공지·실시간 메시지 보드
- 내 저장소 (`/my`, 로그인 필요) — 개인 파일 보관함
- 개발자 유틸리티 (`/util`, 로그인 필요)
- 관리자 패널 (`/admin`, 로그인 필요) — 공유 코드, 파일, 접속 로그 관리

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma](https://www.prisma.io) + SQLite
- [Auth.js (NextAuth v5)](https://authjs.dev) — Authentik OIDC 프로바이더
- Tailwind CSS 4

## 시작하기

### 1. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 채웁니다.

| 변수                                              | 설명                                                   |
| ------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                                    | SQLite 파일 경로                                       |
| `AUTH_SECRET`                                     | Auth.js 세션 암호화 키 (`npx auth secret`로 생성 가능) |
| `AUTH_URL`                                        | 배포 도메인                                            |
| `AUTH_TRUST_HOST`                                 | 리버스 프록시 뒤에서 실행 시 `true`                    |
| `AUTHENTIK_CLIENT_ID` / `AUTHENTIK_CLIENT_SECRET` | Authentik OIDC 앱의 클라이언트 ID/Secret               |
| `AUTHENTIK_ISSUER`                                | Authentik OIDC issuer URL                              |

### 2. 설치 및 DB 마이그레이션

```bash
npm install
npx prisma migrate deploy
```

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)

### 4. 프로덕션 빌드

```bash
npm run build
npm run start
```

## Docker로 배포하기

`.env`/`.env.local`을 준비한 뒤 다음 명령으로 실행합니다.

```bash
docker compose up -d --build
```

- 기본 포트는 3000이며 `APP_PORT` 환경변수로 변경가능
- 컨테이너 시작 -> `docker-entrypoint.sh`가 `prisma migrate deploy`를 자동으로 실행

## 프로젝트 구조

```
app/            라우트 (페이지 + API)
  admin/        관리자 패널
  api/          REST API Route
  util/         Utility Page
components/     공용 UI Component
lib/            인증, DB, 로그, SSRF 방어 공용 로직
prisma/         스키마 및 마이그레이션
```
