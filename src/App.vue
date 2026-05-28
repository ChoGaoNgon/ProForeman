<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { usePWAStore } from '@/stores/pwa';

const appStore = useAppStore();
const pwaStore = usePWAStore();

onMounted(() => {
  appStore.init();
  pwaStore.init();
});
</script>

<template>
  <RouterView />
</template>

<style>
@import "tailwindcss";
</style>
