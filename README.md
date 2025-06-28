# 🎯 Perfect Circle

완벽한 원을 그리기 위한 **싱글 플레이 / 실시간 2인 대결** 웹 애플리케이션입니다. 순수 손으로 그린 원의 '둥글기'를 측정해 점수를 매기거나, 친구와 30초 동안 더 높은 점수를 노리는 멀티플레이 모드로 겨뤄 보세요!

<p align="center">
  <img src="public/globe.svg" width="120" alt="Perfect Circle logo" />
</p>

> **Live Demo** (배포 주소가 있다면 링크를 넣어 주세요)

---

## ✨ 주요 기능

| 기능                | 설명                                                               |
| ------------------- | ------------------------------------------------------------------ |
| 🎮 싱글 플레이      | 캔버스에 원을 그리고 즉시 점수를 확인합니다.                       |
| 🤝 2인 멀티플레이   | Peer-to-Peer(웹RTC 기반)로 실시간 대결을 진행합니다.               |
| 🏆 랭킹 보드        | Supabase 를 이용해 점수를 저장하고 상위 랭킹을 확인할 수 있습니다. |
| 📊 다양한 승리 조건 | 총점 · 최고 점수 중 원하는 룰을 선택할 수 있습니다.                |
| 📱 반응형 UI        | 모바일·데스크톱 모두 최적화된 경험을 제공합니다.                   |
| 🌗 다크 모드        | Tailwind CSS 테마를 활용한 라이트/다크 모드를 지원합니다.          |

---

## 🖼️ 스크린샷

| 싱글 플레이                                         | 멀티플레이(데스크톱)                                    | 멀티플레이(모바일)                                              |
| --------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| ![single](https://placehold.co/240x160?text=Single) | ![multi-pc](https://placehold.co/240x160?text=Multi+PC) | ![multi-mobile](https://placehold.co/240x160?text=Multi+Mobile) |

> 실제 화면으로 교체해 주세요. GIF 를 넣으면 더 좋습니다!

---

## 🏗️ 기술 스택

- **Next.js 14** · App Router
- **TypeScript**
- **Tailwind CSS** · Shadcn/UI 컴포넌트
- **PeerJS** – WebRTC 데이터 채널 간소화
- **Supabase** – PostgreSQL 기반 랭킹 저장소
- **Framer Motion** – UI 애니메이션

---

## ⚙️ 로컬 실행 방법

```bash
# 1. 저장소 클론
$ git clone https://github.com/yourname/perfect-circle.git
$ cd perfect-circle

# 2. 의존성 설치
$ npm install

# 3. 환경 변수 설정
# .env.local 파일을 생성한 뒤 다음 값을 채워 넣습니다.
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. 개발 서버 실행
$ npm run dev
# http://localhost:3000 에서 확인하세요.
```

### 배포

Vercel 과 같은 플랫폼에 손쉽게 배포할 수 있습니다. Supabase 환경 변수만 제공하면 DB 설정은 따로 필요하지 않습니다.

---

## 📂 프로젝트 구조(주요)

```
src/
  app/           # Next.js app router 페이지·API 라우트
  components/    # 재사용 가능한 UI · 기능 컴포넌트
  lib/           # Supabase 클라이언트, 유틸리티
public/          # 정적 자산 (아이콘·이미지)
```

---

## 🙌 기여 방법

1. 이슈를 확인하거나 새로운 이슈를 등록합니다.
2. `git checkout -b feat/awesome-feature` 로 브랜치를 만듭니다.
3. 커밋 메시지 컨벤션을 지켜 주세요 (ex. Conventional Commits).
4. PR 을 보내면 리뷰 후 머지됩니다.

---

## 📝 라이선스

MIT © 2024 Your Name
