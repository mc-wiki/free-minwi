<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  open: []
  close: []
}>()
</script>

<template>
  <div v-if="show" class="promotion-wrapper">
    <button class="promotion" @click="emit('open')">
      <div class="promotion-avatar">
        <img
          src="data:image/gif;base64,R0lGODdhCAAIALMAAAAAAN2cfF2evyejc+q1kXm42D2/fvLDoo7S8kXYj4Hvmf///wAAAAAAAAAAAAAAACH5BAkAAAwALAAAAAAIAAgAAAQhUMmESkEqDYEqHgTBIQJ4HGIhEItwGi1xzqd8BEEd2HoEADs="
          alt="Merl Avatar"
          class="avatar-image"
        />
      </div>
      <div class="promotion-content">
        <p class="promotion-text">Hi, I'm Minwi. Need Support?</p>
      </div>
    </button>
    <button
      @click="emit('close')"
      class="close-promotion"
      aria-label="Close promotion"
    >
      <Icon name="close" :size="20" />
    </button>
  </div>
</template>

<style scoped>
/* Promotion wrapper - container for dialog and buttons */
.promotion-wrapper {
  position: fixed;
  bottom: 90px;
  right: 20px;

  max-width: 480px;
  z-index: 999;
  background-color: var(--mc-core-grey-5);
  border: 3px solid var(--mc-core-grey-4);
  display: flex;
  align-items: stretch;
  box-shadow: 3px 3px 0 var(--shadow-medium);
}

/* Promotion dialog - blocky style */
.promotion {
  padding: 12px;
  position: relative;
  color: var(--mc-core-white);
  background-color: var(--mc-core-grey-5);
  border: none;
  border-right: 3px solid var(--mc-core-grey-4);
  display: flex;
  align-items: center;
  gap: 12px;

  user-select: none;
  cursor: pointer;
}

.promotion-avatar {
  width: 32px;
  height: 32px;
  background-color: var(--mc-core-grey-6);
  border: 2px solid var(--mc-core-grey-4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.promotion-content {
  flex: 1;
}

.promotion-text {
  margin: 0;
  font-size: 16px;
  font-weight: 400;
  color: var(--mc-core-white);
}

.close-promotion {
  background: transparent;
  border: none;
  width: 32px;
  cursor: pointer;
  font-size: 20px;
  color: var(--mc-core-white);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
}

.close-promotion:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: var(--mc-core-white);
}

:global(body.wgl-theme-dark #minwi-app) .promotion {
  background-color: var(--mc-core-grey-6);
  border-color: var(--mc-core-grey-5);
}

:global(body.wgl-theme-dark #minwi-app) .promotion-avatar {
  background-color: var(--mc-core-grey-5);
  border-color: var(--mc-core-grey-4);
}
</style>
