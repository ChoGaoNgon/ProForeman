<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useAppStore } from '@/stores/app';
import { Plus, Truck, Trash2, Edit2, X, Phone, MapPin, Search } from 'lucide-vue-next';

const appStore = useAppStore();
const isModalOpen = ref(false);
const editingSupplier = ref<any>(null);
const searchQuery = ref('');
const loading = ref(false);

const initialForm = {
  name: '',
  code: '',
  phone: '',
  address: ''
};

const form = reactive({ ...initialForm });

onMounted(() => appStore.refreshAll());

const filteredSuppliers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const list = appStore.suppliers || [];
  if (!query) return list;
  return list.filter((s: any) => 
    (s.name || '').toLowerCase().includes(query) ||
    (s.code || '').toLowerCase().includes(query) ||
    (s.phone || '').toLowerCase().includes(query) ||
    (s.address || '').toLowerCase().includes(query)
  );
});

const openCreateModal = () => {
  editingSupplier.value = null;
  Object.assign(form, initialForm);
  isModalOpen.value = true;
};

const openEditModal = (supplier: any) => {
  editingSupplier.value = supplier;
  Object.assign(form, {
    name: supplier.name,
    code: supplier.code,
    phone: supplier.phone || '',
    address: supplier.address || ''
  });
  isModalOpen.value = true;
};

const save = async () => {
  if (!form.name.trim() || !form.code.trim() || loading.value) return;

  const codeUpper = form.code.trim().toUpperCase();

  // Check duplicate code (case-insensitive)
  const isDuplicate = (appStore.suppliers || []).some((s: any) => 
    s.code.toUpperCase() === codeUpper && 
    (!editingSupplier.value || s.id !== editingSupplier.value.id)
  );

  if (isDuplicate) {
    alert('Mã nhà cung cấp này đã tồn tại. Vui lòng chọn mã khác.');
    return;
  }

  loading.value = true;
  try {
    const dataToSend = {
      name: form.name.trim(),
      code: codeUpper,
      phone: form.phone.trim(),
      address: form.address.trim()
    };
    
    if (editingSupplier.value) {
      await appStore.saveEntity('suppliers', 'UPDATE', {
        ...editingSupplier.value,
        ...dataToSend
      });
    } else {
      await appStore.saveEntity('suppliers', 'CREATE', dataToSend);
    }
    
    isModalOpen.value = false;
    Object.assign(form, initialForm);
    editingSupplier.value = null;
  } catch (err) {
    console.error('Error saving supplier:', err);
    alert('Có lỗi xảy ra khi lưu nhà cung cấp.');
  } finally {
    loading.value = false;
  }
};

const remove = async (supplier: any) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${supplier.name}"?`) || loading.value) return;
  loading.value = true;
  try {
    await appStore.saveEntity('suppliers', 'DELETE', supplier);
  } catch (err) {
    console.error('Error removing supplier:', err);
    alert('Có lỗi xảy ra khi xóa nhà cung cấp.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8" id="suppliers-view">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-neutral-900 tracking-tight uppercase leading-none">Danh sách nhà cung cấp</h1>
        <p class="text-neutral-500 mt-2 font-medium">Quản lý danh bạn các đối tác, nhà cung cấp vật liệu xây dựng</p>
      </div>
      <button 
        @click="openCreateModal" 
        class="px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-neutral-800 transition-all active:scale-95 self-start md:self-auto"
        id="btn-add-supplier"
      >
        <Plus :size="16" />
        <span>Thêm nhà cung cấp</span>
      </button>
    </div>

    <!-- Search Tool -->
    <div class="flex items-center bg-white px-4 py-3 rounded-2xl border border-neutral-100 shadow-sm max-w-md">
      <Search class="text-neutral-400 mr-2" :size="20" />
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Tìm kiếm theo tên, mã, số ĐT, địa chỉ..." 
        class="w-full bg-transparent outline-none text-neutral-800 text-sm font-bold"
      />
    </div>

    <!-- Empty State -->
    <div v-if="filteredSuppliers.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-neutral-200">
      <div class="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Truck :size="32" />
      </div>
      <h3 class="font-bold text-neutral-800 text-lg uppercase">Chưa tìm thấy nhà cung cấp nào</h3>
      <p class="text-neutral-500 text-xs mt-1">Vui lòng thử điều chỉnh lại bộ lọc tìm kiếm hoặc thêm đối tác mới.</p>
    </div>

    <!-- Suppliers Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="s in filteredSuppliers" 
        :key="s.id" 
        class="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col justify-between relative group hover:border-blue-200 transition-all duration-300"
        :id="'supplier-card-' + s.id"
      >
        <div>
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
              <Truck :size="24" />
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-black text-neutral-600 uppercase tracking-wider">{{ s.code }}</span>
              </div>
              <h3 class="font-black text-neutral-900 uppercase tracking-tight text-base leading-snug">{{ s.name }}</h3>
            </div>
          </div>

          <!-- Contact Details -->
          <div class="space-y-2 mt-4 pt-4 border-t border-neutral-50 text-xs font-bold text-neutral-500">
            <div class="flex items-center gap-2">
              <Phone :size="14" class="text-neutral-400 shrink-0" />
              <span>SĐT: {{ s.phone || 'Chưa cập nhật' }}</span>
            </div>
            <div class="flex items-start gap-2">
              <MapPin :size="14" class="text-neutral-400 shrink-0 mt-0.5" />
              <span class="leading-relaxed">Đ/C: {{ s.address || 'Chưa cập nhật' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Hover actions -->
        <div class="absolute top-4 right-4 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click="openEditModal(s)" 
            class="p-2 text-neutral-400 hover:text-blue-600 bg-neutral-50 rounded-lg hover:bg-blue-50 transition-colors" 
            title="Sửa"
            :id="'btn-edit-supplier-' + s.id"
          >
            <Edit2 :size="14" />
          </button>
          <button 
            @click="remove(s)" 
            class="p-2 text-neutral-400 hover:text-red-500 bg-neutral-50 rounded-lg hover:bg-red-50 transition-colors" 
            title="Xóa"
            :id="'btn-delete-supplier-' + s.id"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- CRUD Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4" id="modal-supplier">
      <div @click="isModalOpen = false; editingSupplier = null;" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
        <button 
          @click="isModalOpen = false; editingSupplier = null;" 
          class="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <X :size="16" />
        </button>
        
        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-8 border-b border-neutral-100 pb-4 text-center">
          {{ editingSupplier ? 'Sửa' : 'Thêm' }} Nhà cung cấp
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên nhà cung cấp *</label>
            <input 
              v-model="form.name" 
              type="text" 
              placeholder="Nhập tên nhà cung cấp (VD: Công ty Hòa Phát)..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-supplier-name"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Mã nhà cung cấp *</label>
            <input 
              v-model="form.code" 
              type="text" 
              placeholder="Nhập mã viết tắt (VD: HOAPHAT)..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-supplier-code"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Số điện thoại liên hệ</label>
            <input 
              v-model="form.phone" 
              type="text" 
              placeholder="Nhập số điện thoại..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-supplier-phone"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Địa chỉ nhà cung cấp</label>
            <input 
              v-model="form.address" 
              type="text" 
              placeholder="Nhập địa chỉ..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-supplier-address"
            />
          </div>
          
          <button 
            @click="save" 
            :disabled="loading || !form.name.trim() || !form.code.trim()"
            class="w-full h-14 bg-neutral-900 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4 shadow-xl hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50"
            id="btn-save-supplier-submit"
          >
            {{ loading ? 'Đang lưu...' : 'Lưu nhà cung cấp' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
