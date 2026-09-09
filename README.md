# MY

파일 공유, 팀 채널, 개발자 유틸을 넣은 Next.js 개인 서버.

## 기능

- 파일 공유: 링크/공유코드 업로드, 만료, 1회 다운로드, 비밀번호
- 팀 저장소 / 팀 채널: 공유코드로 메모, 공지, 실시간 메시지
- 내 저장소 (`/my`): 개인 파일 보관함 (로그인)
- 개발자 유틸 (`/util`): 로그인 필요
- 관리자 (`/admin`): 공유 코드, 파일, 접속 로그 (로그인)

## 스택

- [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript
- [Prisma](https://www.prisma.io) + SQLite
- [Auth.js (NextAuth v5)](https://authjs.dev) + Authentik OIDC
- Tailwind CSS 4

## 로컬 실행

`.env.local`에 아래 값을 넣는다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | SQLite 경로 |
| `AUTH_SECRET` | Auth.js 세션 키 (`npx auth secret`) |
| `AUTH_URL` | 배포 도메인 |
| `AUTH_TRUST_HOST` | 리버스 프록시면 `true` |
| `AUTHENTIK_CLIENT_ID` / `AUTHENTIK_CLIENT_SECRET` | Authentik OIDC 클라이언트 |
| `AUTHENTIK_ISSUER` | Authentik OIDC issuer |

```bash
npm install
npx prisma migrate deploy
npm run dev
```

[http://localhost:3000](http://localhost:3000)

프로덕션:

```bash
npm run build
npm run start
```

## Docker

`.env` / `.env.local` 준비한 뒤:

```bash
docker compose up -d --build
```

기본 포트 3000. `APP_PORT`로 변경 가능. 시작 시 `prisma migrate deploy` 자동 실행.

## 구조

```
app/            라우트
  admin/        관리자
  api/          API
  util/         유틸 페이지
components/     UI
lib/            인증, DB, 로그, SSRF 방어
prisma/         스키마, 마이그레이션
```
