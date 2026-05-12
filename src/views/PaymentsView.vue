<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { 
  Plus, 
  CreditCard, 
  ChevronRight, 
  Calendar, 
  Activity,
  ArrowUpRight,
  Calculator,
  X,
  FileText
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const payments = ref<any[]>([]);
const loading = ref(true);
const isFormOpen = ref(false);
const filterProjectId = ref('');

const fetchPayments = async () => {
  loading.value = true;
  try {
    payments.value = [...appStore.visiblePayments];
  } catch (err) {
    console.error('Error fetching payments:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    appStore.refreshAll(),
    fetchPayments()
  ]);
});

const filteredPayments = computed(() => {
  if (!filterProjectId.value) return payments.value;
  return payments.value.filter(p => p.project_id === filterProjectId.value);
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const getProjectName = (id: string) => {
  return appStore.visibleProjects.find(p => p.id === id)?.name || 'N/A';
};

// Payment Form Logic
const form = reactive({
  project_id: '',
  completed_value: 0,
  other_payment: 0,
  payment_date: new Date().toISOString().split('T')[0],
  recovered_amount: 0,
  note: ''
});

const selectedProject = computed(() => {
  return appStore.visibleProjects.find(p => p.id === form.project_id);
});

const projectStats = ref<any>(null);

watch(() => form.project_id, async (newVal) => {
  if (newVal) {
    const projectPayments = appStore.visiblePayments.filter(p => p.project_id === newVal);
    const sorted = [...projectPayments].sort((a, b) => (b.sequence || 0) - (a.sequence || 0));
    const last = sorted[0] || { cumulative_completed: 0, cumulative_recovered: 0, sequence: 0 };
    
    projectStats.value = {
      ...last,
      next_sequence: (last.sequence || 0) + 1,
      total_advance: selectedProject.value?.advance_amount || 0
    };

    updateRecovery();
  } else {
    projectStats.value = null;
  }
});

const updateRecovery = () => {
  if (projectStats.value && selectedProject.value) {
    const rate = (selectedProject.value.advance_rate || 30) / 100;
    let recommended = form.completed_value * rate;
    const curCumCompleted = projectStats.value.cumulative_completed + form.completed_value;
    const threshold = (selectedProject.value.recovery_deadline_ratio || 80) / 100 * (selectedProject.value.contract_value || 0);
    
    if (curCumCompleted >= threshold) {
      recommended = projectStats.value.total_advance - projectStats.value.cumulative_recovered;
    }
    form.recovered_amount = Math.max(0, Math.min(recommended, projectStats.value.total_advance - projectStats.value.cumulative_recovered));
  }
};

watch(() => form.completed_value, () => updateRecovery());

const paidAmount = computed(() => {
  return (form.completed_value || 0) - (form.recovered_amount || 0);
});

const handleSubmit = async () => {
  if (!form.project_id || (form.completed_value <= 0 && form.other_payment <= 0) || loading.value) return;
  loading.value = true;
  try {
    const newCumulativeRecovered = (projectStats.value.cumulative_recovered || 0) + form.recovered_amount;
    const newCumulativeCompleted = (projectStats.value.cumulative_completed || 0) + form.completed_value;

    await appStore.saveEntity('payments', 'CREATE', {
      ...form,
      sequence: projectStats.value.next_sequence,
      paid_amount: paidAmount.value,
      cumulative_completed: newCumulativeCompleted,
      cumulative_recovered: newCumulativeRecovered,
      remaining_advance: projectStats.value.total_advance - newCumulativeRecovered
    });

    Object.assign(form, {
      project_id: '',
      completed_value: 0,
      other_payment: 0,
      payment_date: new Date().toISOString().split('T')[0],
      recovered_amount: 0,
      note: ''
    });
    isFormOpen.value = false;
    await fetchPayments();
  } catch (err) {
    console.error('Error saving payment:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight leading-none uppercase">QUẢN LÝ THANH TOÁN</h1>
        <p class="text-neutral-500 mt-2 font-medium">Lập hồ sơ nghiệm thu & Thu hồi tạm ứng</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <select v-model="filterProjectId" class="bg-white border border-neutral-100 rounded-xl px-4 py-3 text-xs font-bold shadow-sm outline-none">
          <option value="">Lọc dự án: Tất cả</option>
          <option v-for="p in appStore.visibleProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <button 
          @click="isFormOpen = true"
          class="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs hover:bg-neutral-800 transition-all shadow-lg"
        >
          <Plus :size="16" />
          <span>Lập thanh toán mới</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-neutral-50/50 text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-widest border-b border-neutral-100">
            <th class="px-8 py-5">Lần</th>
            <th class="px-8 py-5">Dự án / Công trình</th>
            <th class="px-8 py-5">Giá trị nghiệm thu</th>
            <th class="px-8 py-5">Trích chi khác</th>
            <th class="px-8 py-5">Thu hồi tạm ứng</th>
            <th class="px-8 py-5">Thực thanh (Paid)</th>
            <th class="px-8 py-5">Ngày thanh toán</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-50">
          <tr v-if="filteredPayments.length === 0" class="text-center text-neutral-400 py-20 italic">
            <td colspan="7" class="px-8 py-20">Chưa có hồ sơ thanh toán nào</td>
          </tr>
          <tr v-for="p in filteredPayments" :key="p.id" class="group hover:bg-neutral-50/50 transition-colors">
            <td class="px-8 py-5">
              <div class="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-neutral-500 text-[10px]">
                {{ p.sequence }}
              </div>
            </td>
            <td class="px-8 py-5 font-bold text-neutral-900">{{ getProjectName(p.project_id) }}</td>
            <td class="px-8 py-5 font-black text-neutral-900">{{ formatCurrency(p.completed_value) }}</td>
            <td class="px-8 py-5 text-neutral-400 font-bold">{{ formatCurrency(p.other_payment || 0) }}</td>
            <td class="px-8 py-5">
              <span v-if="p.recovered_amount > 0" class="font-black text-emerald-600">-{{ formatCurrency(p.recovered_amount) }}</span>
              <span v-else class="text-neutral-300 font-bold">-$0</span>
            </td>
            <td class="px-8 py-5 font-black text-neutral-900">{{ formatCurrency(p.paid_amount) }}</td>
            <td class="px-8 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{{ p.payment_date }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Payment Modal -->
    <div v-if="isFormOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="isFormOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      
      <div class="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in duration-300">
        <!-- Left Side: Input -->
        <div class="flex-1 p-10 lg:p-12 space-y-8">
           <div>
             <h2 class="text-3xl font-black text-neutral-900 uppercase leading-none">Cửa sổ tính toán</h2>
             <p class="text-neutral-500 mt-2 font-bold text-sm">NGHIỆM THU & PHÂN BỔ TÀI CHÍNH</p>
           </div>

           <div class="space-y-6">
             <div>
               <div class="flex justify-between mb-2">
                 <label class="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Dự án cần quyết toán</label>
                 <!-- <button class="text-[10px] font-bold text-blue-600 flex items-center gap-1 uppercase tracking-widest">
                   <Calculator :size="12" />
                   Xuất từ dự tính
                 </button> -->
               </div>
               <select v-model="form.project_id" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                 <option value="" disabled>-- Chọn dự án --</option>
                 <option v-for="p in appStore.visibleProjects.filter(p => appStore.canManageProject(p.id))" :key="p.id" :value="p.id">{{ p.name }}</option>
               </select>
             </div>

             <div :class="{ 'opacity-40 pointer-events-none': !form.project_id }">
               <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Giá trị nghiệm thu đợt này (VNĐ)</label>
               <input 
                 v-model.number="form.completed_value"
                 type="number" 
                 class="w-full h-16 px-6 bg-neutral-50 border border-neutral-100 rounded-2xl font-black text-2xl outline-none focus:border-blue-500 transition-all"
               />
             </div>

             <div class="grid grid-cols-1 gap-4" :class="{ 'opacity-40 pointer-events-none': !form.project_id }">
               <div>
                 <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Khoản trích chi khác (VNĐ)</label>
                 <input v-model.number="form.other_payment" type="number" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold" />
               </div>
             </div>

             <div class="grid grid-cols-2 gap-4" :class="{ 'opacity-40 pointer-events-none': !form.project_id }">
               <div>
                 <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày lập hồ sơ</label>
                 <input v-model="form.payment_date" type="date" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold" />
               </div>
               <div>
                 <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Thu hồi tạm ứng thực tế (VNĐ)</label>
                 <input v-model.number="form.recovered_amount" type="number" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-emerald-600" />
               </div>
             </div>
           </div>
        </div>

        <!-- Right Side: Result -->
        <div class="w-full md:w-[380px] bg-neutral-50 p-10 lg:p-12 border-l border-neutral-100 flex flex-col pt-20">
           <button @click="isFormOpen = false" class="absolute top-8 right-8 p-1.5 hover:bg-neutral-200 rounded-full transition-colors">
             <X :size="20" class="text-neutral-400" />
           </button>

           <div v-if="projectStats" class="space-y-8 animate-in slide-in-from-right duration-500">
              <div>
                <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Kết quả tính toán (Lần {{ projectStats.next_sequence }})</p>
                
                <div class="space-y-6">
                  <div>
                    <p class="text-[10px] font-black text-neutral-400 uppercase mb-1">Tạm ứng còn lại (Dư nợ)</p>
                    <p class="text-3xl font-black text-neutral-900 leading-none">
                      {{ formatCurrency(projectStats.total_advance - projectStats.cumulative_recovered) }}
                    </p>
                  </div>

                  <div class="pt-6 border-t border-neutral-200">
                    <div class="flex justify-between items-center mb-1">
                      <p class="text-[10px] font-black text-neutral-400 uppercase">Thu hồi đề xuất</p>
                      <span class="text-[9px] font-bold text-neutral-400 tracking-tighter">Định mức: {{ selectedProject?.advance_rate }}% x Nghiệm thu</span>
                    </div>
                    <p class="text-2xl font-black text-emerald-600 leading-none">-{{ formatCurrency(form.recovered_amount) }}</p>
                  </div>

                  <div class="pt-6 border-t border-neutral-200">
                    <p class="text-[10px] font-black text-neutral-400 uppercase mb-1">Thực thanh đợt này</p>
                    <p class="text-4xl font-black text-blue-600 leading-none tracking-tighter">{{ formatCurrency(paidAmount) }}</p>
                    <p class="text-[10px] font-bold text-neutral-400 mt-2 italic">Giá trị sau khi trừ thu hồi</p>
                  </div>
                </div>
              </div>

              <div class="pt-8 border-t border-neutral-200 space-y-4 flex-1">
                 <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Lũy kế sau thanh toán</p>
                 <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-neutral-500">Quyết toán tập trung</span>
                    <span class="text-sm font-black text-neutral-900">{{ formatCurrency(projectStats.cumulative_completed + form.completed_value) }}</span>
                 </div>
                 <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-neutral-500">Lũy kế thu hồi</span>
                    <span class="text-sm font-black text-emerald-600">{{ formatCurrency(projectStats.cumulative_recovered + form.recovered_amount) }}</span>
                 </div>
              </div>

              <button 
                @click="handleSubmit" 
                :disabled="loading"
                class="w-full h-16 bg-neutral-900 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
              >
                <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                <ArrowUpRight v-else :size="20" />
                <span>{{ loading ? 'ĐANG XỬ LÝ...' : 'LƯU PHIẾU CHI' }}</span>
              </button>
           </div>
           
           <div v-else class="flex-1 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-neutral-200 border border-neutral-100 mb-4">
                <Calculator :size="32" />
              </div>
              <p class="text-sm font-bold text-neutral-400 max-w-[200px]">Vui lòng chọn dự án để bắt đầu tính toán hồ sơ.</p>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>
