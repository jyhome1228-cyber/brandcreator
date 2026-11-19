# BRAMER · Firebase 관리자 연결

## 현재 완료된 범위

- `https://bramer.cloud/admin/` 또는 `https://bramer.cloud/#/admin`에 관리자 페이지가 준비됨
- 등록자/이용 기록 통계, 검색, 직업 필터, CSV 내보내기, 모바일 관리자 UI
- Firebase Authentication 이메일/비밀번호 로그인
- `admins/{uid}`의 `active: true` 여부 확인 후 Firestore 데이터 열람
- Firebase 미설정 시 **실제 데이터 없이** 빈 관리자 현황 표시

**중요:** 현재 BRAMER의 기존 베타 신청은 브라우저에만 저장되고 있습니다. Firebase를 연결한다고 기존 베타 신청 기록이 자동으로 옮겨지지 않으며, 실제 등록 및 이용 이벤트 기록은 다음 단계에서 별도 연동해야 합니다. 현재 `firestore.rules`는 베타테스터와 로그에 대해 관리자 읽기만 허용하고 클라이언트 쓰기를 막습니다. 데이터 기록은 이후 신뢰할 수 있는 서버 처리(Cloud Functions 또는 보안 규칙으로 제한된 별도 수집 경로)를 구성해야 합니다.

## 1. Firebase 프로젝트

Firebase Console에서 BRAMER 전용 프로젝트 생성 후 **Authentication → Sign-in method → 이메일/비밀번호** 활성화. **Cloud Firestore** 데이터베이스 생성. 브라우저 Web App 등록 후 Web API 키와 프로젝트 ID 확인.

## 2. Firebase 웹 앱 연결 (2026-11-19)

제공된 웹 앱 프로젝트 `bramer-16c27`의 공개 설정을 `src/firebaseWebConfig.ts`에 반영했습니다. Firebase 웹 API 키는 브라우저에서 사용되는 공개 구성값이며, 관리자 비밀번호 또는 서비스 계정 비밀키가 아닙니다. GitHub Actions의 별도 Variables 설정 없이 기본 연결이 가능합니다. 향후 다른 Firebase 프로젝트를 사용할 경우 `BRAMER_FIREBASE_PROJECT_ID`, `BRAMER_FIREBASE_API_KEY` 변수로 재정의할 수 있습니다.

현재 단계는 **브라우저의 Firebase 프로젝트 연결**이며 사용자 수집/Firestore 저장은 아직 실행되지 않습니다.

## 3. 관리자 로그인 활성화

1. Firebase Authentication의 Users에서 관리자 전용 계정 생성
2. 생성된 사용자의 UID 확인
3. Firestore의 `admins` 컬렉션에 **문서 ID = 관리자 UID**로 문서 생성
4. `active` 필드를 boolean 타입 `true`로 지정
5. Firebase Console → Firestore → Rules에 `firestore.rules` 적용 및 Publish
6. GitHub Actions에서 **Deploy Pages** 워크플로 재실행
7. 관리자 페이지에서 해당 이메일·비밀번호로 로그인하여 조회 확인

**관리자 이메일 또는 UID를 단순히 프런트엔드 코드에 비교하는 방식으로 권한을 부여하지 않습니다.** Firestore 보안 규칙에서 UID와 `active` 값을 검증해야 합니다.

## 4. 현재 관리자 읽기 데이터 구조

### `betaTesters/{autoId}`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | string | 성함 |
| `phone` | string | 연락처 |
| `occupation` | string | 직업 |
| `registeredAt` | timestamp 또는 ISO string | 가입 시각 |
| `lastActiveAt` | timestamp 또는 ISO string | 최근 이용 |
| `projectCount` | integer | 생성 프로젝트 수 |
| `guidelineCount` | integer | 생성 완료 횟수 |
| `status` | string | active 등 |

### `usageEvents/{autoId}`

| 필드 | 타입 | 설명 |
|---|---|---|
| `userId` | string | 사용자 식별값 |
| `event` | string | registration, login, project_created, guideline_generated, guideline_exported 등 |
| `createdAt` | timestamp 또는 ISO string | 기록 시각 |
| `projectName` | string | 프로젝트 이름(선택) |
| `detail` | string | 이벤트 간단 설명(선택) |

로그는 클릭마다 기록하기보다 최소한의 이벤트만 남기는 것이 좋습니다. 수집 시 개인정보 처리 목적, 기간, 삭제 및 접근 권한을 별도로 정해야 합니다.

## 5. 검증 주의사항

- 관리자 인증 없이 `betaTesters`와 `usageEvents`에 Firestore REST API로 접근하면 거부되어야 합니다.
- 일반 Firebase 사용자로 로그인해도 `admins/{uid}.active`가 없으면 거부되어야 합니다.
- 브라우저 관리자 화면의 잠금은 사용자 경험을 위한 것이며 실제 보안은 Firestore Security Rules에서 확보해야 합니다.
- 관리자 계정의 로그인 자격 증명은 채팅이나 GitHub 코드에 입력하거나 게시하지 마세요.


## 6. BRAMER 누적 방문 통계 (GitHub Pages + Firestore)

GitHub Pages 자체는 외부 운영 대시보드에 제공할 과거 누적 방문 기록 API가 없습니다. 이 기능은 BRAMER 홈페이지에서 Firebase Firestore에 **날짜별 집계만 기록**합니다.

**콘솔에서 반드시 설정해야 하는 두 단계:**

1. Firebase Console → Authentication → Sign-in method → **익명(Anonymous)** 활성화 후 저장
2. Firebase Console → Firestore Database → 규칙 탭 → GitHub의 [firestore.rules](firestore.rules) 최신 내용을 붙여넣고 **게시(Publish)**

기존 `admins`, `betaTesters`, `usageEvents` 규칙은 유지하면서 `visitDaily` 규칙만 추가되었습니다. 개인정보가 들어간 컬렉션의 보안을 해제해서는 안 됩니다.

### 방문 집계 정의

- `visitDaily/{YYYY-MM-DD}` 문서에 `day`, `visits`, `unique` **세 필드만** 저장
- `visits`: 같은 브라우저 탭에서 하루 한 번 기록하는 방문 횟수
- `unique`: 그 브라우저에서 해당 날짜 첫 방문으로 인식한 횟수 (정확한 사람 수 아님)
- 기준 날짜는 **Asia/Seoul**
- IP, 휴대전화 번호, 이름, 접속 URL, 개인별 방문 이력을 위 컬렉션에 저장하지 않음
- Firebase 익명 인증을 위해 브라우저에 Firebase 세션 토큰이 저장될 수 있음
- 관리자 `/#/admin` → 비밀번호 입력 → 누적 방문/오늘 방문/7일 추이/방문 기록/CSV 확인
- 관리자 미리보기 PIN은 개인정보 접근 인증이 아니므로, 베타테스터 개인정보는 계속 Firestore 규칙으로 보호됨
- **집계 활성화 시점 이후 데이터만 표시**되며, 과거 GitHub Pages 방문자 수는 소급 불가
- 브라우저 저장소 삭제, 다중 탭, 자동화된 트래픽 등으로 정확한 고유 방문자 수와 차이가 날 수 있음
- Firestore 문서를 읽고 쓰는 이벤트이므로 Firebase 무료 할당량과 사용량을 모니터링해야 함

### 동작 검사

콘솔 설정을 완료한 뒤 `https://bramer.cloud/`을 새로운 브라우저로 한 번 방문합니다. Firestore **데이터** 탭에서 `visitDaily` 컬렉션이 생성되고 날짜별 집계가 나타나는지 확인합니다. 그다음 `https://bramer.cloud/admin/` 접속 → `1228` 입력 → 누적 방문 및 방문 기록 화면을 확인합니다.

방문 기록이 안 나오면 관리자 대시보드의 설정 오류 문구를 확인하세요. 단순 홈페이지 새로고침은 같은 탭·같은 날짜에서는 중복 방문으로 기록되지 않습니다.

**보안 한계:** 익명 로그인은 사람의 신원을 확인하지 않으므로 위 집계는 편의용 통계입니다. 자동화된 요청에 의한 수치 조작을 확실히 막으려면 추후 Cloud Functions 등의 신뢰할 수 있는 서버에서 집계하고 App Check 및 악용 방지 조치를 추가해야 합니다.
