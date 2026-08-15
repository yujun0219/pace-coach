# 페이스코치 배포 방법

다른 Wi-Fi의 iPhone/iPad에서도 쓰려면 앱을 HTTPS 주소에 올려야 합니다.

## 가장 쉬운 방법: Netlify Drop

1. `pace-coach-deploy.zip` 압축을 풉니다.
2. Netlify Drop에 접속합니다: https://app.netlify.com/drop
3. 압축을 푼 `pace-coach` 폴더를 드래그해서 올립니다.
4. 생성된 `https://...netlify.app` 주소를 iPad Safari에서 엽니다.
5. Safari 공유 버튼에서 `홈 화면에 추가`를 누릅니다.

## Vercel로 배포

1. Vercel에서 새 프로젝트를 만듭니다.
2. `pace-coach` 폴더를 프로젝트 루트로 업로드합니다.
3. Build command는 비워두고, Output directory는 `.`로 둡니다.
4. 생성된 `https://...vercel.app` 주소를 iPad에서 엽니다.

## 중요

- `127.0.0.1` 주소는 Mac 안에서만 됩니다.
- iPad 홈 화면 설치와 오프라인 캐시는 HTTPS 주소에서 가장 안정적으로 작동합니다.
- 현재 데이터는 각 기기의 브라우저 안에 저장됩니다. Mac과 iPad 사이 자동 동기화는 아직 없습니다.
