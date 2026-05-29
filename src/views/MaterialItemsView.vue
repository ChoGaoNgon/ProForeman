<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Layers, 
  Sparkles,
  Info,
  Check,
  RotateCcw
} from 'lucide-vue-next';

const appStore = useAppStore();

// UI States
const isModalOpen = ref(false);
const modalMode = ref<'CREATE' | 'UPDATE'>('CREATE');
const loading = ref(false);
const seedLoading = ref(false);

// Search & Filtering
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 8;

// Form state
const initialFormState = {
  id: '',
  name: '',
  code: '',
  default_unit: 'kg',
  default_unit_price: 0
};

const form = reactive({ ...initialFormState });

// Popular Units suggestions
const popularUnits = ['kg', 'tấn', 'khối (m3)', 'bộ', 'bao', 'viên', 'cái', 'lít', 'm', 'cây'];

// Format Helpers
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

// Filtered / Searched material items list
const filteredItems = computed(() => {
  let list = [...(appStore.material_items || [])];
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(item => 
      (item.name || '').toLowerCase().includes(q) ||
      (item.code || '').toLowerCase().includes(q) ||
      (item.default_unit || '').toLowerCase().includes(q)
    );
  }
  
  return list;
});

// Pagination
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredItems.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredItems.value.length / itemsPerPage));
});

onMounted(async () => {
  if (appStore.isInitialLoad) {
    await appStore.init();
  }
});

// Modal Actions
const openAddModal = () => {
  modalMode.value = 'CREATE';
  Object.assign(form, initialFormState);
  isModalOpen.value = true;
};

const openEditModal = (item: any) => {
  modalMode.value = 'UPDATE';
  Object.assign(form, {
    id: item.id,
    name: item.name,
    code: item.code || '',
    default_unit: item.default_unit || 'kg',
    default_unit_price: item.default_unit_price || 0
  });
  isModalOpen.value = true;
};

const handleSubmit = async () => {
  if (!form.name.trim()) return;
  
  loading.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      code: (form.code || '').trim().toUpperCase(),
      default_unit: form.default_unit,
      default_unit_price: Number(form.default_unit_price || 0)
    };
    
    if (modalMode.value === 'CREATE') {
      await appStore.saveEntity('material_items', 'CREATE', payload);
    } else {
      await appStore.saveEntity('material_items', 'UPDATE', {
        ...payload,
        id: form.id
      });
    }
    isModalOpen.value = false;
  } catch (err) {
    console.error('Lỗi khi lưu danh mục vật tư:', err);
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (item: any) => {
  if (confirm(`Bạn có chắc chắn muốn xóa danh mục vật tư "${item.name}" không?\nLưu ý: Hành động này không xóa lịch sử nhập vật tư đã tồn tại.`)) {
    try {
      await appStore.saveEntity('material_items', 'DELETE', item);
    } catch (err) {
      console.error('Lỗi khi xóa danh mục vật tư:', err);
    }
  }
};

// Seed Standard Sample Materials
const handleSeedSamples = async () => {
  seedLoading.value = true;
  try {
    const samples = [
      { name: 'Gạch đỏ chỉ', code: 'G-DO-CHI', default_unit: 'viên', default_unit_price: 1500 },
      { name: 'Đá dăm 1x2', code: 'D-DAM-1X2', default_unit: 'khối (m3)', default_unit_price: 320000 },
      { name: 'Cát vàng hạt lớn', code: 'C-VANG-HL', default_unit: 'khối (m3)', default_unit_price: 380000 },
      { name: 'Sỏi cuội sông sần', code: 'S-CUOI-SONG', default_unit: 'khối (m3)', default_unit_price: 270000 },
      { name: 'Xi măng Hà Tiên PC40', code: 'XM-HT-PC40', default_unit: 'bao', default_unit_price: 92000 },
      { name: 'Thép xoắn Thái Nguyên phi 10', code: 'T-TN-D10', default_unit: 'cây', default_unit_price: 112000 },
      { name: 'Thép cuộn mạ kẽm phi 6', code: 'T-HP-D6', default_unit: 'kg', default_unit_price: 18500 },
      { name: 'Sắt hình I-150', code: 'S-HINH-I150', default_unit: 'cây', default_unit_price: 2450000 },
      { name: 'Nước sạch thi công', code: 'NUOC-TC', default_unit: 'khối (m3)', default_unit_price: 15000 },
    ];

    for (const item of samples) {
      await appStore.saveEntity('material_items', 'CREATE', item);
    }
  } catch (err) {
    console.error('Lỗi khi khởi tạo danh mục mẫu:', err);
  } finally {
    seedLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8 pb-16">
    <!-- Header visual block -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-1.5">
          <Layers :size="14" />
          <span>Hệ thống kho danh mục</span>
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-neutral-900 tracking-tight leading-none uppercase">
          DANH MỤC VẬT TƯ
        </h1>
        <p class="text-neutral-500 mt-2 font-bold text-sm tracking-wide uppercase">
          Quản lý từ điển vật tư chuẩn hóa (gạch, cát, đá, sỏi, thép...) dùng chung toàn hệ thống
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Seed Samples button if empty -->
        <button 
          v-if="appStore.material_items.length === 0"
          @click="handleSeedSamples"
          :disabled="seedLoading"
          class="h-14 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-2xl font-black uppercase text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw :size="15" :class="{ 'animate-spin': seedLoading }" />
          <span>{{ seedLoading ? 'ĐANG KHỞI TẠO...' : 'NẠP DANH MỤC MẪU' }}</span>
        </button>

        <!-- Add Material Item button -->
        <button 
          @click="openAddModal"
          class="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          <Plus :size="16" />
          <span>THÊM VẬT TƯ MỚI</span>
        </button>
      </div>
    </div>

    <!-- Banner Info / Seeding callout -->
    <div 
      v-if="appStore.material_items.length === 0" 
      class="p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem] flex flex-col sm:flex-row items-center gap-4 text-sm font-semibold text-blue-800"
    >
      <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
        <Sparkles :size="24" />
      </div>
      <div class="flex-1 text-center sm:text-left space-y-1">
        <p class="font-extrabold text-base">Danh mục vật tư chuẩn chưa có dữ liệu!</p>
        <p class="text-blue-600/80 font-medium">Bấm ngay vào nút **"NẠP DANH MỤC MẪU"** ở góc phải để nạp ngay danh mục chuẩn chuẩn bị sẵn bao gồm: Gạch, Cát, Đá, Sỏi, Thép Thái Nguyên, Xi măng Hà Tiên...</p>
      </div>
    </div>

    <!-- Filters header -->
    <div class="bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex-1 flex gap-3 items-center">
        <!-- Search input box -->
        <div class="relative flex-1">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Tìm kiếm theo tên vật tư hoặc mã vật tư định mức..."
            class="w-full h-12 pl-12 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all text-neutral-800"
          />
          <Search :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>
    </div>

    <!-- Main materials dictionary list table -->
    <div class="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-neutral-100">
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Mã Vật tư / Sku</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tên vật tư chuẩn hóa</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Đơn vị mặc định</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Đơn giá tham khảo (VNĐ)</th>
              <th class="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredItems.length === 0" class="text-center text-neutral-400 py-24 italic">
              <td colspan="5" class="py-20 text-center">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <div class="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-300">
                    <Layers :size="32" />
                  </div>
                  <p class="font-bold text-sm text-neutral-400">Không tìm thấy vật tư chuẩn nào.</p>
                </div>
              </td>
            </tr>
            <tr v-for="item in paginatedItems" :key="item.id" class="group hover:bg-neutral-50/50 transition-colors border-b border-neutral-50 last:border-0">
              <td class="px-8 py-5">
                <span class="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block" v-if="item.code">
                  {{ item.code }}
                </span>
                <span class="text-neutral-300 italic text-xs font-bold" v-else>CHƯA ĐẶT MÃ</span>
              </td>
              <td class="px-8 py-5">
                <span class="text-sm font-extrabold text-neutral-900 block">
                  {{ item.name }}
                </span>
              </td>
              <td class="px-8 py-5 font-bold text-xs text-neutral-500 uppercase">
                {{ item.default_unit || 'Chưa đặt' }}
              </td>
              <td class="px-8 py-5 text-right font-black text-emerald-600 whitespace-nowrap text-sm">
                {{ item.default_unit_price ? formatCurrency(item.default_unit_price) : '0 ₫' }}
              </td>
              <td class="px-8 py-5 whitespace-nowrap">
                <div class="flex justify-center gap-2">
                  <button 
                    @click="openEditModal(item)"
                    class="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <Edit2 :size="14" />
                  </button>
                  <button 
                    @click="handleDelete(item)"
                    class="p-2 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Xóa khỏi danh mục"
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
      <div v-if="filteredItems.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-5 bg-neutral-50 border-t border-neutral-100">
        <p class="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">
          Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} / {{ filteredItems.length }} danh mục
        </p>
        <div class="flex items-center gap-2">
          <button 
            type="button"
            @click="currentPage > 1 ? currentPage-- : null" 
            :disabled="currentPage === 1"
            class="px-4 py-2 border border-neutral-200 text-neutral-500 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm cursor-pointer"
          >
            Trước
          </button>
          <div class="flex items-center gap-1 font-bold text-xs text-neutral-400 font-black tracking-widest uppercase text-[10px] select-none mx-2">
            Trang <span class="font-black text-neutral-900 mx-1 text-sm">{{ currentPage }}</span> / <span class="text-neutral-600">{{ totalPages }}</span>
          </div>
          <button 
            type="button"
            @click="currentPage < totalPages ? currentPage++ : null" 
            :disabled="currentPage === totalPages"
            class="px-4 py-2 border border-neutral-200 text-neutral-500 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm cursor-pointer"
          >
            Sau
          </button>
        </div>
      </div>
    </div>

    <!-- Active Modal Dialog -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="isModalOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      
      <div class="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10 lg:p-12 animate-in zoom-in duration-300">
        <button @click="isModalOpen = false" class="absolute top-8 right-8 p-1.5 hover:bg-neutral-200 rounded-full transition-colors z-10 cursor-pointer">
          <X :size="20" class="text-neutral-400" />
        </button>

        <div class="space-y-8">
          <div>
            <h2 class="text-3xl font-black text-neutral-900 uppercase leading-none">
              {{ modalMode === 'CREATE' ? 'THÊM VẬT TƯ MỚI' : 'CẬP NHẬT VẬT TƯ' }}
            </h2>
            <p class="text-neutral-500 mt-2 font-bold text-xs uppercase tracking-widest">
              Xác định vật tư quy chuẩn sử dụng chung cho báo cáo giám sát
            </p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Tên vật tư quy chuẩn -->
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên vật tư quy chuẩn *</label>
              <input 
                v-model="form.name"
                required
                type="text" 
                placeholder="Ví dụ: Cát vàng sông Hồng, Gạch chỉ đỏ xây dựng, Thép xoắn phi 12..."
                class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-extrabold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Mã vật tư / Sku -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Mã quy ước / SKU (Tùy chọn)</label>
                <input 
                  v-model="form.code"
                  type="text" 
                  placeholder="Ví dụ: CV-SH, GACH-CHI"
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-extrabold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm uppercase"
                />
              </div>

              <!-- Đơn vị mặc định -->
              <div>
                <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Đơn vị mặc định *</label>
                <input 
                  v-model="form.default_unit"
                  required
                  type="text" 
                  placeholder="Ví dụ: kg, khối (m3), bao..."
                  class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-extrabold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm"
                />
                
                <!-- Popular unit shortcuts -->
                <div class="mt-2 flex flex-wrap gap-1">
                  <button 
                    v-for="u in popularUnits" 
                    :key="u"
                    type="button"
                    @click="form.default_unit = u"
                    class="px-2 py-0.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-100/50 rounded-lg text-[10px] text-neutral-500 font-bold transition-all cursor-pointer"
                  >
                    {{ u }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Đơn giá tham khảo -->
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Đơn giá tham khảo (VNĐ)</label>
              <input 
                v-model.number="form.default_unit_price"
                type="number" 
                min="0"
                placeholder="0"
                class="w-full h-14 px-4 bg-neutral-50 border border-neutral-100 rounded-2xl font-extrabold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm"
              />
            </div>

            <!-- Live Info -->
            <div class="p-5 bg-neutral-50 rounded-[2rem] border border-neutral-100 flex items-start gap-3">
              <Info :size="16" class="text-blue-600 shrink-0 mt-0.5" />
              <p class="text-xs font-semibold text-neutral-600 leading-relaxed">
                Vật tư chuẩn sau khi thêm ở đây sẽ có mặt trong danh sách lựa chọn nhanh ở màn hình **Nhập Vật Tư**, giúp giảm thiểu tối đa sai sót chính tả khi nhập báo cáo hiện trường.
              </p>
            </div>

            <div class="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                @click="isModalOpen = false"
                class="px-5 py-3 border border-neutral-200 text-neutral-500 rounded-2xl font-bold text-xs uppercase hover:bg-neutral-50 transition-all cursor-pointer"
              >
                HỦY BỎ
              </button>
              <button 
                type="submit"
                :disabled="loading || !form.name.trim()"
                class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                <span>{{ loading ? 'ĐANG LƯU...' : 'LƯU VẬT TƯ' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
