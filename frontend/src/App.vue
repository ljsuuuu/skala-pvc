<template>
  <div class="gallery-container">
    <div class="gallery-section">
      <h2 class="section-title">🖼️ 이미지 갤러리</h2>
      
      <div v-if="images.length === 0" class="empty-state">
        오른쪽에서 첫 번째 이미지를 업로드해 보세요!
      </div>

      <div v-else class="grid-container">
        <div v-for="(item, index) in images" :key="index" class="image-card">
          <div class="image-wrapper">
            <img :src="item.imageUrl" :alt="item.title" />
          </div>
          <div class="image-title">{{ item.title }}</div>
        </div>
      </div>
    </div>

    <div class="upload-section">
      <h2 class="section-title">📤 사진 업로드</h2>
      
      <form @submit.prevent="handleUpload" class="upload-form">
        <div class="form-group">
          <label for="imageTitle">이미지 제목</label>
          <input 
            type="text" 
            id="imageTitle" 
            v-model="uploadTitle" 
            placeholder="제목을 입력하세요" 
            required 
          />
        </div>

        <div class="form-group">
          <label for="imageFile">이미지 파일</label>
          <input 
            type="file" 
            id="imageFile" 
            ref="fileInput"
            @change="handleFileChange" 
            accept="image/*" 
            required 
          />
        </div>

        <div v-if="previewImageUrl" class="form-group preview-area">
          <label>업로드 미리보기</label>
          <div class="preview-image-wrapper">
            <img :src="previewImageUrl" class="preview-image" alt="업로드 대기 중 이미지" />
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="!selectedFile || isUploading">
          {{ isUploading ? '업로드 중...' : '갤러리에 추가하기' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 상태 관리
const images = ref([]); 
const uploadTitle = ref('');
const fileInput = ref(null);
const selectedFile = ref(null); 
const previewImageUrl = ref(null);
const isUploading = ref(false);

// 🚀 1. 앱 시작 시 백엔드(PVC의 db.json)에서 기존 이미지 목록 불러오기
const fetchImages = async () => {
  try {
    const response = await fetch('/api/images');
    if (response.ok) {
      images.value = await response.json();
    }
  } catch (error) {
    console.error('이미지 목록을 불러오는데 실패했습니다.', error);
  }
};

// 화면이 처음 마운트될 때 호출
onMounted(() => {
  fetchImages();
});

// 파일 선택 시 발생하는 이벤트 핸들러
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    if (previewImageUrl.value) {
      URL.revokeObjectURL(previewImageUrl.value);
    }
    previewImageUrl.value = URL.createObjectURL(file);
  } else {
    selectedFile.value = null;
    clearPreview();
  }
};

// 미리보기 초기화 함수
const clearPreview = () => {
  if (previewImageUrl.value) {
    URL.revokeObjectURL(previewImageUrl.value);
  }
  previewImageUrl.value = null;
};

// 🚀 2. 업로드 버튼 클릭 시 백엔드로 FormData 전송 (PVC에 저장)
const handleUpload = async () => {
  if (!selectedFile.value || !uploadTitle.value) return;

  isUploading.value = true;

  // FormData 객체 생성 (파일과 텍스트를 함께 보낼 때 필수)
  const formData = new FormData();
  formData.append('title', uploadTitle.value);
  formData.append('imageFile', selectedFile.value);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const newImage = await response.json();
      // 백엔드에서 PVC에 저장 성공 시, 화면 갤러리 배열에도 추가
      images.value.push(newImage);

      // 폼 초기화
      uploadTitle.value = '';
      selectedFile.value = null;
      clearPreview();
      if (fileInput.value) {
        fileInput.value.value = ''; 
      }
    } else {
      alert('업로드에 실패했습니다.');
    }
  } catch (error) {
    console.error('업로드 에러:', error);
    alert('서버와 통신할 수 없습니다.');
  } finally {
    isUploading.value = false;
  }
};
</script>

<style scoped>
/* 전체 컨테이너 7:3 분할 */
.gallery-container {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: 'Arial', sans-serif;
  box-sizing: border-box;
}

/* 왼쪽 갤러리 섹션 (70%) */
.gallery-section {
  width: 70%;
  padding: 30px;
  background-color: #f8f9fa;
  border-right: 1px solid #ddd;
  overflow-y: auto; 
}

/* 오른쪽 업로드 섹션 (30%) */
.upload-section {
  width: 30%;
  padding: 30px;
  background-color: #ffffff;
}

.section-title {
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

/* 갤러리 그리드 설정 (행당 4개) */
.grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.image-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-wrapper {
  width: 100%;
  padding-top: 100%; 
  position: relative;
}

.image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; 
}

.image-title {
  padding: 12px;
  text-align: center;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 업로드 폼 스타일 */
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #555;
}

.form-group input[type="text"] {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input[type="file"] {
  padding: 10px 0;
}

.preview-area {
  margin-top: 10px;
}

.preview-image-wrapper {
  width: 100%;
  max-height: 200px; 
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain; 
}

.submit-btn {
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: #888;
  font-size: 1.1rem;
}
</style>