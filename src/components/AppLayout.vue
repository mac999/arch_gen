<template>
  <div class="layout">
    <AppHeader />
    <div class="content">
      <aside v-if="showSidebar" class="sidebar">
        <slot name="sidebar"></slot>
      </aside>
      <main class="main-canvas">
        <slot name="canvas"></slot>
      </main>
    </div>
  </div>
</template>

<script setup>
import AppHeader from './AppHeader.vue'

defineProps({
  showSidebar: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 320px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  padding: 24px;
}

.main-canvas {
  flex: 1;
  background: #ffffff;
  overflow: hidden;
  position: relative;
}
</style>
