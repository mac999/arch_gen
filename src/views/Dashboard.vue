<template>
  <div class="dashboard">
    <AppHeader />
    <div class="dashboard-content">
      <div class="dashboard-header">
        <h2>프로젝트</h2>
        <button class="new-project-btn" @click="showUploadModal = true">
          + 새 프로젝트
        </button>
      </div>
      
      <div v-if="projects.length === 0" class="empty-state">
        <div class="empty-icon">📐</div>
        <h3>프로젝트가 없습니다</h3>
        <p>CSV 파일을 업로드하여 새 프로젝트를 시작하세요</p>
        <button class="empty-cta-btn" @click="showUploadModal = true">
          + 새 프로젝트 만들기
        </button>
      </div>
      
      <div v-else class="project-grid">
        <div 
          v-for="project in projects" 
          :key="project.id"
          class="project-card"
          @click="openProject(project.id)">
          <div class="project-card-header">
            <h3>{{ project.name }}</h3>
            <span class="project-date">{{ formatDate(project.createdAt) }}</span>
          </div>
          <div class="project-stats">
            <div class="stat-item">
              <span class="stat-label">대지면적</span>
              <span class="stat-value">{{ project.siteArea }} m²</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">연면적</span>
              <span class="stat-value">{{ project.grossFloorArea }} m²</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">층수</span>
              <span class="stat-value">{{ project.numFloors }}층</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- CSV 업로드 모달 -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>새 프로젝트 만들기</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
            <input 
              ref="fileInput"
              type="file"
              accept=".csv"
              @change="handleFileSelect"
              style="display: none;">
            <div class="upload-icon">📄</div>
            <p class="upload-text">CSV 파일을 드래그하거나 클릭하여 업로드</p>
            <button class="upload-btn" @click="$refs.fileInput.click()">
              파일 선택
            </button>
          </div>
          <div v-if="uploadError" class="error-message">
            {{ uploadError }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import AppHeader from '@/components/AppHeader.vue'

const router = useRouter()
const projectStore = useProjectStore()

const projects = computed(() => projectStore.projects)
const showUploadModal = ref(false)
const uploadError = ref('')
const fileInput = ref(null)

const closeModal = () => {
  showUploadModal.value = false
  uploadError.value = ''
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (file) {
    await uploadFile(file)
  }
}

const handleDrop = async (event) => {
  const file = event.dataTransfer.files[0]
  if (file && file.name.endsWith('.csv')) {
    await uploadFile(file)
  } else {
    uploadError.value = 'CSV 파일만 업로드 가능합니다.'
  }
}

const uploadFile = async (file) => {
  try {
    uploadError.value = ''
    const project = await projectStore.uploadCSV(file)
    closeModal()
    router.push(`/project/${project.id}/mass`)
  } catch (error) {
    uploadError.value = error.message || '파일 업로드 중 오류가 발생했습니다.'
  }
}

const openProject = (projectId) => {
  projectStore.setCurrentProject(projectId)
  router.push(`/project/${projectId}/mass`)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}
</script>

<style scoped>
.dashboard {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.dashboard-content {
  flex: 1;
  padding: 48px;
  overflow-y: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.dashboard-header h2 {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.new-project-btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: #2563eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.new-project-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
}

.empty-cta-btn {
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: #2563eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.empty-cta-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
  transform: translateY(-4px);
}

.project-card-header {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.project-card-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.project-date {
  font-size: 13px;
  color: #9ca3af;
}

.project-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  font-size: 32px;
  color: #9ca3af;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.upload-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 8px;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: #dbeafe;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}
</style>
