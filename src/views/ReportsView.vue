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
  ScrollText,
  RefreshCw
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const reports = ref<any[]>([]);
const loading = ref(true);
const isRefreshing = ref(false);
const filterProjectId = ref('');
const isFormOpen = ref(false);
const isDetailOpen = ref(false);
const selectedReportDetail = ref<any>(null);
const lastDoc = ref<any>(null);
const hasMore = ref(true);

const openDetailModal = (report: any) => {
  selectedReportDetail.value = report;
  isDetailOpen.value = true;
};

const handleManualRefresh = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await appStore.refreshAll();
    await fetchReports();
  } catch (err) {
    console.error('Manual refresh of reports failed:', err);
  } finally {
    isRefreshing.value = false;
  }
};

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

const sendTelegramNotification = async (formData: any, reporterName: string) => {
  const channelConfig = appStore.system_configs?.find(
    (c: any) => c.name?.trim().toLowerCase() === 'kênh báo cáo'
  );
  if (!channelConfig) {
    console.log('No Telegram "Kênh Báo cáo" configuration found.');
    return;
  }

  const { telegram_bot_token, telegram_chat_id } = channelConfig;
  if (!telegram_bot_token || !telegram_chat_id) {
    console.log('Telegram "Kênh Báo cáo" configurations are incomplete.');
    return;
  }

  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const textMessage = `📋 *BÁO CÁO CÔNG VIỆC*

👤 *Người báo cáo:* ${reporterName}
📅 *Ngày báo cáo:* ${formatDateVN(formData.report_date)}
🏗️ *Dự án:* ${getProjectName(formData.project_id)}

🛠️ *Nội dung công việc*

${formData.tasks_summary || 'Chưa có ghi nhận'}

⚠️ *Khó khăn & Vấn đề*

${formData.issues || 'Không có ghi nhận'}

💡 *Giải pháp*

${formData.resolutions || 'Không có ghi nhận'}

📌 *Kế hoạch kỳ tiếp theo*

${formData.next_tasks || 'Đang cập nhật kế hoạch thi công...'}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegram_bot_token.trim()}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: telegram_chat_id.trim(),
        text: textMessage,
        parse_mode: 'Markdown'
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send Telegram notification:', response.status, errorText);
    } else {
      console.log('Telegram report notification sent successfully.');
    }
  } catch (err) {
    console.error('Network error during Telegram notification:', err);
  }
};

const handleSubmit = async () => {
  if (!form.project_id || loading.value) return;
  loading.value = true;
  try {
    const reporterName = authStore.user?.name || getEmployeeName(authStore.user?.id) || 'Không rõ';
    const reportDataCopy = { ...form };
    
    await appStore.saveEntity('reports', 'CREATE', {
      ...form,
      employee_id: authStore.user?.id,
      progress_percent: 0 // Keep for compatibility
    });
    
    // Asynchronously dispatch selection without blocking user redirect/loading flow
    sendTelegramNotification(reportDataCopy, reporterName);

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
          @click="handleManualRefresh"
          :disabled="isRefreshing"
          class="inline-flex items-center justify-center bg-white border border-neutral-100 hover:border-blue-400 text-neutral-600 hover:text-blue-600 rounded-xl p-2.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          id="btn-manual-refresh"
          title="Làm mới dữ liệu"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
        </button>
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
                    <button 
                      @click="openDetailModal(report)"
                      class="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      :id="'btn-view-report-detail-' + report.id"
                    >
                      Chi tiết
                    </button>
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

    <!-- Report Detail Modal -->
    <div v-if="isDetailOpen && selectedReportDetail" class="fixed inset-0 z-[110] flex items-center justify-center p-4" id="modal-report-detail">
      <div @click="isDetailOpen = false; selectedReportDetail = null;" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
        <button 
          @click="isDetailOpen = false; selectedReportDetail = null;" 
          class="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full hover:bg-neutral-100 transition-colors"
          id="btn-close-detail-modal"
        >
          <X :size="16" />
        </button>
        
        <div class="border-b border-neutral-100 pb-6 mb-6 text-center sm:text-left">
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
            <span class="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-wider">
              {{ selectedReportDetail.type === 'DAILY' ? 'Hàng ngày' : selectedReportDetail.type === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng' }}
            </span>
            <span class="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ngày lập: {{ selectedReportDetail.report_date }}</span>
          </div>
          <h2 class="text-xl md:text-2xl font-black text-neutral-900 uppercase tracking-tight">Chi tiết báo cáo công việc</h2>
          <p class="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-1.5">{{ getProjectName(selectedReportDetail.project_id) }}</p>
        </div>

        <div class="space-y-6">
          <!-- Metadata Info cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100/50">
            <div>
              <span class="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Người lập báo cáo</span>
              <p class="text-xs font-black text-neutral-800 uppercase">{{ getEmployeeName(selectedReportDetail.employee_id) }}</p>
            </div>
            <div>
              <span class="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Dự án áp dụng</span>
              <p class="text-xs font-black text-neutral-800 uppercase">{{ getProjectName(selectedReportDetail.project_id) }}</p>
            </div>
          </div>

          <!-- Section: Tasks Summary -->
          <div class="space-y-2">
            <h4 class="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-50 pb-2">
              <ScrollText :size="14" class="text-blue-500" />
              <span>Nội dung công việc đã làm</span>
            </h4>
            <div class="bg-blue-50/20 p-5 rounded-2xl border border-blue-100/30 text-xs font-bold text-neutral-700 leading-relaxed whitespace-pre-line">
              {{ selectedReportDetail.tasks_summary || 'Không có mô tả chi tiết' }}
            </div>
          </div>

          <!-- Section: Issues & Solutions -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <h4 class="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-50 pb-2">
                <AlertCircle :size="14" class="text-red-500" />
                <span class="text-red-600">Khó khăn & Vấn đề</span>
              </h4>
              <div class="bg-red-50/30 p-5 rounded-2xl border border-red-100/20 text-xs font-bold text-neutral-700 leading-relaxed italic whitespace-pre-line">
                {{ selectedReportDetail.issues || 'Không có ghi nhận khó khăn' }}
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-50 pb-2">
                <CheckCircle2 :size="14" class="text-emerald-500" />
                <span class="text-emerald-600">Giải pháp đề xuất</span>
              </h4>
              <div class="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/20 text-xs font-bold text-neutral-700 leading-relaxed italic whitespace-pre-line">
                {{ selectedReportDetail.resolutions || 'Không có ghi nhận giải pháp' }}
              </div>
            </div>
          </div>

          <!-- Section: Next tasks -->
          <div class="space-y-2">
            <h4 class="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-50 pb-2">
              <TrendingUp :size="14" class="text-neutral-500" />
              <span>Kế hoạch kỳ tiếp theo</span>
            </h4>
            <div class="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 text-xs font-bold text-neutral-700 leading-relaxed whitespace-pre-line">
              {{ selectedReportDetail.next_tasks || 'Đang cập nhật kế hoạch thi công...' }}
            </div>
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-neutral-100 flex justify-end">
          <button 
            @click="isDetailOpen = false; selectedReportDetail = null;"
            class="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-md transition-all active:scale-95"
            id="btn-close-detail-modal-footer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
