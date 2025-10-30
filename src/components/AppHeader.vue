<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="logo" @click="$router.push('/')">Arch-Gen</h1>
      <span v-if="currentProject" class="project-title">{{ currentProject.name }}</span>
    </div>
    
    <nav v-if="currentProject" class="header-nav">
      <button 
        class="nav-tab"
        :class="{ active: $route.name === 'dashboard' }"
        @click="$router.push('/')">
        대시보드
      </button>
      <button 
        class="nav-tab"
        :class="{ active: $route.name === 'mass-design' }"
        @click="$router.push(`/project/${currentProject.id}/mass`)">
        매스 설계
      </button>
      <button 
        class="nav-tab"
        :class="{ active: $route.name === 'floor-design' }"
        @click="$router.push(`/project/${currentProject.id}/floor`)">
        층별 설계
      </button>
    </nav>
    
    <div class="header-right">
      <div v-if="currentProject" class="action-buttons">
        <button 
          class="icon-btn"
          :disabled="!canUndo"
          @click="undo"
          title="실행 취소 (Ctrl+Z)">
          ↶
        </button>
        <button 
          class="icon-btn"
          :disabled="!canRedo"
          @click="redo"
          title="다시 실행 (Ctrl+Y)">
          ↷
        </button>
        <div class="divider-vertical"></div>
        <button 
          class="save-btn"
          @click="saveProject">
          💾 저장
        </button>
        <button 
          class="export-btn"
          @click="exportReport">
          📊 리포트 출력 (CSV)
        </button>
        <button 
          class="export-btn"
          @click="exportDrawing('png')">
          🖼️ 이미지 내보내기 (PNG)
        </button>
        <button 
          class="export-btn"
          @click="exportDrawing('dxf')">
          📐 도면 내보내기 (DXF)
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()
const currentProject = computed(() => projectStore.currentProject)
const canUndo = computed(() => projectStore.canUndo)
const canRedo = computed(() => projectStore.canRedo)

const undo = () => {
  projectStore.undo()
}

const redo = () => {
  projectStore.redo()
}

const saveProject = () => {
  projectStore.saveToStorage()
  // 저장 성공 알림 (선택적)
  alert('프로젝트가 저장되었습니다.')
}

const exportReport = () => {
  projectStore.exportReport()
}

const exportDrawing = (format) => {
  if (format === 'png') {
    projectStore.exportAsImage()
  } else if (format === 'dxf') {
    projectStore.exportAsDXF()
  }
}

// 키보드 단축키
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    if (!e.shiftKey && canUndo.value) {
      undo()
    }
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault()
    if (canRedo.value) {
      redo()
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveProject()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.app-header {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
  cursor: pointer;
  margin: 0;
  user-select: none;
}

.logo:hover {
  color: #1d4ed8;
}

.project-title {
  font-size: 16px;
  color: #6b7280;
  padding-left: 24px;
  border-left: 1px solid #e0e0e0;
}

.header-nav {
  display: flex;
  gap: 8px;
}

.nav-tab {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.nav-tab.active {
  background: #eff6ff;
  color: #2563eb;
}

.header-right {
  display: flex;
  gap: 12px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 6px;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.divider-vertical {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.save-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background: #10b981;
  border-radius: 6px;
  transition: all 0.2s;
}

.save-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.export-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background: #2563eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
</style>
