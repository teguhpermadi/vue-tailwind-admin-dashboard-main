// src/motionPresets.ts
import type { MotionPluginOptions } from '@vueuse/motion'

const motionPresets: MotionPluginOptions = {
  directives: {
    // Pop dari bawah
    'pop-bottom': {
      initial: { opacity: 0, y: 100, scale: 0.9 },
      visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', stiffness: 250, damping: 20 },
      },
    },

    // Fade-in
    'fade-in': {
      initial: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },

    // Slide dari kiri
    // 'slide-left': {
    //   initial: { opacity: 0, x: -50 },
    //   visible: {
    //     opacity: 1, x: 0,
    //     transition: { duration: 0.5 },
    //   },
    // },

    // Slide dari kanan
    // 'slide-right': {
    //   initial: { opacity: 0, x: 50 },
    //   visible: {
    //     opacity: 1, x: 0,
    //     transition: { duration: 0.5 },
    //   },
    // },

    // Slide dari atas
    'slide-down': {
      initial: { opacity: 0, y: -40 },
      visible: {
        opacity: 1, y: 0,
        transition: { duration: 0.4 },
      },
    },

    // Bounce (mantul lucu 😄)
    'bounce': {
      initial: { y: -20, opacity: 0 },
      visible: {
        y: 0, opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 10,
        },
      },
    },

    // Zoom-in
    'zoom-in': {
      initial: { scale: 0.8, opacity: 0 },
      visible: {
        scale: 1, opacity: 1,
        transition: { duration: 0.4 },
      },
    },

    // Flip horizontal
    'flip-x': {
      initial: { rotateY: -90, opacity: 0 },
      visible: {
        rotateY: 0, opacity: 1,
        transition: { duration: 0.6 },
      },
    },

    // Flip vertical
    'flip-y': {
      initial: { rotateX: -90, opacity: 0 },
      visible: {
        rotateX: 0, opacity: 1,
        transition: { duration: 0.6 },
      },
    },

    // Skew masuk dari kiri
    'skew-left': {
      initial: { opacity: 0, x: -30, skewX: -15 },
      visible: {
        opacity: 1, x: 0, skewX: 0,
        transition: { duration: 0.5 },
      },
    },

    // Skew masuk dari kanan
    'skew-right': {
      initial: { opacity: 0, x: 30, skewX: 15 },
      visible: {
        opacity: 1, x: 0, skewX: 0,
        transition: { duration: 0.5 },
      },
    },
  },
}

export default motionPresets
