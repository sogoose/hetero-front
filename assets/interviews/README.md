# INTERVIEWS / 인터뷰 페이지 수정 방법

수록 자료: 전시용 인터뷰 발췌·편집본. 전체 녹취록은 아닙니다.

## 파일 위치

| 작업 | 수정할 파일 |
| --- | --- |
| 인터뷰 본문 / 업체 정보 / 아이콘 / 사진 추가 | \`assets/interviews/interviews-data.json\` |
| 본문 글자 크기·여백·레이아웃 | \`interviews-scroll.css\` |
| 사진 확대·세로 이동 | \`interviews-scroll.js\` |
| 페이지 구조 | \`interviews.html\` |

본문은 기와(고령기와) → 주물(정우금속) → 벽돌(청화요업) 순서로 **세로 스크롤**합니다.
질문은 적갈색, 답변은 작고 볼드인 Pretendard이며, 왼쪽의 업체 정보는 같은 크기·두께의 Noto Serif KR로 통일했습니다.

## 사진 여러 장 추가하기

1. GitHub 저장소의 \`assets/interviews/photos/\` 아래에 사진 파일을 업로드합니다. 폴더는 업로드하면서 새로 만들어도 됩니다. PNG, JPEG, WebP 사용 가능.
2. [interviews-data.json](./interviews-data.json)을 GitHub에서 열고, 수정할 업체의 **\`images\` 배열**에 항목을 추가합니다.
3. 저장하면 다음 배포에서 사진이 왼쪽 갤러리에 나타납니다. 사진을 누르면 확대해서 볼 수 있습니다. 본문이나 CSS를 건드릴 필요가 없습니다.

예를 들어 **고령기와**의 \`images\`를 다음과 같이 수정할 수 있습니다:

\`\`\`json
"images": [
  {
    "src": "assets/archive/tiles-photo.webp",
    "alt": "기와 제작 기록",
    "caption": ""
  },
  {
    "src": "assets/interviews/photos/goryeong-kiln.webp",
    "alt": "고령기와의 가마",
    "caption": "가마 내부 기록"
  },
  {
    "src": "assets/interviews/photos/goryeong-tools.webp",
    "alt": "기와 제작 도구",
    "caption": "제작 도구"
  }
]
\`\`\`

- **\`src\`**: 파일 경로 (웹사이트 루트 기준, 앞에 \`/\`를 붙이지 마세요).
- **\`alt\`**: 이미지가 보이지 않을 때의 설명, 접근성용 텍스트.
- **\`caption\`**: 사진 아래 표시할 주석. 생략하거나 빈 문자열이면 표시하지 않습니다.
- 배열의 순서가 화면에 표시되는 순서입니다. 하나만 있어도 되고 여러 장이어도 됩니다.
- 데스크톱은 왼쪽 세로 갤러리(첫 사진은 크게, 뒤 사진은 작은 그리드), 모바일은 작은 가로 썸네일로 배치됩니다.
- **이미지는 사이트에서 자동 업로드되지 않습니다.** GitHub에 파일 업로드와 JSON 저장을 모두 해야 다른 방문자에게 보입니다.

## 아이콘 바꾸기

사용자가 제공한 SVG 세 개를 그대로 저장했습니다:

- \`assets/interviews/icons/roof.svg\` — 기와
- \`assets/interviews/icons/cast.svg\` — 주물 난간
- \`assets/interviews/icons/brick.svg\` — 벽돌

\`interviews-data.json\`의 \`icon\` 경로를 바꾸면 왼쪽 상단 아이콘을 교체할 수 있습니다.

## 인터뷰 원고 수정하기

업체 이름은 \`company\`, 일시는 \`date\`, 장소는 \`place\`, 인터뷰 대상자는 \`person\`입니다.

\`turns\` 배열은 Q/A 순서를 유지합니다:

\`\`\`json
{"role": "Q", "text": "질문 내용"}
\`\`\`
\`\`\`json
{"role": "A", "text": "답변 내용"}
\`\`\`

텍스트와 이미지 모두 코드 수정 없이 이 JSON 파일만 편집할 수 있습니다.
