<script setup lang="ts">
import { computed } from 'vue';

// --- Interfaces & Types ---
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'light' | 'dark' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonIconPosition = 'left' | 'right';

interface Props {
  // Basic attributes
  type?: ButtonType;      // HTML button type (button, submit, reset)
  disabled?: boolean;     // Disabled state
  loading?: boolean;      // Loading state (shows spinner)

  // Visual styling
  variant?: ButtonVariant; // Color variant (primary, danger, etc.)
  size?: ButtonSize;      // Size (sm, md, lg)
  outline?: boolean;      // Outline style (border only)
  iconOnly?: boolean;     // For buttons with only an icon (square button)
  fullWidth?: boolean;    // Full width button (block)

  // Icon integration
  icon?: string;          // Tailwind/Heroicons class or custom SVG path for icon
  iconPosition?: ButtonIconPosition; // Position of the icon relative to text
  iconClass?: string;     // Additional classes for the icon itself

  // For Button Group context (internal use, typically passed by parent ButtonGroup)
  isGrouped?: boolean; // Indicates if button is part of a group (for styling adjustments)
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  disabled: false,
  loading: false,
  variant: 'primary',
  size: 'md',
  outline: false,
  iconOnly: false,
  fullWidth: false,
  iconPosition: 'left',
  isGrouped: false,
});

// --- Computed Classes for Styling ---

const baseClasses = [
  'inline-flex items-center justify-center font-medium rounded-md text-center transition-colors duration-200 ease-in-out',
  'focus:outline-none focus:ring-2 focus:ring-offset-2', // Focus ring default
  props.loading && 'cursor-not-allowed opacity-75',
  props.disabled && 'cursor-not-allowed opacity-50',
  props.fullWidth && 'w-full',
  props.isGrouped && 'rounded-none' // Remove individual rounding for grouped buttons
];

const sizeClasses = computed(() => {
  if (props.iconOnly) {
    switch (props.size) {
      case 'xs': return 'p-1';
      case 'sm': return 'p-1.5';
      case 'md': return 'p-2';
      case 'lg': return 'p-2.5';
      case 'xl': return 'p-3';
      default: return 'p-2';
    }
  }

  switch (props.size) {
    case 'xs': return 'px-2.5 py-1 text-xs';
    case 'sm': return 'px-3 py-1.5 text-sm';
    case 'md': return 'px-4 py-2 text-sm';
    case 'lg': return 'px-5 py-2.5 text-base';
    case 'xl': return 'px-6 py-3 text-lg';
    default: return 'px-4 py-2 text-sm';
  }
});

const variantClasses = computed(() => {
  if (props.outline) {
    switch (props.variant) {
      case 'primary': return 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500';
      case 'secondary': return 'border border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500';
      case 'danger': return 'border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500';
      case 'success': return 'border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500';
      case 'warning': return 'border border-yellow-600 text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500';
      case 'info': return 'border border-cyan-600 text-cyan-600 hover:bg-cyan-50 focus:ring-cyan-500';
      case 'light': return 'border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-300';
      case 'dark': return 'border border-gray-800 text-gray-800 hover:bg-gray-100 focus:ring-gray-800';
      case 'link': return 'border-0 text-blue-600 hover:underline focus:ring-blue-500 focus:ring-offset-0';
      default: return 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500';
    }
  } else {
    switch (props.variant) {
      case 'primary': return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary': return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'danger': return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      case 'success': return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500';
      case 'warning': return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info': return 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500';
      case 'light': return 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300';
      case 'dark': return 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-700';
      case 'link': return 'bg-transparent text-blue-600 hover:underline focus:ring-blue-500 focus:ring-offset-0';
      default: return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    }
  }
});

const iconSizeClasses = computed(() => {
  if (props.iconOnly) {
    switch (props.size) {
      case 'xs': return 'w-3 h-3';
      case 'sm': return 'w-3.5 h-3.5';
      case 'md': return 'w-4 h-4';
      case 'lg': return 'w-5 h-5';
      case 'xl': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  } else {
    // For text buttons with icons, size is generally consistent
    switch (props.size) {
      case 'xs': return 'w-3 h-3';
      case 'sm': return 'w-3.5 h-3.5';
      case 'md': return 'w-4 h-4';
      case 'lg': return 'w-5 h-5';
      case 'xl': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  }
});

const iconSpacingClasses = computed(() => {
  if (props.icon && !props.iconOnly && !props.loading) { // Only add spacing if there's an icon and text, and not loading
    return props.iconPosition === 'left' ? 'mr-2' : 'ml-2';
  }
  return '';
});

// --- Final Class Composition ---
const allClasses = computed(() => [
  ...baseClasses,
  ...sizeClasses.value.split(' '),
  ...variantClasses.value.split(' '),
]);

</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="allClasses"
  >
    <span v-if="loading" :class="[iconSizeClasses, { 'mr-2': !iconOnly }]">
      <svg class="animate-spin h-full w-full text-white" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>

    <span v-if="icon && iconPosition === 'left' && !loading"
          :class="[iconSizeClasses, iconSpacingClasses, iconClass]">
      <i :class="icon"></i> </span>

    <slot v-if="!iconOnly"></slot>

    <span v-if="icon && iconPosition === 'right' && !loading"
          :class="[iconSizeClasses, iconSpacingClasses, iconClass]">
      <i :class="icon"></i>
    </span>

    <span v-if="iconOnly && icon && !loading"
          :class="[iconSizeClasses, iconClass]">
      <i :class="icon"></i>
    </span>
  </button>
</template>

<style scoped>
/* No specific scoped styles needed if using Tailwind extensively */
</style>