const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 환경에 따른 경로 설정 (로컬 테스트 vs K8s PVC)
const isLocal = !process.env.KUBERNETES_SERVICE_HOST;
const DATA_DIR = isLocal 
  ? path.join(__dirname, 'data') 
  : '/app/data';

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// 서버 시작 시 폴더 및 파일 자동 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// 정적 파일 서빙
app.use('/uploads', express.static(UPLOAD_DIR));

// [API] 이미지 목록 불러오기
app.get('/api/images', (req, res) => {
  try {
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    res.json(dbData);
  } catch (err) {
    res.status(500).json({ error: "데이터를 읽을 수 없습니다." });
  }
});

// [API] 이미지 업로드
app.post('/api/upload', upload.single('imageFile'), (req, res) => {
  if (!req.file) return res.status(400).send('파일이 없습니다.');
  
  const title = req.body.title;
  const imageUrl = `/uploads/${req.file.filename}`; 
  
  try {
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const newEntry = { title, imageUrl };
    dbData.push(newEntry);
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
    res.json(newEntry);
  } catch (err) {
    res.status(500).json({ error: "데이터 저장 중 오류가 발생했습니다." });
  }
});

// 🚀 [새로운 API] 이미지 완벽 삭제 (PVC 파일 + DB)
app.delete('/api/images/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  
  try {
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    
    // 유효한 인덱스인지 확인
    if (index >= 0 && index < dbData.length) {
      // 1. DB 배열에서 해당 데이터 뽑아내기
      const deletedItem = dbData.splice(index, 1)[0];
      
      // 2. 실제 물리적 파일 삭제 (PVC 연동 폴더)
      const filename = deletedItem.imageUrl.replace('/uploads/', '');
      const filePath = path.join(UPLOAD_DIR, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // 진짜 파일 삭제!
      }
      
      // 3. 변경된 DB를 다시 json에 저장
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
      
      res.json({ message: '삭제가 완료되었습니다.' });
    } else {
      res.status(404).json({ error: '해당 이미지를 찾을 수 없습니다.' });
    }
  } catch (err) {
    res.status(500).json({ error: '삭제 처리 중 서버 에러가 발생했습니다.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT} (Mode: ${isLocal ? 'Local' : 'K8s'})`);
});