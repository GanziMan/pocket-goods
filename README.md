# pocket-goods
반려동물부터 취미까지, AI로 만드는 나만의 나노 굿즈 스튜디오.

**Live Site**  
- https://pocket-goods.com/

## Overview

Pocket Goods는 사용자가 반려동물, 캐릭터, 아기 사진 등 다양한 이미지를 활용해  
직접 키링과 스티커를 디자인할 수 있는 AI 기반 굿즈 제작 서비스입니다.

랜딩 페이지에서 바로 에디터로 진입할 수 있으며,  
텍스트/스티커/AI 이미지 생성 기능을 통해 개인화된 디자인을 만들 수 있습니다.

## Features

- AI 이미지 생성
- 키링 / 스티커 디자인 편집
- Fabric.js 기반 캔버스 편집
- 로그인 사용자 / 비로그인 사용자별 생성 횟수 제한
- 300 DPI PNG export
- 칼선 SVG 생성
- Supabase Storage 업로드
- Next.js + FastAPI 분리형 구조

## Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Fabric.js
- Supabase SSR
- Lucide React

### Backend
- FastAPI
- Uvicorn
- Google GenAI
- Pillow
- OpenCV
- Supabase Python SDK

## Project Structure

```bash
pocket-goods/
├─ apps/
│  ├─ web/        # Next.js 웹 프론트엔드
│  └─ api/        # FastAPI 백엔드
├─ docs/
├─ openspec/
└─ docker-compose.yml
