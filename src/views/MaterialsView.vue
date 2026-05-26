<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Package, 
  Calendar, 
  Layers, 
  DollarSign, 
  Sparkles,
  Info
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();

// UI States
const isModalOpen = ref(false);
const modalMode = ref<'CREATE' | 'UPDATE'>('CREATE');
const loading = ref(false);

// Filter drafts (bound to UI fields with v-model)
const draftSearchQuery = ref('');
const draftProjectFilter = ref('');
const draftDateFilter = ref('');

// Applied filters (used for actual read/filtering)
const appliedSearchQuery = ref('');
const appliedProjectFilter = ref('');
const appliedDateFilter = ref('');

const currentPage = ref(1);
const itemsPerPage = 5;

// Trigger applied search filtering to avoid reactive database/store read spam
const handleSearch = () => {
  appliedSearchQuery.value = draftSearchQuery.value;
  appliedProjectFilter.value = draftProjectFilter.value;
  appliedDateFilter.value = draftDateFilter.value;
  currentPage.value = 1;
};

// Form state
const initialFormState = {
  id: '',
  project_id: '',
  date: new Date().toISOString().substring(0, 10),
  material_name: '',
  unit: 'kg',
  quantity: 0,
  unit_price: 0,
};

const form = reactive({ ...initialFormState });

// Popular Units suggestions
const popularUnits = ['kg', 'tấn', 'khối (m3)', 'bộ', 'bao', 'viên', 'cái', 'lít', 'm', 'm2'];

// Format Helpers
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN');
};

const getProjectName = (projectId: string) => {
  const p = appStore.projects.find(proj => proj.id === projectId);
  return p ? p.name : 'Dự án không xác định';
};

// Calculations
const formTotalAmount = computed(() => {
  return (form.quantity || 0) * (form.unit_price || 0);
});

// Filtered materials
const filteredMaterials = computed(() => {
  let list = [...appStore.visibleMaterials];
  
  if (appliedProjectFilter.value) {
    list = list.filter(m => m.project_id === appliedProjectFilter.value);
  }
  
  if (appliedDateFilter.value) {
    list = list.filter(m => m.date === appliedDateFilter.value);
  }
  
  if (appliedSearchQuery.value.trim()) {
    const q = appliedSearchQuery.value.toLowerCase();
    list = list.filter(m => 
      (m.material_name || '').toLowerCase().includes(q)
    );
  }
  
  return list;
});

// Pagination computed values
const paginatedMaterials = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredMaterials.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredMaterials.value.length / itemsPerPage));
});

// Reset pagination on applied filter changes
watch([appliedSearchQuery, appliedProjectFilter, appliedDateFilter], () => {
  currentPage.value = 1;
});

// Summary Stats
const totalMaterialValue = computed(() => {
  return filteredMaterials.value.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
});

const totalItemsCount = computed(() => {
  return filteredMaterials.value.length;
});

// Life cycle & initialization
onMounted(async () => {
  if (appStore.isInitialLoad) {
    await appStore.init();
  }
});

// Actions
const openAddModal = () => {
  modalMode.value = 'CREATE';
  Object.assign(form, initialFormState);
  // Default first project if available
  const availableProjects = appStore.visibleProjects;
  if (availableProjects.length > 0) {
    form.project_id = availableProjects[0].id;
  }
  isModalOpen.value = true;
};

const openEditModal = (material: any) => {
  modalMode.value = 'UPDATE';
  Object.assign(form, {
    id: material.id,
    project_id: material.project_id,
    date: material.date || new Date().toISOString().substring(0, 10),
    material_name: material.material_name,
    unit: material.unit,
    quantity: material.quantity,
    unit_price: material.unit_price,
  });
  isModalOpen.value = true;
};

const handleSubmit = async () => {
  if (!form.project_id || !form.material_name || !form.date) return;
  if (form.quantity <= 0 || form.unit_price <= 0) return;
  
  loading.value = true;
  try {
    const payload = {
      project_id: form.project_id,
      date: form.date,
      material_name: form.material_name,
      unit: form.unit,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
    };
    
    if (modalMode.value === 'CREATE') {
      await appStore.saveEntity('materials', 'CREATE', payload);
    } else {
      await appStore.saveEntity('materials', 'UPDATE', {
        ...payload,
        id: form.id
      });
    }
    isModalOpen.value = false;
  } catch (err) {
    console.error('Lỗi khi lưu vật tư:', err);
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (material: any) => {
  if (confirm(`Bạn có chắc chắn muốn xóa vật tư "${material.material_name}" không?`)) {
    try {
      await appStore.saveEntity('materials', 'DELETE', material);
    } catch (err) {
      console.error('Lỗi khi xóa vật tư:', err);
    }
  }
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <!-- Header visual block -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1.5">
          <Sparkles :size="14" />
          <span>Hầm mỏ & Vật liệu xây dựng</span>
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight leading-none uppercase">
          NHẬP VẬT TƯ
        </h1>
        <p class="text-neutral-500 mt-2 font-bold text-sm tracking-wide uppercase">
          Quản lý xuất nhập vật tư và định mức chi phí theo từng dự án
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Add Material button -->
        <button 
          @click="openAddModal"
          class="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus :size="16" />
          <span>NHẬP VẬT TƯ MỚI</span>
        </button>
      </div>
    </div>

    <!-- Filters header -->
    <div class="bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <!-- Left side searches -->
      <div class="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <!-- Dropdown filter project -->
        <div class="relative w-full md:w-64">
          <select 
            v-model="draftProjectFilter"
            class="w-full h-12 pl-4 pr-10 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-xs uppercase outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none text-neutral-700"
          >
            <option value="">TẤT CẢ DỰ ÁN</option>
            <option v-for="p in appStore.visibleProjects" :key="p.id" :value="p.id">
              {{ p.name.toUpperCase() }}
            </option>
          </select>
          <span class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">▼</span>
        </div>

        <!-- Filter date -->
        <div class="relative w-full md:w-56">
          <input 
            v-model="draftDateFilter"
            type="date" 
            class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all text-neutral-800"
          />
          <button 
            v-if="draftDateFilter"
            @click="draftDateFilter = ''"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[10px] font-black hover:text-red-500 text-neutral-400"
            title="Xóa bộ lọc ngày"
          >
            ✕
          </button>
        </div>

        <!-- Search input box -->
        <div class="relative flex-1">
          <input 
            v-model="draftSearchQuery"
            type="text" 
            @keyup.enter="handleSearch"
            placeholder="Tìm theo tên vật tư..."
            class="w-full h-12 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
          />
          <Search :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>

        <!-- Explicit Search Button -->
        <button 
          @click="handleSearch"
          class="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
        >
          <Search :size="14" />
          <span>TÌM KIẾM</span>
        </button>
      </div>
    </div>

    <!-- Main materials list table -->
    <div class="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ngày nhập</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Dự án</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vật tư</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Đơn vị</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Số lượng</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Đơn giá (VNĐ)</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Thành tiền (VNĐ)</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredMaterials.length === 0" class="text-center text-neutral-400 py-24 italic">
              <td colspan="8" class="py-20 text-center">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <div class="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-300">
                    <Package :size="32" />
                  </div>
                  <p class="font-bold text-sm text-neutral-400">Không tìm thấy phiếu nhập vật tư nào phù hợp.</p>
                </div>
              </td>
            </tr>
            <tr v-for="item in paginatedMaterials" :key="item.id" class="group hover:bg-neutral-50/50 transition-colors border-b border-neutral-50 last:border-0">
              <td class="px-8 py-5 font-bold text-xs text-neutral-500 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <Calendar :size="14" class="text-neutral-300" />
                  {{ formatDate(item.date) }}
                </div>
              </td>
              <td class="px-8 py-5">
                <span class="text-xs font-black text-neutral-900 uppercase block max-w-xs truncate">
                  {{ getProjectName(item.project_id) }}
                </span>
              </td>
              <td class="px-8 py-5">
                <span class="text-sm font-extrabold text-neutral-900 block">
                  {{ item.material_name }}
                </span>
              </td>
              <td class="px-8 py-5 font-bold text-xs text-neutral-400 whitespace-nowrap uppercase">
                {{ item.unit }}
              </td>
              <td class="px-8 py-5 text-right font-black text-neutral-900 whitespace-nowrap">
                {{ item.quantity }}
              </td>
              <td class="px-8 py-5 text-right font-bold text-neutral-500 whitespace-nowrap">
                {{ formatCurrency(item.unit_price) }}
              </td>
              <td class="px-8 py-5 text-right font-black text-blue-600 whitespace-nowrap text-sm">
                {{ formatCurrency((item.quantity || 0) * (item.unit_price || 0)) }}
              </td>
              <td class="px-8 py-5 whitespace-nowrap">
                <div class="flex justify-center gap-2">
                  <button 
                    @click="openEditModal(item)"
                    class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Chỉnh sửa"
                  >
                    <Edit2 :size="14" />
                  </button>
                  <button 
                    @click="handleDelete(item)"
                    class="p-2 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                    title="Xóa bỏ"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination controls -->
      <div v-if="filteredMaterials.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-5 bg-neutral-50 border-t border-neutral-100">
        <p class="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">
          Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredMaterials.length) }} / {{ filteredMaterials.length }} bản ghi
        </p>
        <div class="flex items-center gap-2">
          <button 
            type="button"
            @click="currentPage > 1 ? currentPage-- : null" 
            :disabled="currentPage === 1"
            class="px-4 py-2 border border-neutral-200 text-neutral-500 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
          >
            Trước
          </button>
          <div class="flex items-center gap-1 font-bold text-xs text-neutral-400 font-black tracking-widest uppercase text-[10px] select-none mx-2 col-span-3">
            Trang <span class="font-black text-neutral-900 mx-1 text-sm">{{ currentPage }}</span> / <span class="text-neutral-600">{{ totalPages }}</span>
          </div>
          <button 
            type="button"
            @click="currentPage < totalPages ? currentPage++ : null" 
            :disabled="currentPage === totalPages"
            class="px-4 py-2 border border-neutral-200 text-neutral-500 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
          >
            Sau
          </button>
        </div>
      </div>
    </div>

    <!-- Active Modal Dialog -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="isModalOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      
      <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10 lg:p-12 animate-in zoom-in duration-300">
        <button @click="isModalOpen = false" class="absolute top-8 right-8 p-1.5 hover:bg-neutral-200 rounded-full transition-colors z-10">
          <X :size="20" class="text-neutral-400" />
        </button>

        <div class="space-y-8">
          <div>
            <h2 class="text-3xl font-black text-neutral-900 uppercase leading-none">
              {{ modalMode === 'CREATE' ? 'NHẬP VẬT TƯ MỚI' : 'CẬP NHẬT VẬT TƯ' }}
            </h2>
            <p class="text-neutral-500 mt-2 font-bold text-xs uppercase tracking-widest">
              Thông tin chi tiết nhập vật liệu thi công
            </p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Dự án cấp phát -->
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Dự án</label>
              <select 
                v-model="form.project_id" 
                required
                class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Chọn dự án --</option>
                <option v-for="p in appStore.visibleProjects" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>

            <!-- Tên vật tư nhập -->
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên vật tư</label>
              <input 
                v-model="form.material_name"
                required
                type="text" 
                placeholder="Ví dụ: Cát vàng sông Hồng, Xi măng Holcim PC40, Thép Việt Úc..."
                class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-extrabold outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Ngày nhập vật tư -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Ngày nhập vật tư</label>
                <input 
                  v-model="form.date" 
                  required
                  type="date" 
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              <!-- Đơn vị tính -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Đơn vị tính</label>
                <input 
                  v-model="form.unit" 
                  required
                  type="text" 
                  placeholder="Ví dụ: kg, m3, bao..."
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all" 
                />
                
                <!-- Quick unit click suggestions -->
                <div class="mt-2 flex flex-wrap gap-1">
                  <button 
                    v-for="u in popularUnits" 
                    :key="u"
                    type="button"
                    @click="form.unit = u"
                    class="px-2 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/50 rounded-lg text-[10px] text-neutral-500 font-bold transition-all"
                  >
                    {{ u }}
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Số lượng -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Số lượng</label>
                <input 
                  v-model.number="form.quantity" 
                  required
                  min="0.01"
                  step="any"
                  type="number" 
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-black outline-none focus:border-blue-500 transition-all text-neutral-900" 
                />
              </div>

              <!-- Đơn giá -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Đơn giá (VNĐ)</label>
                <input 
                  v-model.number="form.unit_price" 
                  required
                  min="0"
                  type="number" 
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-black outline-none focus:border-blue-500 transition-all text-neutral-900" 
                />
              </div>
            </div>

            <!-- live calculation confirmation -->
            <div class="p-5 bg-neutral-50 rounded-[2rem] border border-neutral-100 flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-500 flex items-center gap-1.5 gap-1 select-none">
                <Info :size="14" class="text-neutral-400" />
                Tổng cộng số chi dự tính đợt này
              </span>
              <span class="text-lg font-black text-blue-600">
                {{ formatCurrency(formTotalAmount) }}
              </span>
            </div>

            <div class="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                @click="isModalOpen = false"
                class="px-5 py-3 border border-neutral-200 text-neutral-500 rounded-2xl font-bold text-xs uppercase hover:bg-neutral-50 transition-all"
              >
                HỦY BỎ
              </button>
              <button 
                type="submit"
                :disabled="loading || !form.project_id || !form.material_name || form.quantity <= 0 || form.unit_price <= 0"
                class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg disabled:opacity-50"
              >
                <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                <span>{{ loading ? 'ĐANG LƯU...' : 'LƯU PHIẾU' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
