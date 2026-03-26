// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 🚀 핵심: PVC가 마운트될 절대 경로
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// 서버 시작 시 PVC 폴더 및 db.json 파일이 없으면 자동 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Multer 설정: 전송받은 이미지를 PVC uploads 폴더에 저장
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 현재 시간 추가
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// 프론트엔드에서 /uploads/... 로 이미지를 요청하면 PVC 폴더의 파일을 반환
app.use('/uploads', express.static(UPLOAD_DIR));

// [API] 이미지 목록 불러오기
app.get('/api/images', (req, res) => {
  const dbData = JSON.parse(fs.readFileSync(DB_FILE));
  res.json(dbData);
});

// [API] 이미지 및 제목 업로드하기
app.post('/api/upload', upload.single('imageFile'), (req, res) => {
  if (!req.file) return res.status(400).send('파일이 없습니다.');
  
  const title = req.body.title;
  const imageUrl = `/uploads/${req.file.filename}`; // 프론트에서 접근할 URL
  
  // db.json 읽어서 새 데이터 추가 후 다시 쓰기
  const dbData = JSON.parse(fs.readFileSync(DB_FILE));
  const newEntry = { title, imageUrl };
  dbData.push(newEntry);
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  
  res.json(newEntry); // 방금 저장한 데이터 프론트로 반환
});

app.listen(3000, () => console.log('Backend server running on port 3000'));