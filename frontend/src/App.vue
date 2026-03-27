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
        오른쪽 아래 '사진 업로드' 버튼을 눌러 첫 이미지를 올려보세요!
      </div>

      <transition-group 
        v-else 
        appear
        name="fade-slide" 
        tag="div" 
        class="grid-container"
      >
        <div 
          v-for="(item, index) in images" 
          :key="item.imageUrl" 
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
      </transition-group>
    </div>

    <button 
      class="upload-toggle-fab" 
      @click="toggleUploadPanel"
      :class="{ 'is-open': isUploadPanelOpen }"
    >
      {{ isUploadPanelOpen ? '✕ 닫기' : '📤 사진 업로드' }}
    </button>

    <div class="upload-section" :class="{ 'is-open': isUploadPanelOpen }">
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

    <div 
      class="panel-backdrop" 
      :class="{ 'is-active': isUploadPanelOpen }" 
      @click="toggleUploadPanel"
    ></div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const images = ref([]); 
const uploadTitle = ref('');
const fileInput = ref(null);
const selectedFile = ref(null); 
const previewImageUrl = ref(null);
const isUploading = ref(false);

const focusedIndex = ref(null); 
const isDeleteMode = ref(false);
let pollingInterval = null; 

const isUploadPanelOpen = ref(false);

const toggleUploadPanel = () => {
  isUploadPanelOpen.value = !isUploadPanelOpen.value;
};

const fetchImages = async () => {
  try {
    const response = await fetch('/api/images');
    if (response.ok) {
      const newData = await response.json();
      const reversedData = newData.reverse();
      
      if (images.value.length !== reversedData.length) {
        images.value = reversedData;
      }
    }
  } catch (error) {
    console.error('이미지 목록을 불러오는데 실패했습니다.', error);
  }
};

const handleKeyDown = (e) => {
  const isCmdOrCtrl = e.ctrlKey || e.metaKey; 
  if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'y') {
    e.preventDefault(); 
    isDeleteMode.value = !isDeleteMode.value; 
    if (isDeleteMode.value) {
      closeFocus();
    }
  }
};

const handleImageClick = async (index, item) => {
  if (isDeleteMode.value) {
    if (confirm(`'${item.title}' 사진을 영구적으로 삭제하시겠습니까?`)) {
      try {
        const realBackendIndex = images.value.length - 1 - index;
        const response = await fetch(`/api/images/${realBackendIndex}`, { method: 'DELETE' });
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
    focusedIndex.value = index;
  }
};

const closeFocus = () => {
  focusedIndex.value = null;
};

onMounted(() => {
  fetchImages(); 
  window.addEventListener('keydown', handleKeyDown);
  pollingInterval = setInterval(() => {
    fetchImages();
  }, 3000);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
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
      
      images.value = [newImage, ...images.value];
      
      await nextTick();
      
      setTimeout(() => {
        uploadTitle.value = '';
        selectedFile.value = null;
        clearPreview();
        if (fileInput.value) fileInput.value.value = ''; 
        
        isUploadPanelOpen.value = false;
      }, 50);

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
.grid-container > .fade-slide-enter-active,
.grid-container > .fade-slide-leave-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
}
.grid-container > .fade-slide-enter-from,
.grid-container > .fade-slide-leave-to {
  opacity: 0 !important;
  transform: translateY(30px) scale(0.9) !important;
}

.gallery-container {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: 'Arial', sans-serif;
  box-sizing: border-box;
  position: relative;
  background-color: #f0f2f5;
  overflow: hidden; 
}

.gallery-section {
  width: 100%;
  padding: 20px 30px;
  overflow-y: auto; 
  transition: filter 0.3s;
}

/* 🚀 토글 버튼 크기 고정 및 내용 중앙 정렬 */
.upload-toggle-fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 160px; /* 고정 너비 지정 */
  height: 54px; /* 고정 높이 지정 */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #111;
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  z-index: 60; 
  /* 버튼에도 출렁거리는 효과 제거하고 부드러운 전환으로 변경 */
  transition: background-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.upload-toggle-fab:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0,0,0,0.4);
}

.upload-toggle-fab.is-open {
  background-color: #e60023; 
}

/* 🚀 슬라이드 애니메이션 수정: 바운스 없이 벽에 착 붙도록 변경 */
.upload-section {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px; 
  height: 100vh;
  background-color: #ffffff;
  padding: 40px 30px;
  box-shadow: -5px 0 25px rgba(0,0,0,0.1);
  z-index: 50; 
  
  transform: translateX(100%);
  transition: transform 0.3s ease-out; /* cubic-bezier 제거, ease-out 적용 */
  overflow-y: auto;
}

.upload-section.is-open {
  transform: translateX(0);
}

.panel-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.3);
  z-index: 40;
  opacity: 0;
  pointer-events: none; 
  transition: opacity 0.3s;
}

.panel-backdrop.is-active {
  opacity: 1;
  pointer-events: auto; 
}

.focused-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85); 
  z-index: 100; 
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.2s ease-out forwards;
}

.focused-card {
  background: transparent;
  width: 95vw;
  height: 95vh;
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.focused-image-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 0; 
  overflow: hidden; 
}

.focused-image-wrapper img {
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.focused-title {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  border-radius: 30px;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
  backdrop-filter: blur(4px);
}

.close-btn:hover {
  background: #e60023;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.section-title {
  margin-bottom: 25px;
  font-size: 1.5rem;
  font-weight: bold;
  color: #111;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.delete-badge {
  font-size: 0.8rem;
  background-color: #111;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: 10px;
}

/* 🚀 행당 사진 개수 4 -> 6으로 변경 */
.grid-container {
  display: block;
  column-count: 6; 
  column-gap: 16px;
  padding: 10px;
}

.image-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
  display: inline-block;
  width: 100%;
  margin-bottom: 16px;
  position: relative;
  transition: filter 0.2s;
  cursor: pointer;
  break-inside: avoid;
}

.image-card:hover {
  filter: brightness(0.9);
}

.image-card.is-delete-mode {
  border: 3px solid #e60023;
}

.image-wrapper {
  width: 100%;
  padding-top: 0 !important; 
}

.image-wrapper img {
  position: static !important;
  width: 100%;
  height: auto;
  display: block;
}

.delete-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(230, 0, 35, 0.7);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.image-title {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.95rem;
  color: #111;
  word-break: break-all;
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
  color: #333;
}

.form-group input[type="text"] {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 16px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #0084ff;
}

.preview-image-wrapper {
  width: 100%;
  max-height: 200px; 
  border-radius: 16px;
  border: 2px dashed #ddd;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain; 
}

.submit-btn {
  padding: 14px;
  background-color: #e60023;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #ad081b;
}

.submit-btn:disabled {
  background-color: #efefef;
  color: #a7a7a7;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: #767676;
  font-size: 1.1rem;
}
</style>