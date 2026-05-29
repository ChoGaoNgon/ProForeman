<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { Plus, UserSquare2, Trash2, Edit2, X } from 'lucide-vue-next';

const appStore = useAppStore();
const isModalOpen = ref(false);
const editingRole = ref<any>(null);
const form = ref({ name: '', code: '' });
const loading = ref(false);

onMounted(() => appStore.refreshAll());

const save = async () => {
  if (!form.value.name || !form.value.code || loading.value) return;

  // Check if code already exists (case-insensitive)
  const isDuplicate = appStore.projectRoles.some(role => 
    role.code.toLowerCase() === form.value.code.toLowerCase() && 
    (!editingRole.value || role.id !== editingRole.value.id)
  );

  if (isDuplicate) {
    alert('Mã chức danh này đã tồn tại. Vui lòng chọn mã khác.');
    return;
  }

  loading.value = true;
  try {
    if (editingRole.value) {
      await appStore.saveEntity('project_roles', 'UPDATE', {
        ...editingRole.value,
        ...form.value
      });
    } else {
      await appStore.saveEntity('project_roles', 'CREATE', form.value);
    }
    form.value = { name: '', code: '' };
    editingRole.value = null;
    isModalOpen.value = false;
  } catch (err) {
    console.error('Error saving project role:', err);
  } finally {
    loading.value = false;
  }
};

const remove = async (role: any) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa chức danh "${role.name}"?`) || loading.value) return;
  loading.value = true;
  try {
    await appStore.saveEntity('project_roles', 'DELETE', role);
    // No alert needed if refresh works, but console log for debugging if user can see it
    console.log('Role deleted successfully');
  } catch (err) {
    console.error('Error removing project role:', err);
    alert('Có lỗi xảy ra khi xóa chức danh.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight uppercase leading-none">Chức danh dự án</h1>
        <p class="text-neutral-500 mt-2 font-medium">Danh mục các vị trí công việc trong công trình</p>
      </div>
      <button @click="isModalOpen = true" class="px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-neutral-800 transition-all">
        <Plus :size="16" />
        <span>Thêm chức danh</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="role in appStore.project_roles" :key="role.id" class="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col items-center text-center relative group hover:border-blue-200 transition-all">
        <div class="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          <UserSquare2 :size="32" />
        </div>
        <h3 class="font-black text-neutral-900 uppercase tracking-tight">{{ role.name }}</h3>
        <p class="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">Mã: {{ role.code }}</p>
        
        <div class="absolute top-4 right-4 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click="editingRole = role; form = { name: role.name, code: role.code }; isModalOpen = true;" class="p-2 text-neutral-400 hover:text-blue-600 bg-neutral-50 rounded-lg hover:bg-blue-50 transition-colors" title="Sửa">
            <Edit2 :size="14" />
          </button>
          <button @click="remove(role)" class="p-2 text-neutral-400 hover:text-red-500 bg-neutral-50 rounded-lg hover:bg-red-50 transition-colors" title="Xóa">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="isModalOpen = false; editingRole = null; form = { name: '', code: '' };" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto p-10 animate-in zoom-in duration-300">
        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-8 border-b border-neutral-100 pb-4 text-center">{{ editingRole ? 'Sửa' : 'Thêm' }} Chức danh</h2>
        <div class="space-y-4">
           <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tên chức danh (VD: Chỉ huy trưởng)</label>
              <input v-model="form.name" type="text" class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500" />
           </div>
           <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Mã code (VD: CHT)</label>
              <input v-model="form.code" type="text" class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500" />
           </div>
           <button 
             @click="save" 
             :disabled="loading"
             class="w-full h-14 bg-neutral-900 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4 shadow-xl hover:bg-neutral-800 disabled:opacity-50"
           >
             {{ loading ? 'Đang lưu...' : 'Lưu thông tin' }}
           </button>
        </div>
      </div>
    </div>
  </div>
</template>
