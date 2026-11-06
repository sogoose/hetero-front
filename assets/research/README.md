# RESEARCH 자료 교체 안내

이 페이지는 세 장의 가로 도판으로 구성됩니다. 세로로 스크롤하지 않습니다.

- 실제 내용과 이미지 경로: assets/research/research-data.json
- 페이지 구조: research.html
- 화면 디자인: research-page.css
- 지도 전환과 도상 확대: research-page.js

**대부분의 수정은 research-data.json 한 파일에서 끝납니다.** HTML과 JS는 수정하지 않아도 됩니다.

## 01 / DISTRIBUTION — 지도 4장

JSON의 maps 배열에서 각각 image 필드의 null을 업로드한 이미지 경로로 바꾸세요.

예: "image": "assets/research/maps/brick-1991.webp"

네 개의 지도 ID와 기본 색:
- combined / 종합 / 회색
- tile / 기와 / 적색
- brick / 벽돌 / 청색
- cast / 주물 / 녹색

image가 null이면 실제 공장 위치가 아닌 **자리표시용 도식**이 표시됩니다. 실제 연구 데이터를 나타내지 않습니다. 해당 지도 파일이 준비되면 자동으로 바뀝니다. 가능하면 원본 지도 네 장을 같은 비율로 PNG/WebP/SVG로 내보내세요.

지도 제목은 title, 버튼 이름은 label, 범례 대신 쓰는 요약은 description, 하단 출처는 caption입니다.

## 02 / PRODUCTION — 생산과 유통

JSON의 production.stages 배열에서 각 단계의 image를 교체하세요.

예: "image": "assets/research/process/merchant.webp"

원형 / 공장 / 건재상 / 시공자 / 혼종 주택의 다섯 단계를 기본으로 표시합니다.
label은 단계 이름, sub는 작은 부제목, description은 클릭해 확대했을 때 보이는 설명입니다.
image가 null이면 검은 선형 기본 도상이 표시됩니다. 현재 일부 단계는 기존 assets/archive 이미지로 시연합니다.
원래 전시 도면을 개별 부재 PNG/WebP 투명 배경으로 분리하면 가장 잘 어울립니다.

## 03 / TESTIMONY — 제작자 인터뷰

JSON의 testimonies.items 배열에서 이미지, 질문, 발언을 수정하세요.

- material: 벽돌 / 기와 / 주물
- question: 질문
- quote: 인용문
- speaker: 인터뷰이 / 출처
- image: 이미지 주소
- detail: 이미지를 클릭하면 열리는 설명
- href: 자세한 인터뷰 페이지 주소 (기본 interviews.html)

데스크톱에서는 세 열, 모바일에서는 탭으로 하나씩 보입니다.

## 권장 업로드 위치

assets/research/maps/combined-1991.webp
assets/research/maps/tile-1991.webp
assets/research/maps/brick-1991.webp
assets/research/maps/cast-1991.webp

assets/research/process/source.webp
assets/research/process/factory.webp
assets/research/process/merchant.webp
assets/research/process/site.webp
assets/research/process/house.webp

assets/research/interviews/brick.webp
assets/research/interviews/tile.webp
assets/research/interviews/cast.webp

파일과 폴더는 지금 미리 만들어 둘 필요가 없습니다. 새로운 이미지를 올릴 때 생성해도 됩니다.

**주의:** 경로는 research.html이 위치한 폴더를 기준으로 작성하고, 맨 앞에 슬래시(/)를 붙이지 마세요. GitHub Pages 배포 후 강력 새로고침을 해주세요.

화면은 좌우 화살표, 휠, 가로 스와이프, 하단 도판 선택으로 탐색합니다. 큰 이미지나 긴 글을 열었을 때만 상세 창 내부에서 스크롤할 수 있습니다.
