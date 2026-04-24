'use client';

import { Box, Heading, Text, VStack } from '@chakra-ui/react';

export default function Home() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={8}>
      <VStack gap={3} textAlign="center">
        <Heading size="2xl">WBS 부트스트랩 완료 ✅</Heading>
        <Text color="fg.muted">
          Next.js 14 · Chakra UI v3 · Supabase · Drizzle ORM 클라이언트가 배선되었습니다.
        </Text>
      </VStack>
    </Box>
  );
}
