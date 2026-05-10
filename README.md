# WMS 교육용 플랫폼

GitHub Pages에 업로드해서 바로 확인할 수 있는 정적 웹 프로젝트입니다.

## 목적

일반적인 WMS 업무 흐름을 교육용 화면으로 이해하기 위한 프로젝트입니다. 별도 데이터베이스를 사용하지 않고 `data/*.json` 파일을 기준 데이터로 사용합니다. 브라우저에서 등록, 수정, 삭제한 데이터는 `localStorage`에 저장됩니다.

## 포함 화면

- 로그인
- 회원가입
- 대시보드
- 입고 관리
- 출고 관리
- 재고 현황
- 입출고 이력
- 품목 관리
- 창고 위치 관리
- 사용자 관리

## 동작 기능

- 회원가입
- 로그인 / 로그아웃
- 입고 등록 / 삭제 / 상세 조회
- 출고 등록 / 삭제 / 상세 조회
- 품목 등록 / 수정 / 삭제
- 창고 위치 등록 / 수정 / 삭제
- 사용자 등록 / 수정 / 삭제
- 검색 / 초기화
- 페이지네이션
- CSV 형식 엑셀 다운로드
- 입고완료 등록 시 재고 증가
- 출고완료 등록 시 재고 차감
- 브라우저 localStorage 데이터 초기화

## 샘플 로그인

```text
이메일: admin@wms.com
비밀번호: 1234
```

## GitHub Pages 배포 방법

1. GitHub 저장소 생성
2. 이 프로젝트 파일 전체 업로드
3. 저장소 Settings 이동
4. Pages 메뉴 선택
5. Branch를 `main`, Folder를 `/root`로 설정
6. 배포 URL 접속

## 데이터 구조

```text
data/users.json       사용자 데이터
data/products.json    품목 마스터
data/locations.json   창고 위치 마스터
data/inbound.json     입고 데이터
data/outbound.json    출고 데이터
data/inventory.json   재고 데이터
```

## 주의사항

GitHub Pages는 정적 호스팅이므로 브라우저에서 JSON 파일을 직접 수정해 GitHub에 다시 저장하지는 않습니다. 실습 중 등록한 데이터는 현재 브라우저의 localStorage에 저장됩니다. 서버 저장 기능이 필요하면 이후 Node.js, Express, GitHub API, Firebase, Supabase 중 하나로 확장할 수 있습니다.
