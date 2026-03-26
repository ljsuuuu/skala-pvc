# 가볍고 안전한 alpine 버전의 Node.js 이미지를 사용합니다.
FROM node:20-alpine

# 컨테이너 내부의 작업 디렉토리 설정
WORKDIR /app

# 패키지 정보 복사 및 의존성 설치 (express, multer 등)
COPY package*.json ./
RUN npm install

# 백엔드 소스 코드(server.js 등) 전체 복사
COPY . .

# 🚀 핵심 로직: 나중에 K8s에서 PVC가 마운트될 경로를 미리 뚫어둡니다.
# 권한 에러를 방지하기 위해 폴더를 선제적으로 생성합니다.
RUN mkdir -p /app/data

# 백엔드 서버가 사용할 3000번 포트 개방
EXPOSE 3000

# 컨테이너가 켜질 때 실행할 명령어
CMD ["node", "server.js"]