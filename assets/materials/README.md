# MATERIALS / 혼종의 정면

재료 아카이브: https://sogoose.github.io/hetero-front/materials.html

## 작업 방식

- 원본 PNG는 이 폴더에 유지하되, 2026-11-03 이후 누끼 바깥쪽의 투명 여백을 최대한 줄이도록 직접 크롭합니다. 물체 본체는 잘라내지 않고 테두리 6px을 남깁니다.
- `stickers.json`은 현재 가로로 펼쳐지는 60개 누끼 이미지의 순서, 표시명, 카테고리, 크기, 회전과 위치를 관리합니다.
- 사이트에서 사용하는 압축 WebP 이미지는 `optimized/sticker-XX.webp`입니다. 2026-11-03 기준 60개 중 57개를 자동 압축했습니다. 이미 가벼운 벽돌 표본 PNG 3개는 원본을 사용합니다.
- `stickers.json`에는 `original` (원본 PNG)와 `image` (사이트에서 보여주는 WebP 또는 가벼운 원본)가 모두 들어 있습니다.
- 새 이미지로 바꾸려면 해당 `original` 경로의 파일을 교체한 뒤 `Optimize material cutouts` GitHub Action을 수동 실행할 수 있습니다. 해당 Action은 원본 PNG의 투명 여백을 크롭하고 화면용 WebP를 갱신합니다.
- 웹사이트는 화면 가까이에 있는 스티커만 불러옵니다. 이미지의 흰색 누끼 외곽선과 그림자는 `materials-scroll.css`에서 조정합니다.
- 작업대에 놓이는 항목의 순서를 바꾸려면 `stickers.json` 배열의 순서를 바꿉니다.

## Upload links

- 원본 이미지 업로드: https://github.com/sogoose/hetero-front/upload/main/assets/materials
- 아카이브 데이터: https://github.com/sogoose/hetero-front/blob/main/assets/materials/stickers.json
- 이미지 최적화 작업: https://github.com/sogoose/hetero-front/actions/workflows/optimize-materials.yml

파일 이름을 바꾸거나 신규 PNG를 추가했을 때는 `stickers.json`에도 새 경로와 항목을 추가해야 합니다.

## 스티커 시트 배치와 텍스트 수정

- 2026-11-03: 사진 60개를 데스크톱에서 **8개씩**, 모바일에서는 **4개씩** 하나의 시트에 모아서 가로 길이를 줄였습니다.
- 화면에는 각 누끼의 번호와 이름만 한 줄로 표시합니다. 분류와 설명은 사진을 클릭할 때 나오는 상세 보기에서 확인합니다.
- 재료 페이지 하단 **EDIT**를 누른 후 이미지를 클릭하면 이름/분류/설명을 수정할 수 있습니다. **저장**하면 이 브라우저의 `localStorage`에만 저장되며, 다른 방문객이나 다른 기기에는 아직 반영되지 않습니다.
- 수정을 공개 GitHub에 반영하려면 같은 편집 창에서 **JSON 내보내기**를 사용하여 `stickers-updated.json`을 저장한 뒤 이 파일을 GitHub의 `assets/materials/stickers.json`에 반영해야 합니다. 브라우저에서 비밀 GitHub 토큰을 요구하지 않으며, **저장** 버튼은 GitHub 쓰기 동작을 하지 않습니다.
- 전체 아카이브의 비공개 사진 파일이나 건축물 원장에는 영향을 주지 않습니다.

## 투명 여백 최소화

- `scripts/optimize_materials.py`는 알파 채널 기준으로 투명 영역을 잘라 원본 PNG와 화면용 WebP를 함께 갱신합니다.
- `trim-report.json`에 각 파일의 수정 전후 해상도 및 바운더리 통계를 저장합니다.
- `stickers.json`의 `imageWidth`, `imageHeight`는 실제 표시 이미지의 비율이며 브라우저가 정확한 물체 바운더리에 맞춰 레이블과 이미지를 배치하는 데 사용합니다.
- 추가 미세조정은 `nudgeX`, `nudgeY`를 사용합니다.
