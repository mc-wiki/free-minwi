<script setup lang="ts">
const icons = {
  chat: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M20 2H2v20h2V4h16v12H6v2H4v2h2v-2h16V2z'/%3E%3C/svg%3E")`,
  close: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M5 5h2v2H5zm4 4H7V7h2zm2 2H9V9h2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2zm2-2v2h-2V9zm2-2v2h-2V7zm0 0V5h2v2z'/%3E%3C/svg%3E")`,
  send: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M18 16H8v2H6v-2H4v-2h2v-2h2v2h10V4h2v12zM8 12v-2h2v2zm0 6v2h2v-2z'/%3E%3C/svg%3E")`,
  arrowUp: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M11 20h2V8h2V6h-2V4h-2v2H9v2h2zM7 10V8h2v2zm0 0v2H5v-2zm10 0V8h-2v2zm0 0v2h2v-2z'/%3E%3C/svg%3E")`,
  arrowDown: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M11 4h2v12h2v2h-2v2h-2v-2H9v-2h2zM7 14v2h2v-2zm0 0v-2H5v2zm10 0v2h-2v-2zm0 0v-2h2v2z'/%3E%3C/svg%3E")`,
  chevronRight: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M10 6h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm0 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2z'/%3E%3C/svg%3E")`,
  reload: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M16 2h-2v2h2v2H4v2H2v5h2V8h12v2h-2v2h2v-2h2V8h2V6h-2V4h-2zM6 20h2v2h2v-2H8v-2h12v-2h2v-5h-2v5H8v-2h2v-2H8v2H6v2H4v2h2z'/%3E%3C/svg%3E")`,
}

interface Props {
  name: keyof typeof icons
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
})
</script>

<template>
  <span
    class="icon"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      '-webkit-mask-image': icons[name],
      'mask-image': icons[name],
    }"
  ></span>
</template>

<style scoped>
.icon {
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-size: cover;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
</style>
