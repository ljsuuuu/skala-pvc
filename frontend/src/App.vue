<template>
  <div class="gallery-container">
    
    <div v-if="focusedIndex !== null" class="focused-modal-overlay" @click="closeFocus">
      <div class="focused-card" @click.stop>
        <button class="close-btn" @click="closeFocus">✕</button>
        <div class="focused-image-wrapper">
          <img :src="images[focusedIndex].imageUrl" :alt="images[focusedIndex].title" />
        </div>
        <div class="focused-title">{{ images[focusedIndex].title }}</div>
      </div>
    </div>

    <div class="gallery-section">
      <h2 class="section-title">
        🖼️ 이미지 갤러리
        <span v-if="isDeleteMode" class="delete-badge">🗑️ 삭제 모드 ON</span>
      </h2>
      
      <div v-if="images.length === 0" class="empty-state">
        오른쪽에서 첫 번째 이미지를 업로드해 보세요!
      </div>

      <div v-else class="grid-container">
        <div 
          v-for="(item, index) in images" 
          :key="index" 
          class="image-card"
          :class="{ 'is-delete-mode': isDeleteMode }"
          @click="handleImageClick(index, item)"
        >
          <div class="image-wrapper">
            <img :src="item.imageUrl" :alt="item.title" />
            <div v-if="isDeleteMode" class="delete-overlay">클릭하여 영구 삭제</div>
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
import { ref, onMounted, onUnmounted } from 'vue';

const images = ref([]); 
const uploadTitle = ref('');
const fileInput = ref(null);
const selectedFile = ref(null); 
const previewImageUrl = ref(null);
const isUploading = ref(false);

// 새로운 상태 관리 로직
const focusedIndex = ref(null); // 현재 클릭해서 크게 보는 이미지 인덱스
const isDeleteMode = ref(false);

// 1. 이미지 불러오기
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

// 🚀 2. 단축키 충돌 해결 (Cmd/Ctrl + Shift + Y)
const handleKeyDown = (e) => {
  const isCmdOrCtrl = e.ctrlKey || e.metaKey; 
  
  if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'y') {
    e.preventDefault(); 
    isDeleteMode.value = !isDeleteMode.value; 
    
    // 삭제 모드를 켰을 때, 열려있는 큰 화면이 있다면 닫기
    if (isDeleteMode.value) {
      closeFocus();
    }
  }
};

// 🚀 3. 이미지 클릭 로직 (모드에 따라 동작 분리)
const handleImageClick = async (index, item) => {
  if (isDeleteMode.value) {
    // 삭제 모드일 때는 삭제 진행
    if (confirm(`'${item.title}' 사진을 영구적으로 삭제하시겠습니까?`)) {
      try {
        const response = await fetch(`/api/images/${index}`, { method: 'DELETE' });
        if (response.ok) {
          images.value.splice(index, 1);
        } else {
          alert('삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('삭제 통신 에러:', error);
      }
    }
  } else {
    // 삭제 모드가 아닐 때는 중앙 포커스 모드로 띄우기
    focusedIndex.value = index;
  }
};

const closeFocus = () => {
  focusedIndex.value = null;
};

onMounted(() => {
  fetchImages();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    if (previewImageUrl.value) URL.revokeObjectURL(previewImageUrl.value);
    previewImageUrl.value = URL.createObjectURL(file);
  } else {
    selectedFile.value = null;
    clearPreview();
  }
};

const clearPreview = () => {
  if (previewImageUrl.value) URL.revokeObjectURL(previewImageUrl.value);
  previewImageUrl.value = null;
};

const handleUpload = async () => {
  if (!selectedFile.value || !uploadTitle.value) return;

  isUploading.value = true;
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
      images.value.push(newImage);
      uploadTitle.value = '';
      selectedFile.value = null;
      clearPreview();
      if (fileInput.value) fileInput.value.value = ''; 
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
.gallery-container {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: 'Arial', sans-serif;
  box-sizing: border-box;
  position: relative;
}

/* 🚀 중앙 집중형 모달 오버레이 스타일 */
.focused-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(30, 30, 30, 0.85); /* 짙은 회색으로 배경 딤 처리 */
  z-index: 100; 
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.2s ease-out forwards;
}

/* 🚀 화면을 다 덮을 정도로 커지는 모달 카드 애니메이션 */
.focused-card {
  background: #fff;
  border-radius: 12px;
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  position: relative;
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.focused-image-wrapper {
  flex: 1;
  background-color: #111;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.focused-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 원본 비율 유지하며 화면 꽉 차게 */
}

.focused-title {
  padding: 20px;
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: #333;
  background: #fff;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 71, 87, 0.9);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.gallery-section {
  width: 70%;
  padding: 30px;
  background-color: #f8f9fa;
  border-right: 1px solid #ddd;
  overflow-y: auto; 
}

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
  display: flex;
  align-items: center;
}

.delete-badge {
  font-size: 0.9rem;
  background-color: #ff4757;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: 10px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

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
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

/* 마우스 호버 시 살짝 반응만 하도록 유지 */
.image-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}

.image-card.is-delete-mode {
  border: 2px dashed #ff4757;
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

.delete-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 71, 87, 0.6);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.image-title {
  padding: 12px;
  text-align: center;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: #fff;
}

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

.shortcut-info {
  margin-top: 25px;
  padding: 15px;
  background-color: #f1f3f5;
  border-radius: 8px;
  color: #555;
  font-size: 0.9rem;
  text-align: center;
}
</style>