<template>
  <AppLayout>
    <template #sidebar>
      <div v-if="project" class="mass-sidebar">
        <h3 class="sidebar-title">프로젝트 정보</h3>
        
        <div class="info-section">
          <div class="info-item">
            <span class="info-label">대지면적</span>
            <span class="info-value">{{ project.siteArea }} m²</span>
          </div>
          <div class="info-item">
            <span class="info-label">연면적</span>
            <span class="info-value">{{ project.grossFloorArea }} m²</span>
          </div>
          <div class="info-item">
            <span class="info-label">층수</span>
            <span class="info-value">{{ project.numFloors }}층</span>
          </div>
          <div class="info-item">
            <span class="info-label">층당 면적</span>
            <span class="info-value">{{ floorArea }} m²</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <h3 class="sidebar-title">공간 구성</h3>
        <div class="legend">
          <div v-for="(ratio, type) in project.roomRatios" :key="type" class="legend-item">
            <div class="legend-color" :style="{ background: getColorForType(type) }"></div>
            <span class="legend-label">{{ getKoreanType(type) }}</span>
            <span class="legend-value">{{ (ratio * 100).toFixed(0) }}%</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="view-controls">
          <h3 class="sidebar-title">뷰 컨트롤</h3>
          <p class="control-hint">마우스로 지도를 드래그하여 이동하고 스크롤하여 확대/축소할 수 있습니다.</p>
        </div>
      </div>
    </template>
    
    <template #canvas>
      <div ref="mapContainer" class="map-container"></div>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { getColorForType, getKoreanType } from '@/utils/spaceTypes'
import AppLayout from '@/components/AppLayout.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const route = useRoute()
const projectStore = useProjectStore()

const mapContainer = ref(null)
let map = null

const project = computed(() => projectStore.currentProject)
const floorArea = computed(() => {
  if (!project.value) return 0
  return (project.value.grossFloorArea / project.value.numFloors).toFixed(2)
})

onMounted(() => {
  // 프로젝트 로드
  const projectId = route.params.id
  if (projectId) {
    projectStore.setCurrentProject(projectId)
  }
  
  // 지도 초기화
  initMap()
})

watch(() => project.value, (newProject) => {
  if (newProject && map) {
    renderBuilding()
  }
})

const initMap = () => {
  if (!mapContainer.value) return
  
  // 서울 시청 좌표를 기본값으로 사용
  const defaultLat = 37.5665
  const defaultLng = 126.9780
  
  map = L.map(mapContainer.value, {
    center: [defaultLat, defaultLng],
    zoom: 18,
    zoomControl: true
  })
  
  // OpenStreetMap 타일 레이어 추가
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20
  }).addTo(map)
  
  // 건물 렌더링
  if (project.value) {
    renderBuilding()
  }
}

const renderBuilding = () => {
  if (!map || !project.value) return
  
  const siteArea = project.value.siteArea
  const numFloors = project.value.numFloors
  
  // 대지를 정사각형으로 가정하고 한 변의 길이 계산 (미터)
  const sideLength = Math.sqrt(siteArea)
  
  // 지도 중심 좌표 가져오기
  const center = map.getCenter()
  const lat = center.lat
  const lng = center.lng
  
  // 위도/경도 델타 계산 (대략적인 변환, 1도 ≈ 111km)
  const latDelta = (sideLength / 2) / 111000
  const lngDelta = (sideLength / 2) / (111000 * Math.cos(lat * Math.PI / 180))
  
  // 대지 경계 좌표
  const bounds = [
    [lat - latDelta, lng - lngDelta],
    [lat - latDelta, lng + lngDelta],
    [lat + latDelta, lng + lngDelta],
    [lat + latDelta, lng - lngDelta]
  ]
  
  // 각 층을 폴리곤으로 그리기
  project.value.floors.forEach((floor) => {
    floor.spaces.forEach((space) => {
      // 공간의 상대적 위치를 위도/경도로 변환
      const spaceLatDelta = (space.height / 111000)
      const spaceLngDelta = (space.width / (111000 * Math.cos(lat * Math.PI / 180)))
      
      // 공간의 중심 좌표 계산 (대지 내 상대 위치)
      const spaceCenterLat = lat - latDelta + (space.y / sideLength) * (2 * latDelta) + spaceLatDelta / 2
      const spaceCenterLng = lng - lngDelta + (space.x / sideLength) * (2 * lngDelta) + spaceLngDelta / 2
      
      // 공간의 경계 좌표
      const spaceBounds = [
        [spaceCenterLat - spaceLatDelta / 2, spaceCenterLng - spaceLngDelta / 2],
        [spaceCenterLat - spaceLatDelta / 2, spaceCenterLng + spaceLngDelta / 2],
        [spaceCenterLat + spaceLatDelta / 2, spaceCenterLng + spaceLngDelta / 2],
        [spaceCenterLat + spaceLatDelta / 2, spaceCenterLng - spaceLngDelta / 2]
      ]
      
      // 폴리곤 생성
      const color = getColorForType(space.type)
      L.polygon(spaceBounds, {
        color: color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 2
      }).addTo(map).bindPopup(`
        <strong>${floor.number}층 - ${getKoreanType(space.type)}</strong><br>
        면적: ${space.area.toFixed(2)} m²
      `)
    })
  })
  
  // 대지 경계선 그리기
  L.polygon(bounds, {
    color: '#1f2937',
    fillColor: 'transparent',
    weight: 3,
    dashArray: '10, 5'
  }).addTo(map)
  
  // 지도 뷰를 대지에 맞추기
  map.fitBounds(bounds, { padding: [50, 50] })
}
</script>

<style scoped>
.mass-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 24px 0;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.legend-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.view-controls {
  margin-top: auto;
}

.control-hint {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  padding: 12px;
  background: #fffbeb;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.map-container {
  width: 100%;
  height: 100%;
}

:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: 8px;
}

:deep(.leaflet-popup-content) {
  margin: 12px;
  font-size: 14px;
  line-height: 1.5;
}
</style>
