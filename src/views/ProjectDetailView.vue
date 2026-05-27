<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  DollarSign, 
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  ChevronDown,
  Edit2,
  AlertTriangle,
  ScrollText,
  AlertCircle
} from 'lucide-vue-next';
import ProjectForm from '@/components/ProjectForm.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const project = ref<any>(null);
const reports = ref<any[]>([]);
const assignments = ref<any[]>([]);
const payments = ref<any[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const showEditModal = ref(false);
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

const currentReportTab = ref('DAILY');
const reportPageSize = ref(3);

const fetchProjectData = async () => {
  loading.value = true;
  const id = route.params.id as string;
  try {
    project.value = appStore.visibleProjects.find(p => p.id === id);
    if (!project.value) {
      router.push({ name: 'projects' });
      return;
    }
    
    // Fetch related data
    assignments.value = appStore.project_assignments.filter(a => a.project_id === id);
    payments.value = appStore.payments.filter(p => p.project_id === id);
    
    // Fetch reports for this project specifically
    const result = await appStore.fetchReportsPaginated(10, id);
    reports.value = result.reports;
  } catch (err) {
    console.error('Error fetching project detail:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await appStore.refreshAll();
  await fetchProjectData();
});

const isManagement = computed(() => {
  if (!project.value) return false;
  return appStore.canManageProject(project.value.id);
});

const financialMetrics = computed(() => {
  if (!payments.value.length) return {
    totalCompleted: 0,
    totalRecovered: 0,
    totalPaid: 0,
    acceptanceProgress: 0,
    recoveryRate: 0,
    remainingAdvance: project.value?.advance_amount || 0
  };

  const totalCompleted = payments.value.reduce((sum, p) => sum + (+p.completed_value || 0), 0);
  const totalRecovered = payments.value.reduce((sum, p) => sum + (+p.recovered_amount || 0), 0);
  const totalPaid = payments.value.reduce((sum, p) => sum + (+p.paid_amount || 0), 0);
  const contractValue = +project.value?.contract_value || 1;
  const totalAdvance = +project.value?.advance_amount || 0;

  return {
    totalCompleted,
    totalRecovered,
    totalPaid,
    acceptanceProgress: (totalCompleted / contractValue) * 100,
    recoveryRate: totalAdvance > 0 ? (totalRecovered / totalAdvance) * 100 : 0,
    remainingAdvance: totalAdvance - totalRecovered
  };
});

const displayedReports = computed(() => {
  return reports.value
    .filter(r => r.type === currentReportTab.value)
    .slice(0, reportPageSize.value);
});

const hasMoreReports = computed(() => {
  const filteredCount = reports.value.filter(r => r.type === currentReportTab.value).length;
  return filteredCount > reportPageSize.value;
});

const showMoreReports = () => {
  reportPageSize.value += 3;
};

watch(currentReportTab, () => {
  reportPageSize.value = 3;
});

const getEmployeeName = (id: string) => {
  return appStore.employees.find(e => e.id === id)?.name || 'Anonym';
};

const getRoleName = (id: string) => {
  return appStore.project_roles.find(r => r.id === id)?.name || 'Member';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const updateStatus = async (newStatus: string) => {
  if (!project.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await appStore.saveEntity('projects', 'UPDATE', {
      ...project.value,
      status: newStatus
    });
    project.value.status = newStatus;
  } catch (err) {
    console.error('Error updating project status:', err);
  } finally {
    actionLoading.value = false;
  }
};

const updateRiskStatus = async (newRisk: string) => {
  if (!project.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await appStore.saveEntity('projects', 'UPDATE', {
      ...project.value,
      status_evaluation: newRisk
    });
    project.value.status_evaluation = newRisk;
    project.value.risk_status = newRisk; // Keep for compatibility if needed
  } catch (err) {
    console.error('Error updating risk status:', err);
  } finally {
    actionLoading.value = false;
  }
};



// Project Notes Logic
const isEditingNotes = ref(false);
const notesDraft = ref('');

const startEditNotes = () => {
  notesDraft.value = project.value.notes || '';
  isEditingNotes.value = true;
};

const cancelEditNotes = () => {
  isEditingNotes.value = false;
};

const saveNotes = async () => {
  if (!project.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await appStore.saveEntity('projects', 'UPDATE', {
      ...project.value,
      notes: notesDraft.value
    });
    project.value.notes = notesDraft.value;
    isEditingNotes.value = false;
  } catch (err) {
    console.error('Error saving project notes:', err);
  } finally {
    actionLoading.value = false;
  }
};

// Assign Modal Logic
const showAssignModal = ref(false);
const assignForm = reactive({
  employee_id: '',
  project_role_id: ''
});

const isAssigning = ref(false);
const handleAssign = async () => {
  if (!assignForm.employee_id || !assignForm.project_role_id || isAssigning.value) return;
  
  // Check if this assignment already exists (same employee and same role)
  const isDuplicate = assignments.value.some(a => 
    a.employee_id === assignForm.employee_id && 
    a.project_role_id === assignForm.project_role_id
  );

  if (isDuplicate) {
    alert('Nhân sự này đã được gán vai trò này trong dự án.');
    return;
  }

  isAssigning.value = true;
  try {
    const assignmentId = `${assignForm.employee_id}_${project.value.id}`;
    await appStore.saveEntity('project_assignments', 'CREATE', {
      id: assignmentId,
      project_id: project.value.id,
      ...assignForm
    });
    showAssignModal.value = false;
    // Reset form
    assignForm.employee_id = '';
    assignForm.project_role_id = '';
    await fetchProjectData();
  } catch (err) {
    console.error('Error assigning member:', err);
  } finally {
    isAssigning.value = false;
  }
};

const removeAssignment = async (id: string) => {
  if (!confirm('Xóa nhân sự này khỏi dự án?')) return;
  try {
    await appStore.saveEntity('project_assignments', 'DELETE', { id });
    await fetchProjectData();
  } catch (err) {
    console.error('Error removing assignment:', err);
  }
};

const handleDeleteProject = async () => {
  if (!project.value) return;
  isDeleting.value = true;
  try {
    await appStore.saveEntity('projects', 'DELETE', { id: project.value.id });
    router.push({ name: 'projects' });
  } catch (err) {
    console.error('Error deleting project:', err);
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
};
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
  </div>

  <div v-else-if="project" class="space-y-8">
    <!-- Hero Section -->
    <div class="bg-neutral-900 text-white rounded-[2.5rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div class="relative z-10">
        <h1 class="text-3xl lg:text-5xl font-black mb-6 leading-[1.1] tracking-tighter max-w-4xl uppercase">{{ project.name }}</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <Calendar :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Ngày bắt đầu</p>
              <p class="font-bold text-[11px]">{{ project.start_date || 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <Calendar :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Dự kiến kết thúc</p>
              <p class="font-bold text-[11px]">{{ project.expected_end_date || project.end_date || 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <Clock :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Ngày bàn giao</p>
              <p class="font-bold text-[11px] text-amber-400">{{ project.delivery_date || 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <DollarSign :size="16" />
            </div>
            <div>
               <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Giá trị HĐ</p>
               <p class="font-bold text-[11px] text-blue-400">{{ formatCurrency(project.contract_value || 0) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <DollarSign :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Số tiền ứng</p>
              <p class="font-bold text-[11px] text-emerald-400">{{ formatCurrency(project.advance_amount || 0) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <TrendingUp :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Tỉ lệ thu ứng</p>
              <p class="font-bold text-[11px] text-emerald-400">{{ project.advance_rate ? project.advance_rate + '%' : 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <TrendingUp :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Tỉ lệ thu hồi</p>
              <p class="font-bold text-[11px] text-blue-400">{{ project.recovery_deadline_ratio ? project.recovery_deadline_ratio + '%' : 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <FileText :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Số hợp đồng</p>
              <p class="font-bold text-[11px]">{{ project.contract_number || 'N/A' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-white/20">
              <FileText :size="16" />
            </div>
            <div>
              <p class="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">HĐ gốc</p>
              <a v-if="project.contract_file_url" :href="project.contract_file_url" target="_blank" class="font-bold text-[11px] flex items-center gap-1 hover:text-blue-400">
                Tệp <ExternalLink :size="10" />
              </a>
              <p v-else class="font-bold text-[11px] text-white/30">Chưa có</p>
            </div>
          </div>
        </div>



        <div class="flex items-center gap-3 mt-6 flex-wrap">
          <div v-if="project.location" class="flex items-center px-4 py-2 bg-white/5 rounded-xl border border-white/10">
             <MapPin :size="14" class="mr-2 text-neutral-400" />
             <span class="text-[11px] font-bold">{{ project.location }}</span>
          </div>
          
          <div v-if="isManagement" class="flex flex-wrap items-center gap-3">
             <!-- Status Toggle -->
             <div class="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
                <button 
                  @click="updateStatus('ACTIVE')"
                  :disabled="actionLoading"
                  :class="['px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all', project.status === 'ACTIVE' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white']"
                >Đang chạy</button>
                <button 
                  @click="updateStatus('COMPLETED')"
                  :disabled="actionLoading"
                  :class="['px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all', project.status === 'COMPLETED' ? 'bg-neutral-600 text-white' : 'text-white/40 hover:text-white']"
                >Kết thúc</button>
             </div>

             <!-- Risk Evaluation (Combobox) -->
             <div class="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-white/30 transition-all">
                <select 
                  :value="project.status_evaluation || project.risk_status || 'SAFE'"
                  @change="updateRiskStatus(($event.target as HTMLSelectElement).value)"
                  :disabled="actionLoading"
                  :class="[
                    'appearance-none pl-4 pr-10 py-1.5 bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer transition-all duration-200 select-none border-none min-w-[120px]',
                    (project.status_evaluation === 'SAFE' || project.risk_status === 'SAFE') ? 'text-emerald-400' : '',
                    (project.status_evaluation === 'WARNING' || project.risk_status === 'WARNING') ? 'text-amber-400' : '',
                    (project.status_evaluation === 'RISK' || project.risk_status === 'RISK') ? 'text-red-400' : ''
                  ]"
                >
                  <option value="SAFE" class="bg-neutral-900 text-emerald-400 font-bold uppercase text-[10px]">An toàn</option>
                  <option value="WARNING" class="bg-neutral-900 text-amber-400 font-bold uppercase text-[10px]">Cảnh báo</option>
                  <option value="RISK" class="bg-neutral-900 text-red-400 font-bold uppercase text-[10px]">Nguy cơ</option>
                </select>
                <!-- Chevron Down icon overlay -->
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3/5 text-neutral-400 pr-3">
                  <ChevronDown :size="12" />
                </div>
             </div>

             <!-- Project Actions -->
             <div class="flex items-center gap-2">
                <button 
                  @click="showEditModal = true"
                  class="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                  title="Sửa dự án"
                >
                  <Edit2 :size="16" />
                </button>
                <button 
                  @click="showDeleteConfirm = true"
                  class="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl transition-all"
                  title="Xóa dự án"
                >
                  <Trash2 :size="16" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Details & Assignments -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Personnel Allocation -->
        <div class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 class="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Nhân sự tham gia dự án</h2>
            <button 
              v-if="isManagement"
              @click="showAssignModal = true"
              class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all group/btn"
            >
              <Plus :size="12" class="group-hover/btn:rotate-90 transition-transform" />
              <span>Phân bổ nhân sự</span>
            </button>
          </div>
          <div class="divide-y divide-neutral-50 px-2 pb-2">
            <div v-if="assignments.length === 0" class="p-8 text-center text-neutral-400">
               <Users :size="32" class="mx-auto mb-3 opacity-20" />
               <p class="italic text-[11px] font-bold">Chưa có nhân sự được gán</p>
            </div>
            <div v-for="assign in assignments" :key="assign.id" class="px-4 py-2 flex items-center justify-between group hover:bg-neutral-50 rounded-xl transition-all">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center font-bold text-neutral-500 text-xs text-center leading-none">
                  {{ getEmployeeName(assign.employee_id).charAt(0) }}
                </div>
                <div>
                  <p class="text-[13px] font-bold text-neutral-900">{{ getEmployeeName(assign.employee_id) }}</p>
                  <p class="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{{ getRoleName(assign.project_role_id) }}</p>
                </div>
              </div>
              <button 
                v-if="isManagement"
                @click="removeAssignment(assign.id)"
                class="p-2 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- Progress Indicators -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div class="bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm">
             <h3 class="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-3">TIẾN ĐỘ NGHIỆM THU</h3>
             <div class="text-2xl font-black text-blue-600 mb-1">{{ financialMetrics.acceptanceProgress.toFixed(1) }}%</div>
             <p class="text-[11px] text-neutral-500 font-bold">Đã nghiệm thu: {{ formatCurrency(financialMetrics.totalCompleted) }}</p>
           </div>
           <div class="bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm">
             <h3 class="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-3">THU HỒI TẠM ỨNG</h3>
             <div class="text-2xl font-black text-emerald-600 mb-1">{{ financialMetrics.recoveryRate.toFixed(1) }}%</div>
             <p class="text-[11px] text-neutral-500 font-bold">Đã thu hồi: {{ formatCurrency(financialMetrics.totalRecovered) }}</p>
           </div>
        </div>

        <!-- Actual Payment Records -->
        <div v-if="payments.length" class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 class="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Hồ sơ thanh toán thực tế</h2>
            <div class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">
              Tổng: {{ formatCurrency(financialMetrics.totalPaid) }}
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left font-bold text-[11px]">
              <thead>
                <tr class="bg-neutral-50 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                  <th class="px-6 py-3">Lần</th>
                  <th class="px-6 py-3">Ngày thanh toán</th>
                  <th class="px-6 py-3 text-right">Nghiệm thu</th>
                  <th class="px-6 py-3 text-right">Trích chi khác</th>
                  <th class="px-6 py-3 text-right">Thu hồi ứng</th>
                  <th class="px-6 py-3 text-right text-blue-600">Thực thanh</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-50">
                <tr v-for="p in payments" :key="p.id" class="hover:bg-neutral-50/50 transition-colors">
                  <td class="px-6 py-3">
                    <span class="w-5 h-5 bg-neutral-100 rounded-full inline-flex items-center justify-center text-[9px]">
                      {{ p.sequence }}
                    </span>
                  </td>
                  <td class="px-6 py-3">{{ p.payment_date }}</td>
                  <td class="px-6 py-3 text-right">{{ formatCurrency(p.completed_value) }}</td>
                  <td class="px-6 py-3 text-right text-neutral-400">{{ formatCurrency(p.other_payment || 0) }}</td>
                  <td class="px-6 py-3 text-right font-medium text-emerald-600">-{{ formatCurrency(p.recovered_amount) }}</td>
                  <td class="px-6 py-3 text-right font-black text-blue-600">{{ formatCurrency(p.paid_amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Payment Plan -->
        <div v-if="project.payment_plan?.length" class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-neutral-100">
            <h2 class="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Dự tính thanh toán</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left font-bold text-[11px]">
              <thead>
                <tr class="bg-neutral-50 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                  <th class="px-6 py-3">Lần</th>
                  <th class="px-6 py-3">Ngày dự kiến</th>
                  <th class="px-6 py-3 text-right">Số tiền</th>
                  <th class="px-6 py-3 text-right text-emerald-600">Thu hồi ứng</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-50">
                <tr v-for="(plan, idx) in project.payment_plan" :key="idx" class="hover:bg-neutral-50/50 transition-colors">
                  <td class="px-6 py-3">{{ idx + 1 }}</td>
                  <td class="px-6 py-3">{{ plan.date || '---' }}</td>
                  <td class="px-6 py-3 text-right">{{ formatCurrency(plan.amount) }}</td>
                  <td class="px-6 py-3 text-right text-emerald-600">{{ formatCurrency(plan.recovery) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm">
           <h2 class="text-[10px] font-black text-neutral-900 uppercase tracking-widest mb-4">Trạng thái tài chính</h2>
           <div class="space-y-4">
              <div>
                <p class="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Nợ tạm ứng còn lại</p>
                <p class="text-lg font-black text-amber-600">{{ formatCurrency(financialMetrics.remainingAdvance) }}</p>
              </div>
              <div>
                <p class="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Thực thanh toán lũy kế</p>
                <p class="text-lg font-black text-neutral-900">{{ formatCurrency(financialMetrics.totalPaid) }}</p>
              </div>
           </div>
        </div>

        <!-- Project Notes Panel -->
        <div class="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm space-y-4">
           <div class="flex items-center justify-between">
              <h2 class="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <ScrollText :size="14" class="text-neutral-500" />
                Ghi chú dự án
              </h2>
              <button 
                v-if="!isEditingNotes" 
                @click="startEditNotes"
                class="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 uppercase text-[9px] tracking-widest font-black"
              >
                <Edit2 :size="10" />
                Cập nhật
              </button>
           </div>
           
           <div v-if="isEditingNotes" class="space-y-3">
              <textarea 
                v-model="notesDraft" 
                rows="5" 
                class="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-[12px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all leading-relaxed text-neutral-800" 
                placeholder="Nhập ghi chú quan trọng về tiến độ, lưu ý công trình, hoặc thông tin liên hệ..."
              ></textarea>
              <div class="flex gap-2 justify-end">
                <button 
                  @click="cancelEditNotes" 
                  class="px-4 py-2 border border-neutral-200 text-neutral-500 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  @click="saveNotes" 
                  :disabled="actionLoading"
                  class="px-4 py-2 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
           </div>
           <div v-else>
              <div v-if="project.notes" class="text-neutral-600 text-[12px] leading-relaxed whitespace-pre-wrap p-4 bg-neutral-50 rounded-2xl border border-neutral-50">
                 {{ project.notes }}
              </div>
              <div v-else class="text-center py-6 px-4 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                 <p class="text-[11px] font-medium text-neutral-400">Chưa có ghi chú nào cho dự án này.</p>
                 <button 
                   @click="startEditNotes" 
                   class="mt-3 px-4 py-1.5 bg-neutral-900 text-white text-[9px] font-black uppercase rounded-lg tracking-wider hover:bg-neutral-800 transition-all inline-flex items-center gap-1"
                 >
                   <Plus :size="10" />
                   Thêm ghi chú
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Reports Section (Bottom) -->
    <div class="space-y-4">
       <div class="flex items-center justify-between">
          <h2 class="text-lg font-black text-neutral-900 uppercase tracking-tight">NHẬT KÝ VÀ BÁO CÁO</h2>
          <router-link :to="{ name: 'reports', query: { projectId: project.id } }" class="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1">
             Lập báo cáo mới
             <Plus :size="12" />
          </router-link>
       </div>

       <div class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div class="flex border-b border-neutral-100 bg-neutral-50/30">
             <button 
               v-for="t in ['DAILY', 'WEEKLY', 'MONTHLY']" 
               :key="t"
               @click="currentReportTab = t"
               :class="['px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all', currentReportTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-neutral-400 hover:text-neutral-600']"
             >
                {{ t === 'DAILY' ? 'Ngày' : t === 'WEEKLY' ? 'Tuần' : 'Tháng' }}
             </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
             <div v-if="displayedReports.length === 0" class="col-span-3 p-8 text-center text-neutral-400 italic text-xs">
                Chưa có báo cáo nào cho mục này
             </div>
             <div v-for="report in displayedReports" :key="report.id" class="p-5 hover:bg-neutral-50/50 transition-colors">
                <div class="flex justify-between items-start mb-3">
                   <div class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <FileText :size="14" />
                   </div>
                   <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">{{ report.report_date }}</span>
                </div>
                <h4 class="font-bold text-neutral-900 mb-2 leading-tight text-sm uppercase">{{ getEmployeeName(report.employee_id) }}</h4>
                
                <!-- Display tasks_summary -->
                <div class="mb-3">
                  <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ScrollText :size="10" />
                    Nội dung
                  </p>
                  <p class="text-[12px] text-neutral-600 line-clamp-2 leading-relaxed">{{ report.tasks_summary || 'Không có mô tả' }}</p>
                </div>

                <div class="mb-4">
                   <p class="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle :size="10" />
                    Vấn đề
                  </p>
                   <p class="text-[12px] text-neutral-400 line-clamp-1 italic leading-relaxed">"{{ report.issues || 'Ổn định' }}"</p>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-neutral-50">
                   <div class="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                      <TrendingUp :size="10" />
                      <span>{{ report.progress_percent }}%</span>
                   </div>
                   <router-link :to="{ name: 'reports' }" class="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Xem tiếp</router-link>
                </div>
             </div>
          </div>

          <div v-if="hasMoreReports" class="p-4 border-t border-neutral-100 text-center">
             <button @click="showMoreReports" class="text-[10px] font-black text-neutral-400 hover:text-neutral-900 uppercase tracking-widest transition-colors">Hiển thị thêm</button>
          </div>
       </div>
    </div>

    <!-- Assign Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="showAssignModal = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-2 text-center tracking-tighter">Phân bổ nhân sự</h2>
        <p class="text-xs font-bold text-neutral-400 text-center mb-8 uppercase tracking-widest">Gán thành viên vào đội ngũ dự án</p>
        
        <div class="space-y-6">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Chọn nhân viên</label>
            <div class="relative group">
              <select v-model="assignForm.employee_id" class="w-full h-14 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                 <option value="" disabled>--- Vui lòng chọn ---</option>
                 <option v-for="emp in appStore.employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
              </select>
              <ChevronDown :size="16" class="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none group-hover:text-neutral-900 transition-colors" />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">Chọn chức danh</label>
            <div class="relative group">
              <select v-model="assignForm.project_role_id" class="w-full h-14 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                 <option value="" disabled>--- Vui lòng chọn ---</option>
                 <option v-for="role in appStore.projectRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
              <ChevronDown :size="16" class="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none group-hover:text-neutral-900 transition-colors" />
            </div>
          </div>
          <div class="pt-4 flex gap-3">
            <button @click="showAssignModal = false" class="flex-1 h-14 bg-neutral-100 text-neutral-900 font-black rounded-2xl uppercase tracking-widest hover:bg-neutral-200 transition-all">Hủy</button>
            <button @click="handleAssign" :disabled="isAssigning" class="flex-[2] h-14 bg-blue-600 disabled:opacity-50 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all">
              {{ isAssigning ? 'Đang thực hiện...' : 'Phân bổ ngay' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Project Modal -->
    <ProjectForm 
      v-if="showEditModal" 
      :project="project" 
      @close="showEditModal = false" 
      @saved="fetchProjectData" 
    />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div @click="showDeleteConfirm = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in duration-300">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle :size="32" />
        </div>
        <h3 class="text-xl font-black text-neutral-900 uppercase text-center mb-2">Xác nhận xóa dự án</h3>
        <p class="text-sm font-bold text-neutral-500 text-center mb-8">
          Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa dự án <span class="text-red-500">"{{ project.name }}"</span>?
        </p>
        <div class="flex gap-3">
          <button 
            @click="showDeleteConfirm = false" 
            class="flex-1 h-12 bg-neutral-100 text-neutral-900 font-black rounded-xl uppercase tracking-widest hover:bg-neutral-200 transition-all"
          >Hủy</button>
          <button 
            @click="handleDeleteProject" 
            :disabled="isDeleting"
            class="flex-1 h-12 bg-red-500 text-white font-black rounded-xl uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
          >
            {{ isDeleting ? 'Đang xóa...' : 'Xác nhận xóa' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
