<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import ProjectForm from '@/components/ProjectForm.vue';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon,
  Briefcase,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
  MoreVertical,
  Trash2
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const searchQuery = ref('');
const isFormOpen = ref(false);
const editingProject = ref<any>(null);

const startEdit = (project: any) => {
  editingProject.value = project;
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
  editingProject.value = null;
};

onMounted(async () => {
  await appStore.refreshAll();
});

const filteredProjects = computed(() => {
  return appStore.visibleProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'RISK': return 'bg-red-500 text-white';
    case 'WARNING': return 'bg-amber-400 text-neutral-900';
    default: return 'bg-emerald-500 text-white';
  }
};
</script>

<template>
  <div v-if="appStore.isInitialLoad" class="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
    <div class="text-center">
       <p class="text-xs font-black text-neutral-400 uppercase tracking-widest">Đang tải danh sách dự án...</p>
       <p class="text-[10px] text-neutral-400 mt-1 uppercase font-bold">Dữ liệu đang được đồng bộ</p>
    </div>
  </div>

  <div v-else class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight">Danh mục dự án</h1>
        <p class="text-neutral-500 mt-1">Theo dõi tiến độ hợp đồng & tài chính</p>
      </div>
      <button 
        v-if="authStore.user?.system_role === 'ADMIN' || authStore.user?.system_role === 'CEO'"
        @click="isFormOpen = true"
        class="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
      >
        <Plus :size="20" />
        <span>Tạo dự án mới</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" :size="20" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Tìm kiếm dự án..." 
          class="w-full h-12 pl-12 pr-4 bg-white border border-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
        />
      </div>
      <div class="flex gap-2">
        <button class="h-12 px-4 bg-white border border-neutral-100 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm">
          <Filter :size="20" />
        </button>
        <div class="flex bg-white border border-neutral-100 rounded-xl p-1 shadow-sm">
          <button class="p-2 bg-neutral-100 text-neutral-900 rounded-lg">
            <LayoutGrid :size="20" />
          </button>
          <button class="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <ListIcon :size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- Project Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="project in filteredProjects" 
        :key="project.id"
        class="group bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
      >
        <div class="p-6 flex-1">
          <div class="flex justify-between items-start mb-6">
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center relative">
              <Briefcase :size="24" />
              <button 
                v-if="appStore.canManageProject(project.id)"
                @click.stop.prevent="startEdit(project)"
                class="absolute -top-2 -right-2 w-6 h-6 bg-white border border-neutral-100 shadow-sm rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:border-blue-100 transition-all"
              >
                <MoreVertical :size="12" />
              </button>
            </div>
            <div class="flex flex-col items-end gap-2">
              <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Giá trị HĐ</p>
              <p class="font-black text-neutral-900 leading-none">{{ formatCurrency(project.contract_value) }}</p>
              <span :class="['px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest', getStatusColor(project.status_evaluation)]">
                {{ project.status_evaluation }}
              </span>
            </div>
          </div>

          <h3 class="text-xl font-black text-neutral-900 mb-4 group-hover:text-blue-600 transition-colors uppercase leading-tight">
            {{ project.name }}
          </h3>

          <div class="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-50">
            <div>
              <p class="text-[10px] font-bold text-neutral-400 uppercase mb-1">Bắt đầu</p>
              <div class="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <Calendar :size="14" class="text-neutral-400" />
                <span>{{ project.start_date }}</span>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-bold text-neutral-400 uppercase mb-1">Dự kiến kết thúc</p>
              <div class="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <Calendar :size="14" class="text-neutral-400" />
                <span>{{ project.expected_end_date }}</span>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-bold text-neutral-400 uppercase mb-1">Ngày bàn giao</p>
              <div class="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <Calendar :size="14" class="text-neutral-400" />
                <span>{{ project.delivery_date || '---' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
          <div class="flex -space-x-2">
            <div v-for="i in 3" :key="i" class="w-7 h-7 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-500">
              <Users :size="12" />
            </div>
          </div>
          <router-link 
            :to="{ name: 'project-detail', params: { id: project.id } }"
            class="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 hover:gap-2 transition-all"
          >
            <span>Chi tiết</span>
            <ChevronRight :size="14" />
          </router-link>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredProjects.length === 0" class="py-20 text-center">
      <div class="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
        <Briefcase :size="32" />
      </div>
      <h3 class="text-lg font-bold text-neutral-900">Chưa có dự án nào</h3>
      <p class="text-neutral-500 max-w-xs mx-auto">Các dự án bạn tham gia hoặc quản lý sẽ hiển thị tại đây.</p>
    </div>

    <!-- Modals -->
    <ProjectForm 
      v-if="isFormOpen" 
      :project="editingProject"
      @close="closeForm" 
      @saved="appStore.refreshAll"
    />
  </div>
</template>
