# ==========================================
# Stage 1: Build stage (Node.js 환경에서 Vue 빌드)
# ==========================================
FROM node:20-alpine as build-stage

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드 (dist 폴더 생성)
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production stage (Nginx 서버로 서빙)
# ==========================================
FROM nginx:stable-alpine as production-stage

# 빌드된 결과물을 Nginx 서빙 폴더로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html

# SPA(Vue) 라우팅 404 에러 방지용 Nginx 설정 덮어쓰기
# (프론트엔드 폴더 최상단에 nginx.conf 파일이 있어야 합니다)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]