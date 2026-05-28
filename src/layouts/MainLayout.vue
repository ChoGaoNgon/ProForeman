<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Briefcase, 
  UserSquare2, 
  UserCheck,
  ClipboardList, 
  CreditCard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Bell,
  Activity as ActivityIcon,
  Package,
  Truck,
  Settings,
  Calendar,
  Download,
  Smartphone,
  Info
} from 'lucide-vue-next';
import { usePWAStore } from '@/stores/pwa';

const authStore = useAuthStore();
const appStore = useAppStore();
const pwaStore = usePWAStore();
const router = useRouter();
const route = useRoute();
const isSidebarOpen = ref(true);

const isIOS = computed(() => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream;
});

const showIOSGuide = ref(false);


const navItems = computed(() => {
  const items: any[] = [];
  
  if (appStore.hasAnyPaymentAccess) {
    items.push({ name: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard });
  }

  items.push({ name: 'projects', label: 'Dự án', icon: Briefcase });
  items.push({ name: 'reports', label: 'Báo cáo', icon: ClipboardList });
  items.push({ name: 'calendar', label: 'Lịch làm việc', icon: Calendar });
  items.push({ name: 'materials', label: 'Vật tư', icon: Package });
  items.push({ name: 'suppliers', label: 'Nhà cung cấp', icon: Truck });
  
  if (appStore.hasAnyPaymentAccess) {
    items.push({ name: 'payments', label: 'Thanh toán', icon: CreditCard });
  }
  
  if (authStore.isAdmin) {
    items.push({ name: 'departments', label: 'Phòng ban', icon: Building2 });
    items.push({ name: 'department-positions', label: 'Chức danh PB', icon: UserCheck });
    items.push({ name: 'employees', label: 'Nhân sự', icon: Users });
    items.push({ name: 'project-roles', label: 'Chức danh dự án', icon: UserSquare2 });
    items.push({ name: 'settings', label: 'Cấu hình hệ thống', icon: Settings });
  }
  
  return items;
});

const handleLogout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};

onMounted(() => {
  authStore.init();
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex">
    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-100 transition-transform duration-300 transform',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-neutral-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <span class="font-bold">BDI</span>
            </div>
            <span>BẠCH ĐẰNG INVEST</span>
          </div>
          <button @click="isSidebarOpen = false" class="lg:hidden ml-auto p-2 text-neutral-400">
            <X :size="20" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <router-link 
            v-for="item in navItems" 
            :key="item.name"
            :to="{ name: item.name }"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group',
              route.name === item.name || route.path.startsWith(`/${item.name}`)
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
            ]"
          >
            <component :is="item.icon" :size="20" />
            <span>{{ item.label }}</span>
            <ChevronRight 
              v-if="route.name === item.name" 
              :size="16" 
              class="ml-auto" 
            />
          </router-link>
        </nav>

        <!-- PWA Installation Widget -->
        <div v-if="(pwaStore.isInstallable || isIOS) && !pwaStore.isInstalled" class="px-4 py-3 mx-3 mb-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm">
          <div class="flex items-start gap-2.5">
            <div class="p-1.5 bg-white/15 rounded-lg text-white shrink-0">
              <Smartphone id="sidebar-pwa-smartphone" :size="16" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold leading-tight">BDI ERP Di Động</p>
              <p class="text-[9px] text-blue-100 leading-normal mt-0.5">Đặt ứng dụng lên màn hình chính</p>
            </div>
          </div>
          
          <!-- Download trigger (Android, Chrome, standard PWA) -->
          <button 
            v-if="pwaStore.isInstallable"
            @click="pwaStore.install"
            class="mt-2.5 w-full py-1.5 bg-white text-blue-600 hover:bg-neutral-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
            id="btn-sidebar-install"
          >
            <Download :size="12" />
            Tải Ứng Dụng
          </button>
          
          <!-- iOS Guide trigger (Safari) -->
          <div v-else-if="isIOS" class="mt-2 text-left">
            <button 
              @click="showIOSGuide = !showIOSGuide"
              class="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-white/20 cursor-pointer"
              id="btn-sidebar-ios-guide"
            >
              <Info :size="12" />
              Hướng dẫn cài đặt
            </button>
            <div v-if="showIOSGuide" class="mt-2 p-2 bg-black/20 rounded-lg text-[9px] text-blue-50 leading-relaxed font-semibold">
              Bấm vào biểu tượng <strong class="text-white">Chia sẻ (Share)</strong> trên trình duyệt Safari, sau đó chọn <strong class="text-white">"Thêm vào Màn hình chính" ("Add to Home Screen")</strong>.
            </div>
          </div>
        </div>

        <!-- User Profile -->
        <div class="p-4 border-t border-neutral-100">
          <div class="flex items-center gap-3 p-2 bg-neutral-50 rounded-xl mb-3">
             <img 
               v-if="authStore.user?.photo_url" 
               :src="authStore.user.photo_url" 
               class="w-10 h-10 rounded-lg"
               referrerpolicy="no-referrer"
             />
             <div v-else class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
               {{ authStore.user?.name?.charAt(0) }}
             </div>
             <div class="flex-1 min-w-0">
               <p class="text-sm font-semibold text-neutral-900 truncate">{{ authStore.user?.name }}</p>
               <p class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">{{ authStore.user?.system_role }}</p>
             </div>
          </div>
          <button 
            @click="handleLogout"
            class="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut :size="16" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <!-- Navbar -->
      <header class="h-16 bg-white border-b border-neutral-100 flex items-center justify-between px-4 lg:px-8 shrink-0">
        <button @click="isSidebarOpen = true" class="lg:hidden p-2 text-neutral-500">
          <Menu :size="24" />
        </button>
        
        <div class="flex items-center gap-4 ml-auto">
          <div v-if="appStore.isLoading" class="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
            <ActivityIcon :size="12" />
            <span>Đang tải dữ liệu...</span>
          </div>
          
          <!-- PWA Installation Button Header -->
          <button 
            v-if="pwaStore.isInstallable"
            @click="pwaStore.install"
            class="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
            id="btn-header-install"
            title="Tải ứng dụng về thiết bị"
          >
            <Download :size="14" />
            <span>Tải App</span>
          </button>

          <button class="p-2 text-neutral-400 hover:text-neutral-900 relative">
            <Bell :size="20" />
            <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8">
        <div class="max-w-7xl mx-auto">
          <RouterView />
        </div>
      </main>
    </div>

    <!-- Mobile Overlay -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false" 
      class="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40 lg:hidden"
    ></div>
  </div>
</template>

<style scoped>
.router-link-active:not(.router-link-exact-active) {
  /* Handle parent route highlight if needed */
}
</style>
