# BRAMER 베타 인증 전환 배포

GitHub 웹 코드는 Firebase 전화번호 인증(문자 OTP), Firestore 문서 접근, 기존 익명 가입자 데이터 이전을 지원합니다.

## Firebase 콘솔에서 필요한 설정
1. Firebase 프로젝트 `bramer-16c27`에서 Authentication > 로그인 방법 > **전화번호** 활성화
2. Authentication > 설정 > 승인된 도메인에 `bramer.cloud` 및 `www.bramer.cloud` 등록
3. Firebase SMS 서비스 사용을 위한 지역 정책, SMS 발송 한도 및 요금제 확인
4. Firestore 규칙 게시: `firebase deploy --only firestore:rules --project bramer-16c27`
5. 기존 익명 가입 데이터 연결용 Functions 배포: `cd functions && npm install && cd .. && firebase deploy --only functions:recoverBetaAccount --project bramer-16c27`
6. Firebase Functions 배포에는 사용 가능한 요금제와 배포 권한이 필요합니다.

## 데이터 처리
- 기존 `betaTesters/{anonymousUid}` 문서를 삭제하거나 공개하지 않습니다.
- 문자 인증된 계정은 `betaTesters/{phoneAuthUid}` 문서를 사용합니다.
- `recoverBetaAccount`는 관리자 권한으로 기존 가입 이력을 검색하지만, **Firebase가 인증한 전화번호가 일치하는 경우에만** 기존 데이터를 안전하게 새로운 사용자 UID에 연결합니다.
- 이름과 전화번호만 아는 익명 사용자가 기존 등록 기록을 읽을 수 없도록 유지합니다.
- 기존 브라우저의 로컬 로그인 방식은 전환기 호환성을 위해 남아 있습니다.

## 테스트
- Firebase 프로젝트 테스트 전화번호 또는 실제 SMS 번호를 통해 첫 가입/같은 기기 재로그인/새 기기 재로그인 검증
- 기존 익명 가입자에 대해 OTP 인증 후 `recoverBetaAccount` 연결 및 관리자 화면 중복/이전 상태 확인
- Firestore 규칙 시뮬레이터에서 익명 사용자 list 거부, 타인 uid get 거부, phone user 자기 문서 get/create 허용 검증

**주의:** GitHub에 코드만 반영하는 것으로 Firestore 규칙이나 Cloud Function이 자동 배포되지는 않습니다. Firebase 콘솔 설정과 배포 및 실제 SMS 검증을 별도로 완료해야 합니다.
