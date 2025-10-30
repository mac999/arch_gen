<template>
  <AppLayout>
    <template #sidebar>
      <div v-if="project" class="floor-sidebar">
        <h3 class="sidebar-title">층 선택</h3>
        <div class="floor-selector">
          <button
            v-for="floor in project.floors"
            :key="floor.number"
            class="floor-btn"
            :class="{ active: currentFloor === floor.number }"
            @click="selectFloor(floor.number)">
            {{ floor.number }}F
          </button>
        </div>
        
        <div class="divider"></div>
        
        <h3 class="sidebar-title">요소 팔레트</h3>
        <div class="palette">
          <button 
            class="palette-item"
            :class="{ active: selectedTool === 'select' }"
            @click="selectTool('select')">
            <span class="palette-icon">👆</span>
            <span class="palette-label">선택</span>
          </button>
          <button 
            class="palette-item"
            :class="{ active: selectedTool === 'door' }"
            @click="selectTool('door')">
            <span class="palette-icon">🚪</span>
            <span class="palette-label">문</span>
          </button>
          <button 
            class="palette-item"
            :class="{ active: selectedTool === 'window' }"
            @click="selectTool('window')">
            <span class="palette-icon">🪟</span>
            <span class="palette-label">창문</span>
          </button>
        </div>
        
        <div class="tool-hint">
          <p v-if="selectedTool === 'select'" class="hint-text">
            <strong>선택 모드:</strong><br>
            • 벽체 더블클릭: 정점 추가<br>
            • 정점 더블클릭: 정점 삭제<br>
            • 정점 드래그: 벽체 이동
          </p>
          <p v-else-if="selectedTool === 'door'" class="hint-text">
            <strong>문 편집 모드:</strong><br>
            • 벽체 클릭: 문 생성<br>
            • 문 클릭: 문 삭제
          </p>
          <p v-else-if="selectedTool === 'window'" class="hint-text">
            <strong>창문 편집 모드:</strong><br>
            • 벽체 클릭: 창문 생성<br>
            • 창문 클릭: 창문 삭제
          </p>
        </div>
        
        <div class="divider"></div>
        
        <div v-if="floorData" class="floor-info">
          <h3 class="sidebar-title">층 정보</h3>
          <div class="info-item">
            <span class="info-label">총 면적</span>
            <span class="info-value">{{ floorData.area.toFixed(2) }} m²</span>
          </div>
          <div class="info-item">
            <span class="info-label">공간 개수</span>
            <span class="info-value">{{ floorData.spaces.length }}개</span>
          </div>
        </div>
        
        <div v-if="selectedSpace" class="divider"></div>
        
        <div v-if="selectedSpace" class="inspector">
          <h3 class="sidebar-title">선택된 공간</h3>
          <div class="info-item">
            <span class="info-label">유형</span>
            <span class="info-value">{{ getKoreanType(selectedSpace.type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">면적</span>
            <span class="info-value">{{ selectedSpace.area.toFixed(2) }} m²</span>
          </div>
          <div class="info-item">
            <span class="info-label">크기</span>
            <span class="info-value">{{ selectedSpace.width.toFixed(1) }} × {{ selectedSpace.height.toFixed(1) }} m</span>
          </div>
        </div>
      </div>
    </template>
    
    <template #canvas>
      <div class="canvas-container">
        <div class="canvas-controls">
          <button class="control-btn" @click="zoomIn">
            <span>🔍+</span>
          </button>
          <button class="control-btn" @click="zoomOut">
            <span>🔍-</span>
          </button>
          <button class="control-btn" @click="resetView">
            <span>⟲</span>
          </button>
        </div>
        <div ref="canvasContainer" class="konva-container"></div>
      </div>
    </template>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { getColorForType, getKoreanType } from '@/utils/spaceTypes'
import AppLayout from '@/components/AppLayout.vue'
import Konva from 'konva'

const route = useRoute()
const projectStore = useProjectStore()

const canvasContainer = ref(null)
const currentFloor = ref(1)
const selectedTool = ref('select')
const selectedSpace = ref(null)
const wallThickness = 10 // 벽 두께 (px)
const gridSize = 50 // 그리드 크기 (5m)
const snapThreshold = 10 // 스냅 임계값 (px)

let stage = null
let layer = null
let wallLayer = null
let elementLayer = null
const scale = 10 // 1m = 10px
let isDraggingVertex = false
let walls = [] // 벽체 데이터 {id, points: [x1,y1,x2,y2], vertices}

const project = computed(() => projectStore.currentProject)
const floorData = computed(() => {
  if (!project.value) return null
  return project.value.floors.find(f => f.number === currentFloor.value)
})

onMounted(() => {
  // 프로젝트 로드
  const projectId = route.params.id
  if (projectId) {
    projectStore.setCurrentProject(projectId)
  }
  
  // Konva 초기화
  initCanvas()
})

watch(floorData, () => {
  if (floorData.value && stage) {
    renderFloor()
  }
})

const initCanvas = () => {
  if (!canvasContainer.value) return
  
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  
  stage = new Konva.Stage({
    container: canvasContainer.value,
    width: width,
    height: height,
    draggable: false
  })
  
  layer = new Konva.Layer()
  wallLayer = new Konva.Layer()
  elementLayer = new Konva.Layer()
  
  stage.add(layer)
  stage.add(wallLayer)
  stage.add(elementLayer)
  
  // 마우스 휠로 줌 (선택 모드에서만)
  stage.on('wheel', (e) => {
    if (selectedTool.value !== 'select') return
    
    e.evt.preventDefault()
    
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    }
    
    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1
    
    stage.scale({ x: newScale, y: newScale })
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    }
    stage.position(newPos)
    stage.batchDraw()
  })
  
  // 캔버스 드래그 (선택 모드에서만, 정점 드래그 중이 아닐 때)
  stage.on('dragstart', () => {
    if (selectedTool.value === 'select' && !isDraggingVertex) {
      stage.draggable(true)
    } else {
      stage.draggable(false)
    }
  })
  
  // 렌더링
  if (floorData.value) {
    renderFloor()
  }
}

const renderFloor = () => {
  if (!layer || !floorData.value) return
  
  layer.destroyChildren()
  wallLayer.destroyChildren()
  elementLayer.destroyChildren()
  walls = []
  
  // 배경 그리드
  drawGrid()
  
  // 공간들을 렌더링
  floorData.value.spaces.forEach(space => {
    renderSpace(space)
  })
  
  layer.batchDraw()
  wallLayer.batchDraw()
  elementLayer.batchDraw()
}

const renderSpace = (space) => {
  const x = space.x * scale + 50
  const y = space.y * scale + 50
  const width = space.width * scale
  const height = space.height * scale
  
  // 공간 배경
  const rect = new Konva.Rect({
    x: x,
    y: y,
    width: width,
    height: height,
    fill: getColorForType(space.type),
    opacity: 0.3
  })
  layer.add(rect)
  
  // 벽체를 이중선으로 렌더링
  const wallPoints = [
    { x1: x, y1: y, x2: x + width, y2: y }, // 상단
    { x1: x + width, y1: y, x2: x + width, y2: y + height }, // 우측
    { x1: x + width, y1: y + height, x2: x, y2: y + height }, // 하단
    { x1: x, y1: y + height, x2: x, y2: y } // 좌측
  ]
  
  wallPoints.forEach((points, index) => {
    drawDoubleLineWall(points, `${space.id}-wall-${index}`)
  })
  
  // 공간 라벨 (이름 + 면적)
  const labelText = `${getKoreanType(space.type)}\n${space.area.toFixed(1)}m²`
  const label = new Konva.Text({
    x: x,
    y: y + height / 2 - 20,
    width: width,
    text: labelText,
    fontSize: 14,
    fontFamily: 'Arial',
    fill: '#1f2937',
    align: 'center',
    verticalAlign: 'middle'
  })
  layer.add(label)
  
  // 클릭 이벤트 (선택 모드에서만)
  rect.on('click', () => {
    if (selectedTool.value === 'select') {
      selectedSpace.value = space
    }
  })
}

const drawDoubleLineWall = (points, wallId) => {
  const { x1, y1, x2, y2 } = points
  
  // 벽의 방향 벡터
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  
  if (length === 0) return
  
  // 법선 벡터 (수직 방향)
  const nx = -dy / length
  const ny = dx / length
  
  const offset = wallThickness / 2
  
  // 외부선
  const outerLine = new Konva.Line({
    points: [
      x1 + nx * offset, y1 + ny * offset,
      x2 + nx * offset, y2 + ny * offset
    ],
    stroke: '#1f2937',
    strokeWidth: 2,
    lineCap: 'square',
    lineJoin: 'miter'
  })
  
  // 내부선
  const innerLine = new Konva.Line({
    points: [
      x1 - nx * offset, y1 - ny * offset,
      x2 - nx * offset, y2 - ny * offset
    ],
    stroke: '#1f2937',
    strokeWidth: 2,
    lineCap: 'square',
    lineJoin: 'miter'
  })
  
  wallLayer.add(outerLine)
  wallLayer.add(innerLine)
  
  // 벽 데이터 저장
  walls.push({
    id: wallId,
    points: { x1, y1, x2, y2 },
    outerLine,
    innerLine
  })
  
  // 정점 핸들 추가 (선택 모드에서만 상호작용)
  addVertexHandle(x1, y1, wallId, 'start')
  addVertexHandle(x2, y2, wallId, 'end')
  
  // 벽체 더블클릭으로 정점 추가
  outerLine.on('dblclick', (e) => {
    if (selectedTool.value === 'select') {
      const pos = stage.getPointerPosition()
      const stagePos = {
        x: (pos.x - stage.x()) / stage.scaleX(),
        y: (pos.y - stage.y()) / stage.scaleY()
      }
      addVertexOnWall(wallId, stagePos.x, stagePos.y)
    }
  })
  
  innerLine.on('dblclick', (e) => {
    if (selectedTool.value === 'select') {
      const pos = stage.getPointerPosition()
      const stagePos = {
        x: (pos.x - stage.x()) / stage.scaleX(),
        y: (pos.y - stage.y()) / stage.scaleY()
      }
      addVertexOnWall(wallId, stagePos.x, stagePos.y)
    }
  })
  
  // 문/창문 편집 모드에서 클릭 이벤트
  outerLine.on('click', (e) => {
    handleWallClick(wallId, e)
  })
  innerLine.on('click', (e) => {
    handleWallClick(wallId, e)
  })
}

const addVertexHandle = (x, y, wallId, position) => {
  const handle = new Konva.Circle({
    x: x,
    y: y,
    radius: 6,
    fill: '#2563eb',
    stroke: '#ffffff',
    strokeWidth: 2,
    draggable: selectedTool.value === 'select',
    opacity: 0
  })
  
  // 호버 시 표시
  handle.on('mouseenter', () => {
    if (selectedTool.value === 'select') {
      handle.opacity(1)
      stage.container().style.cursor = 'move'
      wallLayer.batchDraw()
    }
  })
  
  handle.on('mouseleave', () => {
    if (!handle.isDragging()) {
      handle.opacity(0)
      stage.container().style.cursor = 'default'
      wallLayer.batchDraw()
    }
  })
  
  // 드래그 시작
  handle.on('dragstart', () => {
    if (selectedTool.value === 'select') {
      isDraggingVertex = true
      stage.draggable(false)
      handle.opacity(1)
    }
  })
  
  // 드래그 중
  handle.on('dragmove', () => {
    if (selectedTool.value === 'select') {
      // 그리드 스냅
      const snappedPos = snapToGrid(handle.x(), handle.y())
      handle.position(snappedPos)
      // 벽 업데이트는 dragend에서 수행
    }
  })
  
  // 드래그 종료
  handle.on('dragend', () => {
    isDraggingVertex = false
    stage.draggable(selectedTool.value === 'select')
    handle.opacity(0)
    
    // 실제 공간 데이터 업데이트 및 히스토리 저장
    updateSpaceFromVertex(wallId, position, handle.x(), handle.y())
    projectStore.saveHistory()
    renderFloor()
  })
  
  // 더블클릭으로 정점 삭제
  handle.on('dblclick', () => {
    if (selectedTool.value === 'select') {
      deleteVertex(wallId, position)
    }
  })
  
  wallLayer.add(handle)
}

const snapToGrid = (x, y) => {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  }
}

const addVertexOnWall = (wallId, x, y) => {
  const wall = walls.find(w => w.id === wallId)
  if (!wall) return

  // 벽체를 분할하여 새 정점 추가
  const newWallId = `${wallId}-split-${Date.now()}`
  const newWall = {
    id: newWallId,
    points: {
      x1: x,
      y1: y,
      x2: wall.points.x2,
      y2: wall.points.y2
    },
    outerLine: null,
    innerLine: null
  }

  wall.points.x2 = x
  wall.points.y2 = y

  walls.push(newWall)
  renderFloor()
}

const deleteVertex = (wallId, position) => {
  // 정점 삭제 로직
  console.log('Delete vertex:', wallId, position)
  // 실제 구현에서는 인접한 벽을 합치는 로직이 필요
}

const updateSpaceFromVertex = (wallId, position, newX, newY) => {
  const wall = walls.find(w => w.id === wallId)
  if (!wall) return

  // 정점 위치 업데이트
  if (position === 'start') {
    wall.points.x1 = newX
    wall.points.y1 = newY
  } else if (position === 'end') {
    wall.points.x2 = newX
    wall.points.y2 = newY
  }

  // 연결된 벽체 업데이트
  walls.forEach(w => {
    if (w.points.x1 === wall.points.x2 && w.points.y1 === wall.points.y2) {
      w.points.x1 = newX
      w.points.y1 = newY
    }
    if (w.points.x2 === wall.points.x1 && w.points.y2 === wall.points.y1) {
      w.points.x2 = newX
      w.points.y2 = newY
    }
  })

  // 렌더링 갱신
  renderFloor()
}

const handleWallClick = (wallId, e) => {
  if (selectedTool.value === 'door') {
    // 문 추가/삭제
    const pos = stage.getPointerPosition()
    const stagePos = {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY()
    }
    addDoorToWall(wallId, stagePos.x, stagePos.y)
  } else if (selectedTool.value === 'window') {
    // 창문 추가/삭제
    const pos = stage.getPointerPosition()
    const stagePos = {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY()
    }
    addWindowToWall(wallId, stagePos.x, stagePos.y)
  }
}

const addDoorToWall = (wallId, x, y) => {
  // 문 심벌 그리기
  const door = new Konva.Group({
    x: x,
    y: y
  })
  
  // 문 사각형
  const doorRect = new Konva.Rect({
    x: -15,
    y: -5,
    width: 30,
    height: 10,
    fill: '#ffffff',
    stroke: '#1f2937',
    strokeWidth: 2
  })
  
  // 문 열림 호
  const arc = new Konva.Arc({
    x: -15,
    y: 0,
    innerRadius: 0,
    outerRadius: 30,
    angle: 90,
    stroke: '#1f2937',
    strokeWidth: 1.5,
    dash: [3, 3]
  })
  
  door.add(doorRect)
  door.add(arc)
  
  // 클릭으로 삭제
  door.on('click', () => {
    if (selectedTool.value === 'door') {
      door.destroy()
      elementLayer.batchDraw()
      projectStore.saveHistory()
    }
  })
  
  elementLayer.add(door)
  elementLayer.batchDraw()
  projectStore.saveHistory()
}

const addWindowToWall = (wallId, x, y) => {
  // 창문 심벌 그리기
  const window = new Konva.Group({
    x: x,
    y: y
  })
  
  // 창문 외부선
  const outerRect = new Konva.Rect({
    x: -20,
    y: -5,
    width: 40,
    height: 10,
    stroke: '#1f2937',
    strokeWidth: 2
  })
  
  // 창문 내부선
  const innerLine = new Konva.Line({
    points: [0, -5, 0, 5],
    stroke: '#1f2937',
    strokeWidth: 1
  })
  
  window.add(outerRect)
  window.add(innerLine)
  
  // 클릭으로 삭제
  window.on('click', () => {
    if (selectedTool.value === 'window') {
      window.destroy()
      elementLayer.batchDraw()
      projectStore.saveHistory()
    }
  })
  
  elementLayer.add(window)
  elementLayer.batchDraw()
  projectStore.saveHistory()
}

const drawGrid = () => {
  const gridSize = 50 // 5m 간격
  const width = stage.width()
  const height = stage.height()
  
  for (let i = 0; i < width; i += gridSize) {
    const line = new Konva.Line({
      points: [i, 0, i, height],
      stroke: '#e5e7eb',
      strokeWidth: 1
    })
    layer.add(line)
  }
  
  for (let i = 0; i < height; i += gridSize) {
    const line = new Konva.Line({
      points: [0, i, width, i],
      stroke: '#e5e7eb',
      strokeWidth: 1
    })
    layer.add(line)
  }
}

const selectFloor = (floorNumber) => {
  currentFloor.value = floorNumber
  selectedSpace.value = null
  projectStore.setCurrentFloor(floorNumber)
}

const selectTool = (tool) => {
  selectedTool.value = selectedTool.value === tool ? null : tool
}

const zoomIn = () => {
  const oldScale = stage.scaleX()
  const newScale = oldScale * 1.2
  stage.scale({ x: newScale, y: newScale })
  stage.batchDraw()
}

const zoomOut = () => {
  const oldScale = stage.scaleX()
  const newScale = oldScale / 1.2
  stage.scale({ x: newScale, y: newScale })
  stage.batchDraw()
}

const resetView = () => {
  stage.scale({ x: 1, y: 1 })
  stage.position({ x: 0, y: 0 })
  stage.batchDraw()
}
</script>

<style scoped>
.floor-sidebar {
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

.floor-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.floor-btn {
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.floor-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.floor-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 24px 0;
}

.palette {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.palette-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.palette-item:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.palette-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.palette-icon {
  font-size: 24px;
}

.palette-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.tool-hint {
  margin-top: 16px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
}

.hint-text {
  font-size: 12px;
  line-height: 1.6;
  color: #1e40af;
  margin: 0;
}

.hint-text strong {
  display: block;
  margin-bottom: 8px;
  color: #1e3a8a;
}

.floor-info, .inspector {
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

.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fafafa;
}

.canvas-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  font-size: 18px;
}

.control-btn:hover {
  background: #f9fafb;
  border-color: #2563eb;
  transform: scale(1.05);
}

.konva-container {
  width: 100%;
  height: 100%;
}
</style>
