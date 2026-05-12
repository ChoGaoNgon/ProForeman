<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { 
  Plus, 
  Search, 
  Calendar, 
  ClipboardList, 
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  ScrollText
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const reports = ref<any[]>([]);
const loading = ref(true);
const filterProjectId = ref('');
const isFormOpen = ref(false);
const lastDoc = ref<any>(null);
const hasMore = ref(true);

const fetchReports = async (isLoadMore = false) => {
  if (loading.value && isLoadMore) return;
  
  if (!isLoadMore) {
    reports.value = [];
    lastDoc.value = null;
    hasMore.value = true;
  }
  
  loading.value = true;
  try {
    const result = await appStore.fetchReportsPaginated(3, filterProjectId.value || undefined, lastDoc.value);
    
    if (result.reports.length < 3) {
      hasMore.value = false;
    }
    
    if (isLoadMore) {
      reports.value = [...reports.value, ...result.reports];
    } else {
      reports.value = result.reports;
    }
    
    lastDoc.value = result.lastDoc;
  } catch (err) {
    console.error('Error fetching reports:', err);
  } finally {
    loading.value = false;
  }
};

// Handle project filter changes
import { watch } from 'vue';
watch(filterProjectId, () => {
  fetchReports();
});

onMounted(async () => {
  await appStore.refreshAll(); // Still need to load projects/assignments
  await fetchReports();
});

const getProjectName = (id: string) => {
  return appStore.visibleProjects.find(p => p.id === id)?.name || 'N/A';
};

const getEmployeeName = (id: string) => {
  return appStore.employees.find(e => e.id === id)?.name || 'N/A';
};

// Form Logic
const form = reactive({
  project_id: '',
  type: 'DAILY',
  report_date: new Date().toISOString().split('T')[0],
  issues: '',
  resolutions: '',
  tasks_summary: '',
  next_tasks: ''
});

const handleSubmit = async () => {
  if (!form.project_id || loading.value) return;
  loading.value = true;
  try {
    await appStore.saveEntity('reports', 'CREATE', {
      ...form,
      employee_id: authStore.user?.id,
      progress_percent: 0 // Keep for compatibility
    });
    Object.assign(form, {
      project_id: '',
      type: 'DAILY',
      report_date: new Date().toISOString().split('T')[0],
      issues: '',
      resolutions: '',
      tasks_summary: '',
      next_tasks: ''
    });
    isFormOpen.value = false;
    await fetchReports(); // Reload to see the new report
  } catch (err) {
    console.error('Error saving report:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
     <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-neutral-900 tracking-tight uppercase leading-none">Báo cáo công việc</h1>
        <p class="text-neutral-500 mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Theo dõi tiến độ & xử lý tồn tại</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="filterProjectId" class="bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm outline-none">
          <option value="">Lọc: Tất cả dự án</option>
          <option v-for="p in appStore.visibleProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <button 
          @click="isFormOpen = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus :size="16" />
          <span>Lập báo cáo</span>
        </button>
      </div>
    </div>

    <!-- Report List -->
    <div class="space-y-4">
       <div v-if="reports.length === 0 && !loading" class="py-16 text-center bg-white rounded-3xl border border-dashed border-neutral-200">
         <ClipboardList :size="48" class="text-neutral-200 mx-auto mb-4" />
         <p class="text-neutral-400 font-bold">Chưa có báo cáo nào được ghi nhận</p>
       </div>
       
       <div v-for="report in reports" :key="report.id" class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col md:flex-row hover:border-blue-200 transition-colors">
          <div class="md:w-28 bg-neutral-50 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-100">
             <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm mb-2">
                <Calendar :size="16" />
             </div>
             <p class="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{{ report.type }}</p>
             <p class="text-[11px] font-black text-neutral-900 mt-0.5">{{ report.report_date }}</p>
          </div>
          
          <div class="flex-1 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 relative">
             <button class="absolute top-4 right-4 p-2 text-neutral-300 hover:text-neutral-900">
                <MoreHorizontal :size="18" />
             </button>

             <div class="space-y-4">
                <div>
                  <h3 class="text-base font-black text-neutral-900 uppercase tracking-tight">{{ getProjectName(report.project_id) }}</h3>
                  <div class="flex items-center gap-3 mt-1 underline decoration-blue-500/30 underline-offset-4">
                    <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Người báo cáo: {{ getEmployeeName(report.employee_id) }}</span>
                  </div>
                </div>

                <div class="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                  <div class="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">
                     <ScrollText :size="12" />
                     <span>Nội dung công việc</span>
                  </div>
                  <p class="text-[13px] font-medium text-neutral-700 leading-relaxed">{{ report.tasks_summary || 'Không có mô tả chi tiết' }}</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="bg-red-50/50 p-3 rounded-xl border border-red-100/50">
                    <div class="flex items-center gap-2 text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">
                       <AlertCircle :size="12" />
                       <span>Khó khăn & Vấn đề</span>
                    </div>
                    <p class="text-[12px] font-medium text-neutral-600 italic">"{{ report.issues || 'Không có ghi nhận' }}"</p>
                  </div>
                  <div class="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                    <div class="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                       <CheckCircle2 :size="12" />
                       <span>Giải pháp</span>
                    </div>
                    <p class="text-[12px] font-medium text-neutral-600 italic">"{{ report.resolutions || 'Không có ghi nhận' }}"</p>
                  </div>
                </div>
             </div>

             <div class="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                <div>
                  <h4 class="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-3">Kế hoạch kỳ tiếp theo</h4>
                  <p class="text-sm font-medium text-neutral-600 leading-relaxed">{{ report.next_tasks || 'Đang cập nhật kế hoạch thi công...' }}</p>
                </div>
                
                <div class="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                   <div class="flex items-center gap-2">
                      <div class="w-7 h-7 bg-white rounded-lg flex items-center justify-center font-bold text-neutral-400 text-[10px] shadow-sm">
                         {{ getEmployeeName(report.employee_id).charAt(0) }}
                      </div>
                      <div class="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                         Trạng thái: <span class="text-emerald-500">Đã gửi</span>
                      </div>
                   </div>
                   <button class="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Chi tiết</button>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="flex justify-center pt-4">
       <button 
         @click="fetchReports(true)" 
         :disabled="loading"
         class="px-8 py-3 bg-white border border-neutral-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
       >
         {{ loading ? 'Đang tải...' : 'Hiển thị thêm' }}
       </button>
    </div>

    <!-- Create Modal -->
    <div v-if="isFormOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4">
       <div @click="isFormOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
       <div class="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] bg-white rounded-none sm:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div class="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto">
            <button @click="isFormOpen = false" class="absolute top-6 right-6 p-1.5 hover:bg-neutral-200 rounded-full transition-colors z-10">
               <X :size="20" class="text-neutral-400" />
             </button>

             <div>
               <h2 class="text-2xl font-black text-neutral-900 uppercase tracking-tight">Lập báo cáo dự án</h2>
               <p class="text-neutral-500 mt-2 font-bold text-sm">CẬP NHẬT TIẾN ĐỘ & HIỆN TRẠNG CÔNG TRƯỜNG</p>
             </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                   <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Dự án</label>
                   <select v-model="form.project_id" class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold">
                     <option value="" disabled>-- Chọn dự án --</option>
                     <option v-for="p in appStore.visibleProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
                   </select>
                </div>
                <div>
                   <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Loại báo cáo</label>
                   <select v-model="form.type" class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold">
                     <option value="DAILY">Hàng ngày</option>
                     <option value="WEEKLY">Hàng tuần</option>
                     <option value="MONTHLY">Hàng tháng</option>
                   </select>
                </div>
                <div>
                   <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày báo cáo</label>
                   <input v-model="form.report_date" type="date" class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold" />
                </div>
              </div>

              <div>
                 <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Nội dung công việc</label>
                 <textarea v-model="form.tasks_summary" rows="4" class="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium" placeholder="Mô tả các công việc"></textarea>
              </div>

              <div>
                 <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 font-bold text-red-500">Khó khăn / Tồn tại</label>
                 <textarea v-model="form.issues" rows="4" class="w-full p-4 bg-red-50/30 border border-red-100 rounded-2xl outline-none focus:border-red-500 transition-all text-sm font-medium" placeholder="Các vấn đề phát sinh cần hỗ trợ..."></textarea>
              </div>


              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 text-neutral-400">Giải pháp đề xuất</label>
                <textarea v-model="form.resolutions" rows="5" class="w-full p-4 bg-white border border-neutral-100 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" placeholder="Cách khắc phục vấn đề..."></textarea>
             </div>

             <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Kế hoạch kỳ tới</label>
                <textarea v-model="form.next_tasks" rows="5" class="w-full p-4 bg-white border border-neutral-100 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" placeholder="Các công việc dự kiến..."></textarea>
             </div>
             <div class="fixed bottom-0 left-0 right-0 p-4 md:relative md:p-0 bg-neutral-50/80 backdrop-blur-md md:bg-transparent border-t md:border-0 border-neutral-100 md:mt-auto">
                <button 
                  @click="handleSubmit" 
                  :disabled="loading"
                  class="w-full h-14 bg-neutral-900 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all tracking-widest uppercase text-xs disabled:opacity-50"
                >
                   {{ loading ? 'Đang gửi...' : 'Gửi báo cáo' }}
                </button>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>
