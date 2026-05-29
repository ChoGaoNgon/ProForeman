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

    form.recovered_amount = 0; // Reset recovered amount for manual typing
  } else {
    projectStats.value = null;
  }
});

const paidAmount = computed(() => {
  return (form.completed_value || 0) - (form.recovered_amount || 0);
});

const handleSubmit = async () => {
  if (!form.project_id || (form.completed_value <= 0 && form.other_payment <= 0) || loading.value) return;
  loading.value = true;
  try {
    const stats = projectStats.value || { cumulative_recovered: 0, cumulative_completed: 0, total_advance: 0, next_sequence: 1 };
    const newCumulativeRecovered = (stats.cumulative_recovered || 0) + form.recovered_amount;
    const newCumulativeCompleted = (stats.cumulative_completed || 0) + form.completed_value;

    await appStore.saveEntity('payments', 'CREATE', {
      ...form,
      sequence: stats.next_sequence || 1,
      paid_amount: paidAmount.value,
      cumulative_completed: newCumulativeCompleted,
      cumulative_recovered: newCumulativeRecovered,
      remaining_advance: (stats.total_advance || 0) - newCumulativeRecovered
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
      
      <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto p-10 lg:p-12 animate-in zoom-in duration-300">
        <button @click="isFormOpen = false" class="absolute top-8 right-8 p-1.5 hover:bg-neutral-200 rounded-full transition-colors z-10">
          <X :size="20" class="text-neutral-400" />
        </button>

        <div class="space-y-8">
          <div>
            <h2 class="text-3xl font-black text-neutral-900 uppercase leading-none">LẬP THANH TOÁN MỚI</h2>
            <p class="text-neutral-500 mt-2 font-bold text-sm text-neutral-400 uppercase tracking-widest">NGHIỆM THU & PHÂN BỔ TÀI CHÍNH THỦ CÔNG</p>
          </div>

          <div class="space-y-6">
            <!-- Dự án cần quyết toán -->
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Dự án cần quyết toán</label>
              <select v-model="form.project_id" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                <option value="" disabled>-- Chọn dự án --</option>
                <option v-for="p in appStore.visibleProjects.filter(p => appStore.canManageProject(p.id))" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div :class="{ 'opacity-40 pointer-events-none': !form.project_id }" class="space-y-6">
              <!-- Giá trị nghiệm thu đợt này (VNĐ) -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Giá trị nghiệm thu đợt này (VNĐ)</label>
                <input 
                  v-model.number="form.completed_value"
                  type="number" 
                  class="w-full h-16 px-6 bg-neutral-50 border border-neutral-100 rounded-2xl font-black text-2xl outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <!-- Khoản trích chi khác (VNĐ) -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Khoản trích chi khác (VNĐ)</label>
                <input 
                  v-model.number="form.other_payment" 
                  type="number" 
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              <!-- Ngày lập hồ sơ & Thu hồi tạm ứng thực tế (VNĐ) -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày lập hồ sơ</label>
                  <input v-model="form.payment_date" type="date" class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Thu hồi tạm ứng thực tế (VNĐ)</label>
                  <input 
                    v-model.number="form.recovered_amount" 
                    type="number" 
                    class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold text-emerald-600 outline-none focus:border-emerald-500 transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Actions & Calculations Summary inside main modal -->
          <div class="pt-6 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div v-if="form.project_id && (form.completed_value > 0 || form.recovered_amount > 0)" class="text-left">
              <span class="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Thực thanh đợt này tự tính</span>
              <span class="text-xl font-black text-blue-600 leading-none">{{ formatCurrency(paidAmount) }}</span>
            </div>
            <div v-else></div>

            <div class="flex items-center gap-3">
              <button 
                @click="isFormOpen = false"
                class="px-5 py-3 border border-neutral-200 text-neutral-500 rounded-xl font-bold text-xs uppercase hover:bg-neutral-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                @click="handleSubmit" 
                :disabled="loading || !form.project_id"
                class="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
              >
                <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                <ArrowUpRight v-else :size="14" />
                <span>{{ loading ? 'ĐANG XỬ LÝ...' : 'LƯU PHIẾU CHI' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
