<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { 
  Briefcase, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-vue-next';

const appStore = useAppStore();

onMounted(async () => {
  await appStore.refreshAll();
});

const stats = computed(() => {
  const all = appStore.visibleProjects;
  const getEval = (p: any) => p.status_evaluation || p.risk_status || 'SAFE';
  
  return {
    total: all.length,
    risk: all.filter(p => getEval(p) === 'RISK').length,
    warning: all.filter(p => getEval(p) === 'WARNING').length,
    safe: all.filter(p => getEval(p) === 'SAFE').length,
  };
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const urgentProjectsWithMetrics = computed(() => {
  const getEval = (p: any) => p.status_evaluation || p.risk_status || 'SAFE';
  
  return appStore.visibleProjects
    .filter(p => getEval(p) !== 'SAFE')
    .map(project => {
      const projectPayments = appStore.payments.filter(pay => pay.project_id === project.id && pay.is_deleted !== 1);
      
      const totalCompleted = projectPayments.reduce((sum, pay) => sum + (+pay.completed_value || 0), 0);
      const totalRecovered = projectPayments.reduce((sum, pay) => sum + (+pay.recovered_amount || 0), 0);
      
      const contractValue = +project.contract_value || 1;
      const totalAdvance = +project.advance_amount || 0;

      return {
        ...project,
        status_evaluation: getEval(project),
        acceptanceProgress: Math.min((totalCompleted / contractValue) * 100, 100),
        recoveryRate: totalAdvance > 0 ? Math.min((totalRecovered / totalAdvance) * 100, 100) : 0
      };
    });
});
</script>

<template>
  <div v-if="appStore.isInitialLoad" class="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
    <div class="text-center">
       <p class="text-xs font-black text-neutral-400 uppercase tracking-widest">Đang đồng bộ dữ liệu lần đầu...</p>
       <p class="text-[10px] text-neutral-400 mt-1 uppercase font-bold">Vui lòng đợi giây lát</p>
    </div>
  </div>

  <div v-else class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight">Hệ sinh thái dự án</h1>
        <p class="text-neutral-500 mt-1">Tổng quan sức khỏe tài chính & vận hành thời gian thực</p>
      </div>
      <div v-if="urgentProjectsWithMetrics.length > 0" class="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium border border-red-100">
        <Activity :size="16" />
        <span>{{ stats.risk + stats.warning }} Dự án cần chú ý</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
        <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Briefcase :size="20" />
        </div>
        <p class="text-sm font-medium text-neutral-500 uppercase tracking-wider">Tổng dự án</p>
        <p class="text-2xl font-bold text-neutral-900 mt-1">{{ stats.total }}</p>
        <p class="text-xs text-neutral-400 mt-2">Toàn hệ thống</p>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
        <div class="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle :size="20" />
        </div>
        <p class="text-sm font-medium text-neutral-500 uppercase tracking-wider">Dự án nguy cơ</p>
        <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.risk }}</p>
        <p class="text-xs text-neutral-400 mt-2">Cần xử lý khẩn cấp</p>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
          <AlertTriangle :size="20" />
        </div>
        <p class="text-sm font-medium text-neutral-500 uppercase tracking-wider">Dự án cảnh báo</p>
        <p class="text-2xl font-bold text-amber-600 mt-1">{{ stats.warning }}</p>
        <p class="text-xs text-neutral-400 mt-2">Theo dõi sát sao</p>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
        <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
          <CheckCircle2 :size="20" />
        </div>
        <p class="text-sm font-medium text-neutral-500 uppercase tracking-wider">Dự án an toàn</p>
        <p class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.safe }}</p>
        <p class="text-xs text-neutral-400 mt-2">Vận hành ổn định</p>
      </div>
    </div>

    <!-- Alert Section -->
    <div v-if="urgentProjectsWithMetrics.length > 0" class="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
      <div class="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
        <AlertCircle :size="18" class="text-red-500" />
        <h2 class="font-bold text-red-900">DỰ ÁN CẦN CHÚ TRỌNG (NGUY CƠ / CẢNH BÁO)</h2>
      </div>
      <div class="divide-y divide-neutral-100 overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-neutral-50/50">
            <tr class="text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-widest">
              <th class="px-6 py-4">Công trình</th>
              <th class="px-6 py-4">Sức khỏe tài chính</th>
              <th class="px-6 py-4">Tình trạng</th>
              <th class="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-for="project in urgentProjectsWithMetrics" :key="project.id" class="group hover:bg-neutral-50/50 transition-colors">
              <td class="px-6 py-4">
                <p class="font-bold text-neutral-900">{{ project.name }}</p>
                <p class="text-xs text-neutral-500 mt-0.5">HĐ: {{ formatCurrency(project.contract_value) }}</p>
              </td>
              <td class="px-6 py-4">
                <div class="space-y-3 max-w-[200px]">
                  <div>
                    <div class="flex justify-between text-[10px] font-bold mb-1">
                      <span class="text-blue-600 uppercase">Tiến bộ nghiệm thu</span>
                      <span class="text-blue-600">{{ Math.round(project.acceptanceProgress) }}% HT</span>
                    </div>
                    <div class="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div class="h-full bg-blue-600 rounded-full transition-all duration-500" :style="{ width: `${project.acceptanceProgress}%` }"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-[10px] font-bold mb-1">
                      <span class="text-emerald-600 uppercase">Thu hồi tạm ứng</span>
                      <span class="text-emerald-600">{{ Math.round(project.recoveryRate) }}% TH</span>
                    </div>
                    <div class="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div class="h-full bg-emerald-600 rounded-full transition-all duration-500" :style="{ width: `${project.recoveryRate}%` }"></div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                 <span 
                   :class="[
                     'px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase',
                     project.status_evaluation === 'RISK' ? 'bg-red-500 text-white' : 'bg-amber-400 text-neutral-900 border border-amber-200'
                   ]"
                 >
                   {{ project.status_evaluation }}
                 </span>
              </td>
              <td class="px-6 py-4 text-right">
                <router-link 
                  :to="{ name: 'project-detail', params: { id: project.id } }"
                  class="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-600 hover:scale-105 transition-transform"
                >
                  <span>Xử lý ngay</span>
                  <ChevronRight :size="12" />
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
