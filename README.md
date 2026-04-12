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
- A4/A5/A6 스티커 출력 크기 선택
- 스티커 칼선 미리보기 및 분리형 아트워크 주의 안내
- 주문 완료 시 제작자 확인용 주문 메일 발송 흐름
- 임시 수동 주문 접수 모드(PortOne 결제 연동 비활성화)
- 로그인 사용자 / 비로그인 사용자별 생성 횟수 제한
- 300 DPI PNG export
- 칼선 SVG 생성(현재 주문용 PNG에는 칼선 제외)
- Supabase Storage 업로드
- Next.js + FastAPI 분리형 구조

## Current order workflow

스티커 주문은 에디터 미리보기에서 칼선 안정성을 확인한 뒤 주문자/배송 정보를 입력하는 흐름입니다.
현재 PortOne 결제는 심사/운영 준비를 위해 임시 비활성화되어 있으며, 주문 완료 버튼은 제작자 메일
(`kju7859@gmail.com`)로 주문 정보를 전송하는 수동 접수 모드로 동작해야 합니다.

제작자 메일에는 주문번호, 주문 시각, 주문자/배송 정보, 선택한 A4/A5/A6 수량과 함께
인쇄용 이미지 파일이 포함됩니다. 이 인쇄용 이미지는 칼선, 사용자 UI 정보, 주문 시각/번호 텍스트가
합성되지 않은 디자인 PNG여야 합니다.

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
