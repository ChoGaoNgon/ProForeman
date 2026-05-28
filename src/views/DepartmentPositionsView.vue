<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { Plus, UserCheck, Trash2, Edit2, X } from 'lucide-vue-next';

const appStore = useAppStore();
const isModalOpen = ref(false);
const editingPosition = ref<any>(null);
const form = ref({ name: '', code: '' });
const loading = ref(false);

onMounted(() => appStore.refreshAll());

const save = async () => {
  if (!form.value.name.trim() || !form.value.code.trim() || loading.value) return;

  // Check duplicate code (case-insensitive)
  const isDuplicate = (appStore.department_positions || []).some(pos => 
    pos.code.toLowerCase() === form.value.code.trim().toLowerCase() && 
    (!editingPosition.value || pos.id !== editingPosition.value.id)
  );

  if (isDuplicate) {
    alert('Mã chức danh phòng ban này đã tồn tại. Vui lòng chọn mã khác.');
    return;
  }

  loading.value = true;
  try {
    const dataToSend = {
      name: form.value.name.trim(),
      code: form.value.code.trim().toUpperCase()
    };
    
    if (editingPosition.value) {
      await appStore.saveEntity('department_positions', 'UPDATE', {
        ...editingPosition.value,
        ...dataToSend
      });
    } else {
      await appStore.saveEntity('department_positions', 'CREATE', dataToSend);
    }
    
    form.value = { name: '', code: '' };
    editingPosition.value = null;
    isModalOpen.value = false;
  } catch (err) {
    console.error('Error saving department position:', err);
    alert('Có lỗi xảy ra khi lưu chức danh phòng ban.');
  } finally {
    loading.value = false;
  }
};

const remove = async (pos: any) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa chức danh phòng ban "${pos.name}"?`) || loading.value) return;
  loading.value = true;
  try {
    await appStore.saveEntity('department_positions', 'DELETE', pos);
    console.log('Department position deleted successfully');
  } catch (err) {
    console.error('Error removing department position:', err);
    alert('Có lỗi xảy ra khi xóa chức danh phòng ban.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8" id="department-positions-view">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight uppercase leading-none">Chức danh phòng ban</h1>
        <p class="text-neutral-500 mt-2 font-medium">Danh mục các vị trí công việc, chức vụ hành chính trong cơ cấu công ty</p>
      </div>
      <button 
        @click="isModalOpen = true" 
        class="px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-neutral-800 transition-all active:scale-95"
        id="btn-add-position"
      >
        <Plus :size="16" />
        <span>Thêm chức danh PB</span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!appStore.department_positions || appStore.department_positions.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-neutral-200">
      <div class="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <UserCheck :size="32" />
      </div>
      <h3 class="font-bold text-neutral-800 text-lg uppercase">Chưa có chức danh phòng ban</h3>
      <p class="text-neutral-500 text-xs mt-1">Vui lòng thêm chức danh phòng ban mới để gán cho nhân viên.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="pos in appStore.department_positions" 
        :key="pos.id" 
        class="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col items-center text-center relative group hover:border-blue-200 transition-all duration-300"
        :id="'pos-card-' + pos.id"
      >
        <div class="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          <UserCheck :size="32" />
        </div>
        <h3 class="font-black text-neutral-900 uppercase tracking-tight">{{ pos.name }}</h3>
        <p class="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">Mã: {{ pos.code }}</p>
        
        <div class="absolute top-4 right-4 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click="editingPosition = pos; form = { name: pos.name, code: pos.code }; isModalOpen = true;" 
            class="p-2 text-neutral-400 hover:text-blue-600 bg-neutral-50 rounded-lg hover:bg-blue-50 transition-colors" 
            title="Sửa"
            :id="'btn-edit-' + pos.id"
          >
            <Edit2 :size="14" />
          </button>
          <button 
            @click="remove(pos)" 
            class="p-2 text-neutral-400 hover:text-red-500 bg-neutral-50 rounded-lg hover:bg-red-50 transition-colors" 
            title="Xóa"
            :id="'btn-delete-' + pos.id"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- CRUD Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4" id="modal-position">
      <div @click="isModalOpen = false; editingPosition = null; form = { name: '', code: '' };" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
        <button 
          @click="isModalOpen = false; editingPosition = null; form = { name: '', code: '' };" 
          class="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <X :size="16" />
        </button>
        
        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-8 border-b border-neutral-100 pb-4 text-center">
          {{ editingPosition ? 'Sửa' : 'Thêm' }} Chức Danh PB
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên chức danh (VD: Trưởng phòng)</label>
            <input 
              v-model="form.name" 
              type="text" 
              placeholder="Nhập tên chức danh phòng ban..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-pos-name"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Mã code (VD: TP)</label>
            <input 
              v-model="form.code" 
              type="text" 
              placeholder="Nhập mã viết tắt..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-pos-code"
            />
          </div>
          
          <button 
            @click="save" 
            :disabled="loading || !form.name.trim() || !form.code.trim()"
            class="w-full h-14 bg-neutral-900 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4 shadow-xl hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50"
            id="btn-save-submit"
          >
            {{ loading ? 'Đang lưu...' : 'Lưu thông tin' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
