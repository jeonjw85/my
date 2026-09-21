# MY

파일 공유와 개발자 유틸을 넣은 Next.js 개인 서버

## 기능

- 파일 공유: 링크 업로드, 만료, 1회 다운로드, 비밀번호
- 내 저장소 (`/my`): 개인 파일 보관함 (로그인)
- 개발자 유틸 (`/util`): 로그인 필요
- 관리자 (`/admin`): 파일, 접속 로그 (로그인)

## 스택

- [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript
- [Prisma](https://www.prisma.io) + SQLite
- [Auth.js (NextAuth v5)](https://authjs.dev) + Authentik OIDC
- Tailwind CSS 4

## 로컬 실행

`.env.local`

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
npm run db:migrate
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

기본 포트 3000. `APP_PORT`로 변경 가능. 시작 시 `prisma migrate deploy` 자동 실행

## 배포 및 마이그레이션 복구

SQLite 파일의 위치를 먼저 확인한다. 로컬의 `DATABASE_URL=file:./dev.db`는 현재 셸이 아니라 `prisma/schema.prisma` 기준으로 해석되므로 `prisma/dev.db`를 가리킨다. Docker에서는 `/app/data/dev.db`를 사용한다. 작업 명령은 실수를 줄이기 위해 항상 절대 경로를 변수로 지정한다.

```bash
export DB_PATH="/absolute/path/to/dev.db"
export DATABASE_URL="file:$DB_PATH"
```

새 데이터베이스 또는 정상 데이터베이스에는 다음 표준 배포 명령을 사용한다. `20260920120000_complete_schema`를 포함한 모든 마이그레이션을 적용한다.

```bash
npm run db:migrate
```

### `File.password` 드리프트 복구

`File.password` 열은 실제 SQLite 파일에 있지만 `_prisma_migrations`에 `20260918111000_add_file_password` 기록이 없는 경우에만 아래 절차를 따른다. 쓰기를 중지하고, 애플리케이션과 배치 작업이 데이터베이스에 연결하지 않도록 한 뒤 시작한다.

먼저 복사본을 만든다.

```bash
cp "$DB_PATH" "$DB_PATH.backup"
```

그 다음 열과 마이그레이션 기록을 각각 확인한다.

```bash
sqlite3 "$DB_PATH" "PRAGMA table_info('File');"
sqlite3 "$DB_PATH" "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = '20260918111000_add_file_password';"
```

첫 명령 결과에 `password` 열이 있고, 두 번째 명령이 아무 행도 반환하지 않는 경우에만 누락된 기록을 적용 완료로 표시한다. 열이 없으면 `migrate resolve`를 실행하지 않는다.

```bash
npx prisma migrate resolve --applied 20260918111000_add_file_password
npm run db:migrate
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
sqlite3 "$DB_PATH" "PRAGMA integrity_check; PRAGMA foreign_key_check;"
```

`migrate diff`는 차이가 없을 때 종료 코드 0을 반환한다. `integrity_check`는 `ok`여야 하고 `foreign_key_check`는 아무 행도 반환하지 않아야 한다. 가치 있는 데이터베이스에는 `migrate reset`이나 `db push`를 사용하지 않는다. 두 명령은 마이그레이션 이력을 우회하거나 데이터를 잃게 할 수 있다.

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
