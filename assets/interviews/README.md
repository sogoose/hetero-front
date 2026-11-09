# INTERVIEWS / 편집 안내

[웹사이트 바로가기](https://sogoose.github.io/hetero-front/interviews.html)

## 웹사이트에서 사진 업로드하기

이제 **GitHub에 사진을 직접 올리거나 JSON을 수정하지 않아도 됩니다.**

1. INTERVIEWS에서 원하는 업체(기와·주물·벽돌) 왼쪽 아래의 **＋ 사진 추가**를 누릅니다.
2. 기존에 허가된 편집자 이메일/비밀번호로 로그인합니다. 처음 로그인할 때만 필요하며, 같은 브라우저 탭에서는 로그인 상태가 유지됩니다.
3. 사진을 선택하고 사진 설명 및 주석을 원할 경우 입력합니다.
4. **사진 업로드**를 누르면 자동으로 WebP로 압축되어 Supabase Storage에 저장되며, 같은 페이지 왼쪽 사진 갤러리에 바로 나타납니다.
5. 다른 방문자에게도 업로드한 사진이 보입니다. 편집자에게만 **삭제** 버튼이 나타납니다.

일반 방문자는 로그인하지 않고 사진을 볼 수 있습니다. 사진 업로드는 허용된 편집자만 할 수 있습니다.

### 사진 업로드 제한

- 파일 형식: JPG, PNG, WebP, AVIF (브라우저에서 열 수 있는 이미지)
- 원본 이미지: 최대 18MB
- 저장 파일: WebP 3MB 이하로 변환, 긴 변 최대 1800px (크기에 따라 더 줄일 수 있음)
- 사진 크기는 사이트가 자동으로 줄입니다. 아이콘과 원래 전시 이미지의 파일은 변경하지 않습니다.
- 대용량이거나 브라우저에서 읽을 수 없는 이미지는 저장되지 않습니다.
- 편집자 비밀번호/관리자 키는 사이트 코드에 저장되지 않습니다. 인증은 Supabase Auth에 위임합니다.

**저장소:** \`hetero-interview-photos\` (Supabase Storage, 별도 공개 읽기 저장소)

**사진 메타데이터:** \`public.hetero_interview_photos\` (Supabase PostgreSQL, 읽기 공개/쓰기 편집자만)

**편집자 허용 목록:** \`public.hetero_interview_editors\` (현재 연결된 편집자 계정만 허용)

새 사진의 업로드 내역은 Supabase에 영구 보관되며, GitHub의 JSON 파일에 자동으로 저장되지는 않습니다. **일반 방문자에게는 GitHub의 기본 사진과 웹사이트에서 올린 사진이 함께 표시됩니다.**

## 기본 인터뷰 내용·사진·아이콘 바꾸기

- 텍스트 내용 / 업체 정보 / 기본 사진: \`assets/interviews/interviews-data.json\`
- 인터뷰 아이콘(원본 SVG): \`assets/interviews/icons/roof.svg\`, \`cast.svg\`, \`brick.svg\`
- 세로형 인터뷰 레이아웃: \`interviews-scroll.css\`
- 브라우저 내 사진 업로드 기능: \`interviews-upload.js\`
- 인터뷰 본문 및 확대 보기: \`interviews-scroll.js\`

기존 \`images\` 배열은 **기본 자료 사진**으로 남겨둡니다. 웹사이트에서 추가한 사진과 별도로 관리됩니다. 기본 사진까지 변경하거나 삭제하려면 GitHub JSON을 수정하세요.

질문과 답변의 원고는 \`turns\` 배열을 수정합니다:

\`\`\`json
{"role":"Q","text":"질문 내용"}
\`\`\`

\`\`\`json
{"role":"A","text":"답변 내용"}
\`\`\`

원고는 제공된 전시용 발췌·편집본을 기준으로 하며 전체 녹취록이 아닙니다.
