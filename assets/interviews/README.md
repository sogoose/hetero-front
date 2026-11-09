# INTERVIEWS / 편집 안내

[인터뷰 페이지](https://sogoose.github.io/hetero-front/interviews.html)

## 사진 설명 수정·삭제 / 인터뷰 본문 수정

이 기능은 **로그인 없는 임시 공개 편집 모드**이며, 현재 `hetero_interview_upload_settings.uploads_enabled`가 `true`일 때만 작동합니다.

- **업로드한 사진 설명·주석 바꾸기**: 사진 아래 **설명 수정** 클릭 → 설명과 주석 수정 → 저장
- **업로드한 사진 삭제**: 사진 아래 **삭제** 클릭 → 확인 → 사진 목록과 Supabase Storage 파일에서 삭제
- **기와·주물·벽돌 인터뷰 문장 수정**: 각 인터뷰 왼쪽 **본문 수정** 클릭 → 질문 또는 답변 옆 **수정** 클릭 → 저장
- **원문 복원**: 수정한 문장을 열어 **PDF 원문으로 되돌리기** 클릭

인터뷰 원문(`assets/interviews/interviews-data.json`)은 그대로 보존하고, 웹에서 바뀐 문장만 `public.hetero_interview_turn_edits`에 저장합니다. 다른 방문자도 저장한 문장을 바로 확인할 수 있습니다.

**사진 폭:** 데스크톱에서 모든 이미지가 동일한 가로 너비(최대 268px)로 표시되고 원본 가로세로 비율을 유지합니다. 모바일은 같은 폭의 썸네일을 좌우 스크롤합니다. 사진은 잘라내지 않습니다.

**GitHub 기본 사진도 사이트에서 삭제할 수 있습니다.** 기본 사진 아래 **삭제**를 누르면 `public.hetero_interview_hidden_base_photos`에 숨김 기록이 저장되어 모든 방문자에게 보이지 않습니다. GitHub 원본 파일 자체는 지우지 않습니다. 잘못 숨긴 경우 인터뷰 왼쪽의 **기본 사진 복원**을 누르면 다시 보입니다. 실제 GitHub 원본 파일과 JSON에서도 제거하려면 별도로 레포를 편집해야 합니다.

**주의:** 공개 편집이 켜져 있는 동안에는 모든 방문자가 문장을 수정하고 직접 업로드한 사진을 삭제할 수 있습니다. 전시 직전에 아래의 `uploads_enabled=false`로 반드시 닫아주세요. 편집 종료 후에도 등록된 자료는 계속 공개됩니다.

## 로그인 없이 사진 업로드

각 인터뷰의 왼쪽 **＋ 사진 추가**를 누르면 바로 파일을 선택할 수 있습니다.

1. 기와·주물·벽돌 중 사진을 넣을 인터뷰로 이동합니다.
2. **＋ 사진 추가** 클릭 → 사진 파일 선택
3. 필요하면 사진 설명 / 주석 입력
4. **사진 업로드** 클릭. 자동 WebP 최적화 후 왼쪽 갤러리에 즉시 표시되며 다른 방문자도 볼 수 있습니다.

GitHub에 파일을 올리거나 JSON을 수정하거나 편집자 계정으로 로그인할 필요가 없습니다.

**중요:** 임시 공개 편집 모드에서는 방문자 누구나 사진을 추가하고, 업로드 사진을 수정·삭제하며, GitHub 기본 사진을 숨길 수 있습니다. 전시 전에는 반드시 아래의 서버 업로드·편집 스위치를 끄세요.

### 자동 크기 조정과 압축

사진을 선택하면 **업로드 버튼을 누르기 전에** 브라우저에서 WebP로 변환하고, 미리보기 아래에 `원본 용량 → 업로드 용량 · 최종 픽셀 크기`를 표시합니다.
긴 변은 최대 1800px로 맞추며, 용량이 큰 사진은 1450px / 1100px 단계로 추가 조정합니다. 최종 파일은 약 2.6MB 이하로 제한합니다.

업로드 오류 `new row violates row-level security policy`는 파일 용량 문제가 아니라 Supabase Storage의 공통 제한 정책과 공개 버킷의 반환 권한 충돌로 발생한 것이었습니다. 별도 버킷에 한해서 정책을 조정하고 비로그인 INSERT/RETURNING을 SQL 롤백 테스트로 확인했습니다.

### 저장 제한

- JPG / PNG / WebP / AVIF 사진만 지원
- 원본 최대 18MB, 자동 변환된 WebP 최대 3MB
- 인터뷰별 사진 최대 **30개** (서버에서 제한)
- 업로드한 사진은 별도 Supabase Storage 버킷에 저장됩니다.
- 기존 PDF 인터뷰 원고, 아이콘, 기존 JSON 사진은 변경하지 않습니다.

## 사진 업로드 닫기 — EDIT 제거 시 필수

사이트의 버튼을 삭제하는 것만으로는 외부 업로드가 차단되지 않습니다. 다음 **서버 설정을 반드시 꺼야** 합니다.

Supabase → SQL Editor:

```sql
update public.hetero_interview_upload_settings
set uploads_enabled = false
where id = 1;
```

그러면 웹사이트에서 **＋ 사진 추가·설명 수정·삭제·본문 수정·기본 사진 복원** 버튼이 사라지고, 직접 API를 통한 사진 업로드·수정·삭제, GitHub 기본 사진 숨김·복원 및 문장 수정·원문 복원도 정책에서 차단됩니다. 숨김 상태와 이미 등록된 자료는 유지됩니다.

다시 열어야 한다면 같은 필드를 `true`로 바꿉니다. 현재는 **true**입니다.

관련 설정·저장소:

- `public.hetero_interview_upload_settings` — 공개 업로드 활성화 및 최대 사진 수
- `public.hetero_interview_photos` — 사진 주석과 소속 인터뷰
- `public.hetero_interview_hidden_base_photos` — GitHub 기본 사진 숨김 기록(원본 보존)
- `hetero-interview-photos` — 실제 WebP 사진 저장소

## 기본 인터뷰 원고 및 사진 편집

- `assets/interviews/interviews-data.json` — 기본 텍스트·업체 정보·아이콘·기본 사진
- `interviews-scroll.css` — 인터뷰 조판
- `interviews-upload.js` — 로그인 없는 사진 업로드와 읽기
- `interviews-scroll.js` — 인터뷰 표시·스크롤·확대

기본 인터뷰는 **기와 → 주물 → 벽돌** 순서입니다. 원문 데이터에서 질문은 `{"role":"Q","text":"..."}`, 답변은 `{"role":"A","text":"..."}`로 기록합니다.
