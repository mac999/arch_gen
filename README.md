# Arch-Gen - 건축 개념설계 자동화 웹 앱

CSV 데이터 입력을 통해 건축 초기 개념설계(매스, 평면)를 자동화하고, 사용자가 이를 직관적으로 편집하여 결과물을 리포트로 추출할 수 있는 웹 애플리케이션입니다.

## 주요 특징

- **자동 설계 생성**: CSV 파일 업로드만으로 3D 매스와 2D 평면도 자동 생성
- **직관적 편집**: 드래그 앤 드롭으로 벽체, 문, 창문 편집
- **실시간 피드백**: 편집 즉시 면적 및 정보 업데이트
- **Undo/Redo**: 모든 편집 작업에 대한 실행 취소/다시 실행 지원
- **로컬 저장**: 브라우저 Local Storage를 활용한 프로젝트 저장

## 기술 스택

- **프레임워크:** Vue.js 3 + Vite
- **상태 관리:** Pinia (히스토리 관리 포함)
- **2D 캔버스:** Konva.js (고급 편집 기능)
- **GIS 맵:** Leaflet.js (3D 매스 시각화)
- **CSV 파싱:** PapaParse.js

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 프로덕션 빌드

```bash
npm run build
```

## 주요 기능

### 1. 대시보드
- 프로젝트 목록 카드 뷰
- CSV 파일 드래그 앤 드롭 업로드
- Local Storage 기반 프로젝트 자동 저장/불러오기

### 2. 매스 설계
- Leaflet.js 기반 3D 건물 매스 시각화
- 층별, 공간별 색상 구분
- 각 공간에 이름과 면적 텍스트 표시
- 인터랙티브 지도 (확대/축소, 드래그)

### 3. 층별 설계 (고급 편집 기능)

#### 선택 모드
- **줌/팬**: 마우스 휠로 확대/축소, 드래그로 이동
- **정점 추가**: 벽체 더블클릭으로 새 정점 추가
- **정점 삭제**: 정점 핸들 더블클릭으로 삭제
- **정점 이동**: 정점 핸들 드래그로 벽체 이동
- **그리드 스냅**: 정점이 그리드에 자동으로 정렬

#### 건축 표준 렌더링
- **이중선 벽체**: 실제 벽 두께를 표현하는 이중선 방식
- **문 심벌**: 열리는 방향을 나타내는 호(Arc) 포함
- **창문 심벌**: 표준 건축 도면 창호 표기법

### 4. 실행 취소/다시 실행
- 모든 편집 작업 히스토리 관리 (최대 50단계)
- 단축키 지원: Ctrl+Z (실행 취소), Ctrl+Y (다시 실행)
- 헤더 버튼으로 간편 실행

### 5. 프로젝트 저장
- 저장 버튼 또는 Ctrl+S로 Local Storage에 저장
- 자동 저장: 편집 시 자동으로 저장
- 앱 재시작 후에도 프로젝트 유지

### 6. 리포트 출력
- 프로젝트 데이터를 CSV로 집계
- 층별 공간 유형, 면적, 개수 통계
- 문, 창문 개수 통계

## 지원 공간 유형

### 업무 공간
- 사무공간 (office)
- 회의실 (meeting)
- 창고 (storage)

### 주거 공간
- 거실 (livingroom)
- 주방 (kitchen)
- 침실 (bedroom)
- 드레스룸 (dressroom)
- 욕실 (bathroom)

### 공용 공간
- 복도 (corridor)
- 휴게실 (rest)

## CSV 입력 형식

프로젝트 생성을 위해 다음 형식의 CSV 파일이 필요합니다:

```csv
project_name,site_area,gross_floor_area,num_floors,room_type_ratios
오피스 빌딩,1000,3000,3,"office:0.5,meeting:0.2,corridor:0.15,rest:0.1,storage:0.05"
주거 아파트,800,2400,3,"livingroom:0.3,bedroom:0.25,kitchen:0.15,bathroom:0.15,corridor:0.15"
```

### 필수 필드:
- `project_name`: 프로젝트 이름
- `site_area`: 대지면적 (m²)
- `gross_floor_area`: 연면적 (m²)
- `num_floors`: 층수
- `room_type_ratios`: 공간 유형별 비율
  - 업무: office, meeting, storage, rest, corridor
  - 주거: livingroom, kitchen, bedroom, dressroom, bathroom

샘플 CSV 파일은 `sample_project.csv`를 참고하세요.

## 프로젝트 구조

```
arch_gen/
├── src/
│   ├── assets/          # CSS 및 정적 자산
│   ├── components/      # Vue 컴포넌트
│   │   ├── AppHeader.vue (업데이트: Undo/Redo, 저장 버튼)
│   │   └── AppLayout.vue
│   ├── stores/          # Pinia 스토어
│   │   └── project.js (업데이트: History, Local Storage)
│   ├── utils/           # 유틸리티 함수 (NEW!)
│   │   └── spaceTypes.js (공간 유형 정의)
│   ├── views/           # 페이지 컴포넌트
│   │   ├── Dashboard.vue
│   │   ├── MassDesign.vue (업데이트: 공간 정보 텍스트)
│   │   └── FloorDesign.vue (대폭 업데이트: 고급 편집 기능)
│   ├── router/          # Vue Router 설정
│   │   └── index.js
│   ├── App.vue
│   └── main.js (업데이트: Storage 로드)
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 키보드 단축키

- `Ctrl + Z`: 실행 취소
- `Ctrl + Y` 또는 `Ctrl + Shift + Z`: 다시 실행
- `Ctrl + S`: 프로젝트 저장
- `마우스 휠`: 줌 인/아웃 (선택 모드)
- `마우스 드래그`: 캔버스 이동 (선택 모드)

## 향후 개선사항

- 완전한 정점 편집 로직 (벽 분할/합병)
- 문/창문 회전 및 크기 조절
- 3D 매스 뷰 개선
- 서버 기반 프로젝트 저장
- 다중 프로젝트 비교
- PDF 리포트 출력
- 건축 법규 검증
