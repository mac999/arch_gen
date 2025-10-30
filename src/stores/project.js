import { defineStore } from 'pinia'
import Papa from 'papaparse'
import { createDXF } from 'dxf-writer'

const STORAGE_KEY = 'arch_gen_projects'
const MAX_HISTORY = 50

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [],
    currentProject: null,
    currentFloor: 1,
    history: [],
    historyIndex: -1
  }),
  
  getters: {
    getProjectById: (state) => (id) => {
      return state.projects.find(p => p.id === id)
    },
    
    getCurrentFloorData: (state) => {
      if (!state.currentProject) return null
      return state.currentProject.floors.find(f => f.number === state.currentFloor)
    },
    
    canUndo: (state) => state.historyIndex > 0,
    canRedo: (state) => state.historyIndex < state.history.length - 1
  },
  
  actions: {
    // Local Storage 관련
    loadFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          this.projects = data.projects || []
        }
      } catch (error) {
        console.error('Failed to load from storage:', error)
      }
    },
    
    saveToStorage() {
      try {
        const data = {
          projects: this.projects
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error('Failed to save to storage:', error)
      }
    },
    
    // History 관련
    saveHistory() {
      if (!this.currentProject) return
      
      const snapshot = JSON.parse(JSON.stringify(this.currentProject))
      
      // 현재 인덱스 이후의 히스토리 제거
      this.history = this.history.slice(0, this.historyIndex + 1)
      
      // 새 스냅샷 추가
      this.history.push(snapshot)
      
      // 최대 히스토리 제한
      if (this.history.length > MAX_HISTORY) {
        this.history.shift()
      } else {
        this.historyIndex++
      }
    },
    
    undo() {
      if (!this.canUndo) return
      
      this.historyIndex--
      const snapshot = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
      this.currentProject = snapshot
      
      // 프로젝트 목록에서도 업데이트
      const index = this.projects.findIndex(p => p.id === snapshot.id)
      if (index !== -1) {
        this.projects[index] = snapshot
      }
    },
    
    redo() {
      if (!this.canRedo) return
      
      this.historyIndex++
      const snapshot = JSON.parse(JSON.stringify(this.history[this.historyIndex]))
      this.currentProject = snapshot
      
      // 프로젝트 목록에서도 업데이트
      const index = this.projects.findIndex(p => p.id === snapshot.id)
      if (index !== -1) {
        this.projects[index] = snapshot
      }
    },
    
    async uploadCSV(file) {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            try {
              const data = results.data[0]
              
              // 필수 필드 검증
              if (!data.site_area || !data.gross_floor_area || !data.num_floors) {
                reject(new Error('필수 필드가 누락되었습니다.'))
                return
              }
              
              // 프로젝트 생성
              const project = this.createProject(data)
              this.projects.push(project)
              this.currentProject = project
              this.saveToStorage()
              this.history = [JSON.parse(JSON.stringify(project))]
              this.historyIndex = 0
              
              resolve(project)
            } catch (error) {
              reject(error)
            }
          },
          error: (error) => {
            reject(error)
          }
        })
      })
    },
    
    createProject(csvData) {
      const projectId = Date.now().toString()
      const floorArea = csvData.gross_floor_area / csvData.num_floors
      
      // room_type_ratios 파싱 (예: "office:0.6,meeting:0.2,corridor:0.2")
      const roomRatios = {}
      if (csvData.room_type_ratios) {
        const ratioStr = csvData.room_type_ratios
        ratioStr.split(',').forEach(pair => {
          const [type, ratio] = pair.split(':')
          roomRatios[type.trim()] = parseFloat(ratio)
        })
      } else {
        // 기본값
        roomRatios['livingroom'] = 0.3
        roomRatios['bedroom'] = 0.25
        roomRatios['kitchen'] = 0.15
        roomRatios['bathroom'] = 0.15
        roomRatios['corridor'] = 0.15
      }
      
      // 각 층 생성
      const floors = []
      for (let i = 1; i <= csvData.num_floors; i++) {
        floors.push({
          number: i,
          area: floorArea,
          spaces: this.generateFloorSpaces(floorArea, roomRatios, i),
          walls: [],
          doors: [],
          windows: []
        })
      }
      
      return {
        id: projectId,
        name: csvData.project_name || `프로젝트 ${projectId}`,
        siteArea: csvData.site_area,
        grossFloorArea: csvData.gross_floor_area,
        numFloors: csvData.num_floors,
        roomRatios,
        floors,
        createdAt: new Date().toISOString()
      }
    },
    
    generateFloorSpaces(floorArea, roomRatios, floorNumber) {
      const spaces = []
      let currentX = 0
      const floorWidth = Math.sqrt(floorArea)
      const floorHeight = floorArea / floorWidth
      
      // 복도는 중앙에 배치
      if (roomRatios.corridor) {
        const corridorArea = floorArea * roomRatios.corridor
        const corridorWidth = floorWidth
        const corridorHeight = corridorArea / corridorWidth
        
        spaces.push({
          id: `${floorNumber}-corridor`,
          type: 'corridor',
          x: 0,
          y: floorHeight / 2 - corridorHeight / 2,
          width: corridorWidth,
          height: corridorHeight,
          area: corridorArea
        })
      }
      
      // 나머지 공간들을 복도 위아래로 배치
      const remainingTypes = Object.keys(roomRatios).filter(t => t !== 'corridor')
      const upperY = 0
      const lowerY = floorHeight / 2 + (roomRatios.corridor ? floorArea * roomRatios.corridor / floorWidth / 2 : 0)
      const remainingHeight = floorHeight / 2 - (roomRatios.corridor ? floorArea * roomRatios.corridor / floorWidth / 2 : 0)
      
      remainingTypes.forEach((type, index) => {
        const area = floorArea * roomRatios[type]
        const width = floorWidth / remainingTypes.length
        const height = remainingHeight
        const y = index % 2 === 0 ? upperY : lowerY
        
        spaces.push({
          id: `${floorNumber}-${type}-${index}`,
          type,
          x: (index % 2) * width,
          y,
          width,
          height,
          area
        })
      })
      
      return spaces
    },
    
    setCurrentProject(projectId) {
      this.currentProject = this.getProjectById(projectId)
      if (this.currentProject) {
        this.history = [JSON.parse(JSON.stringify(this.currentProject))]
        this.historyIndex = 0
      }
    },
    
    setCurrentFloor(floorNumber) {
      this.currentFloor = floorNumber
    },
    
    updateSpace(floorNumber, spaceId, updates) {
      const floor = this.currentProject.floors.find(f => f.number === floorNumber)
      if (floor) {
        const space = floor.spaces.find(s => s.id === spaceId)
        if (space) {
          Object.assign(space, updates)
          this.saveHistory()
          this.saveToStorage()
        }
      }
    },
    
    addElement(floorNumber, elementType, data) {
      const floor = this.currentProject.floors.find(f => f.number === floorNumber)
      if (floor) {
        const element = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...data
        }
        floor[elementType].push(element)
        this.saveHistory()
        this.saveToStorage()
        return element
      }
    },
    
    removeElement(floorNumber, elementType, elementId) {
      const floor = this.currentProject.floors.find(f => f.number === floorNumber)
      if (floor) {
        const index = floor[elementType].findIndex(e => e.id === elementId)
        if (index !== -1) {
          floor[elementType].splice(index, 1)
          this.saveHistory()
          this.saveToStorage()
        }
      }
    },
    
    exportReport() {
      if (!this.currentProject) return null
      
      const reportData = []
      
      // 프로젝트 요약
      reportData.push({
        category: '프로젝트 정보',
        name: this.currentProject.name,
        value: '',
        unit: ''
      })
      reportData.push({
        category: '대지면적',
        name: '',
        value: this.currentProject.siteArea,
        unit: 'm²'
      })
      reportData.push({
        category: '연면적',
        name: '',
        value: this.currentProject.grossFloorArea,
        unit: 'm²'
      })
      reportData.push({
        category: '층수',
        name: '',
        value: this.currentProject.numFloors,
        unit: '층'
      })
      
      // 각 층별 상세 정보
      this.currentProject.floors.forEach(floor => {
        reportData.push({
          category: `${floor.number}층`,
          name: '층 면적',
          value: floor.area.toFixed(2),
          unit: 'm²'
        })
        
        // 공간별 집계
        const spacesByType = {}
        floor.spaces.forEach(space => {
          if (!spacesByType[space.type]) {
            spacesByType[space.type] = { count: 0, totalArea: 0 }
          }
          spacesByType[space.type].count++
          spacesByType[space.type].totalArea += space.area
        })
        
        Object.keys(spacesByType).forEach(type => {
          reportData.push({
            category: `${floor.number}층`,
            name: `${type} 개수`,
            value: spacesByType[type].count,
            unit: '개'
          })
          reportData.push({
            category: `${floor.number}층`,
            name: `${type} 면적`,
            value: spacesByType[type].totalArea.toFixed(2),
            unit: 'm²'
          })
        })
        
        // 문, 창문 개수
        reportData.push({
          category: `${floor.number}층`,
          name: '문 개수',
          value: floor.doors.length,
          unit: '개'
        })
        reportData.push({
          category: `${floor.number}층`,
          name: '창문 개수',
          value: floor.windows.length,
          unit: '개'
        })
      })
      
      // CSV 생성
      const csv = Papa.unparse(reportData)
      
      // 다운로드
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${this.currentProject.name}_report.csv`
      link.click()
      
      return csv
    },
    
    exportAsImage() {
      if (!this.currentProject) return

      const canvas = document.querySelector('canvas')
      if (!canvas) {
        console.error('Canvas not found')
        return
      }

      canvas.toBlob((blob) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${this.currentProject.name}_design.png`
        link.click()
      }, 'image/png')
    },

    exportAsDXF() {
      if (!this.currentProject) return

      const writer = new createDXF()

      this.currentProject.floors.forEach((floor) => {
        floor.walls.forEach((wall) => {
          writer.addLine(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
        })

        floor.doors.forEach((door) => {
          writer.addRectangle(door.x, door.y, door.width, door.height)
        })

        floor.windows.forEach((window) => {
          writer.addRectangle(window.x, window.y, window.width, window.height)
        })
      })

      const dxfBlob = new Blob([writer.toString()], { type: 'application/dxf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(dxfBlob)
      link.download = `${this.currentProject.name}_design.dxf`
      link.click()
    },
  }
})
