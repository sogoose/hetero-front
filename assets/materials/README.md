# MATERIALS / 혼종의 정면

재료 아카이브: https://sogoose.github.io/hetero-front/materials.html

## 작업 방식

- 원본 PNG는 이 폴더에 보존합니다. 삭제하거나 덮어쓰지 않습니다.
- `stickers.json`은 현재 가로로 펼쳐지는 60개 누끼 이미지의 순서, 표시명, 카테고리, 크기, 회전과 위치를 관리합니다.
- 사이트에서 사용하는 압축 WebP 이미지는 `optimized/sticker-XX.webp`입니다. 2026-11-03 기준 60개 중 57개를 자동 압축했습니다. 이미 가벼운 벽돌 표본 PNG 3개는 원본을 사용합니다.
- `stickers.json`에는 `original` (원본 PNG)와 `image` (사이트에서 보여주는 WebP 또는 가벼운 원본)가 모두 들어 있습니다.
- 새 이미지로 바꾸려면 해당 `original` 경로의 파일을 교체한 뒤 `Optimize material cutouts` GitHub Action을 수동 실행할 수 있습니다. 해당 Action은 원본 PNG를 수정하지 않고 화면용 WebP만 갱신합니다.
- 웹사이트는 화면 가까이에 있는 스티커만 불러옵니다. 이미지의 흰색 누끼 외곽선과 그림자는 `materials-scroll.css`에서 조정합니다.
- 작업대에 놓이는 항목의 순서를 바꾸려면 `stickers.json` 배열의 순서를 바꿉니다.

## Upload links

- 원본 이미지 업로드: https://github.com/sogoose/hetero-front/upload/main/assets/materials
- 아카이브 데이터: https://github.com/sogoose/hetero-front/blob/main/assets/materials/stickers.json
- 이미지 최적화 작업: https://github.com/sogoose/hetero-front/actions/workflows/optimize-materials.yml

파일 이름을 바꾸거나 신규 PNG를 추가했을 때는 `stickers.json`에도 새 경로와 항목을 추가해야 합니다.
