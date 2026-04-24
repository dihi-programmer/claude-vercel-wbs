import { config } from 'dotenv';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error(
    '통합 테스트에는 DATABASE_URL 이 필요합니다. 로컬 Supabase 컨테이너(`supabase start`)를 띄우고 `.env.local` 에 DATABASE_URL 을 설정하세요.',
  );
}
