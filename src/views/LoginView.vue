<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { LogIn } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login();
    router.push({ name: 'dashboard' });
  } catch (err: any) {
    error.value = err.message || 'Đăng nhập thất bại';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-100 p-8 text-center">
      <div class="flex justify-center mb-6">
        <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
          <LogIn :size="32" />
        </div>
      </div>
      <h1 class="text-2xl font-bold text-neutral-900 mb-2">ProForeman</h1>
      <p class="text-neutral-500 mb-8">Quản lý dự án xây dựng chuyên nghiệp</p>

      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
        {{ error }}
      </div>

      <button 
        @click="handleLogin"
        :disabled="loading"
        class="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      >
        <img src="https://www.google.com/favicon.ico" class="w-5 h-5 grayscale invert" alt="Google" />
        <span>{{ loading ? 'Đang xử lý...' : 'Tiếp tục với Google' }}</span>
      </button>

      <p class="mt-8 text-xs text-neutral-400">
        Bằng cách đăng nhập, bạn đồng ý với các điều khoản của hệ thống.
      </p>
    </div>
  </div>
</template>
