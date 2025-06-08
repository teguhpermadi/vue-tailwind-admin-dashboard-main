<script setup lang="ts">
import { computed, useSlots, provide } from 'vue';
import ButtonComponent from './ButtonComponent.vue'; // Import ButtonComponent

// Props untuk ButtonGroup (opsional, bisa ditambahkan jika ada styling spesifik grup)
interface Props {
  // Anda bisa menambahkan prop seperti 'direction' ('row'/'col') jika ingin grup vertikal
  // Misalnya, 'gap' untuk spasi antar tombol jika tidak ingin border menyatu
}

const props = defineProps<Props>();

// Provide context to child ButtonComponents
// This tells ButtonComponent it's part of a group, so it can adjust its rounding
provide('isGrouped', true);

const slots = useSlots();

// Computed property to apply specific classes to children
const renderedButtons = computed(() => {
  // Get all default slot content
  const defaultSlot = slots.default ? slots.default() : [];
  
  // Filter for ButtonComponent instances
  return defaultSlot.filter(vnode => {
    // Check if the vnode is a component and its type is ButtonComponent
    // This is a more robust way to check for a specific component type
    return vnode.type === ButtonComponent;
  });
});

</script>

<template>
  <div class="inline-flex rounded-md shadow-sm" role="group">
    <slot></slot>
  </div>
</template>

<style scoped>
/* Adjust children ButtonComponent's borders for a grouped look */
.inline-flex > :deep(.inline-flex:not(:first-child)) {
  margin-left: -1px; /* Overlap borders to make them appear as one */
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.inline-flex > :deep(.inline-flex:not(:last-child)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

/* Ensure z-index for hover/focus borders */
.inline-flex > :deep(.inline-flex:hover),
.inline-flex > :deep(.inline-flex:focus-within) {
  position: relative;
  z-index: 1;
}
</style>