<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { X, Plus, Calendar, MinusCircle, Check, Link, FileText } from 'lucide-vue-next';

const props = defineProps({
  project: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);
const appStore = useAppStore();

const loading = ref(false);
const form = reactive({
  name: '',
  contract_number: '',
  contract_value: 0,
  advance_rate: 30, // Default 30%
  advance_amount: 0,
  expected_end_date: '',
  delivery_date: '',
  contract_file_url: '',
  start_date: new Date().toISOString().split('T')[0],
  recovery_deadline_ratio: 80, // Default 80%
  payment_plan: [] as any[]
});

onMounted(() => {
  if (props.project) {
    Object.assign(form, props.project);
  }
});

const isManualAdvance = ref(false);

const calculatedAdvance = computed(() => {
  if (isManualAdvance.value) return form.advance_amount;
  return (form.contract_value * form.advance_rate) / 100;
});

// Update advance amount when contract value or rate changes, unless manual
watch(() => [form.contract_value, form.advance_rate], () => {
  if (!isManualAdvance.value && !props.project) {
    form.advance_amount = (form.contract_value * form.advance_rate) / 100;
  }
});

const addPaymentMilestone = () => {
  form.payment_plan.push({
    date: '',
    amount: 0,
    recovery: 0
  });
};

const removePaymentMilestone = (index: number) => {
  form.payment_plan.splice(index, 1);
};

const handleSubmit = async () => {
  if (!form.name || form.contract_value <= 0 || loading.value) return;
  
  loading.value = true;
  try {
    const action = props.project ? 'UPDATE' : 'CREATE';
    await appStore.saveEntity('projects', action, {
      ...form,
      advance_amount: form.advance_amount || calculatedAdvance.value,
      status: props.project?.status || 'ACTIVE',
      status_evaluation: props.project?.status_evaluation || props.project?.risk_status || 'SAFE',
      is_deleted: 0,
      id: props.project?.id
    });
    emit('saved');
    emit('close');
  } catch (err) {
    console.error('Error saving project:', err);
  } finally {
    loading.value = false;
  }
};

</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div @click="$emit('close')" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
    
    <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-black text-neutral-900 uppercase">{{ project ? 'Cập nhật dự án' : 'Khởi tạo dự án' }}</h2>
          <p class="text-sm text-neutral-500">{{ project ? 'Chỉnh sửa thông tin hợp đồng' : 'Thiết lập thông tin hợp đồng cơ sở' }}</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-900">
          <X :size="24" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-8 max-h-[70vh] overflow-y-auto space-y-6">
        <div>
          <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên dự án / Công trình</label>
          <input 
            v-model="form.name"
            type="text" 
            placeholder="VD: Cầu Mỹ Thuận 2 - Gói thầu XL01" 
            class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">$ Giá trị hợp đồng (VNĐ)</label>
            <input 
              v-model.number="form.contract_value"
              type="number" 
              class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tỉ lệ ứng (%)</label>
              <input 
                v-model.number="form.advance_rate"
                type="number" 
                class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Số tiền ứng</label>
              <input 
                v-model.number="form.advance_amount"
                @input="isManualAdvance = true"
                type="number" 
                class="w-full h-14 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày bắt đầu</label>
            <div class="relative">
              <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" :size="18" />
              <input 
                v-model="form.start_date"
                type="date" 
                class="w-full h-14 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Bàn giao dự kiến</label>
            <div class="relative">
              <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" :size="18" />
              <input 
                v-model="form.expected_end_date"
                type="date" 
                class="w-full h-14 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày bàn giao</label>
            <div class="relative">
              <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" :size="18" />
              <input 
                v-model="form.delivery_date"
                type="date" 
                class="w-full h-14 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Số hợp đồng</label>
            <div class="relative">
              <FileText class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" :size="18" />
              <input 
                v-model="form.contract_number"
                type="text" 
                placeholder="VD: 123/2024/HĐ-MT2" 
                class="w-full h-14 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Link Hợp đồng gốc</label>
            <div class="relative">
              <Link class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" :size="18" />
              <input 
                v-model="form.contract_file_url"
                type="text" 
                placeholder="Nhập link tài liệu hợp đồng..." 
                class="w-full h-14 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Slider for recovery ratio -->
        <div>
           <div class="flex justify-between items-center mb-2">
             <label class="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Thời hạn thu hồi (Mặc định 80%)</label>
             <span class="text-sm font-black text-neutral-900">{{ form.recovery_deadline_ratio }}%</span>
           </div>
           <input 
             v-model.number="form.recovery_deadline_ratio"
             type="range" 
             min="0" max="100" 
             class="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
           />
        </div>

        <!-- Payment Plan -->
        <div class="space-y-4 pt-6 border-t border-neutral-100">
           <div class="flex items-center justify-between">
             <h3 class="text-xs font-black text-neutral-900 uppercase tracking-widest">Dự tính các lần thanh toán</h3>
             <button @click="addPaymentMilestone" class="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1">
               <Plus :size="12" />
               <span>Thêm lần thanh toán</span>
             </button>
           </div>
           
           <div v-if="form.payment_plan.length === 0" class="p-6 border-2 border-dashed border-neutral-100 rounded-xl text-center">
              <p class="text-xs text-neutral-400 italic">Chưa có dự tính thanh toán nào</p>
           </div>

           <div v-for="(plan, index) in form.payment_plan" :key="index" class="bg-neutral-50 p-4 rounded-xl border border-neutral-100 relative group">
              <button @click="removePaymentMilestone(index)" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <MinusCircle :size="14" />
              </button>
              <div class="flex items-center gap-3 mb-3">
                <div class="w-6 h-6 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {{ index + 1 }}
                </div>
                <span class="text-[10px] font-black text-neutral-900 tracking-wider">Thanh toán lần {{ index + 1 }}</span>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <p class="text-[9px] font-bold text-neutral-400 uppercase mb-1">Ngày dự kiến</p>
                  <input v-model="plan.date" type="date" class="w-full h-10 px-3 bg-white border border-neutral-100 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <p class="text-[9px] font-bold text-neutral-400 uppercase mb-1">Số tiền (VNĐ)</p>
                  <input v-model.number="plan.amount" type="number" class="w-full h-10 px-3 bg-white border border-neutral-100 rounded-lg text-xs font-bold" />
                </div>
                <div>
                  <p class="text-[9px] font-bold text-neutral-400 uppercase mb-1">Thu ứng (VNĐ)</p>
                  <input v-model.number="plan.recovery" type="number" class="w-full h-10 px-3 bg-white border border-neutral-100 rounded-lg text-xs font-bold text-emerald-600" />
                </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-8 bg-neutral-50 border-t border-neutral-100">
        <button 
          @click="handleSubmit"
          :disabled="loading"
          class="w-full h-14 bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Check v-if="!loading" :size="20" />
          <span>{{ loading ? (project ? 'Đang cập nhật...' : 'Đang khởi tạo...') : (project ? 'Lưu thay đổi' : 'Xác nhận tạo dự án') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
