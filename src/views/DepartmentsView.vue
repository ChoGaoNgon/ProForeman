<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { Plus, Building2, Trash2, Edit2, X, Check } from 'lucide-vue-next';

const appStore = useAppStore();
const isModalOpen = ref(false);
const editingDept = ref<any>(null);
const name = ref('');
const loading = ref(false);

onMounted(() => appStore.refreshAll());

const save = async () => {
  if (!name.value || loading.value) return;
  loading.value = true;
  try {
    if (editingDept.value) {
      await appStore.saveEntity('departments', 'UPDATE', { 
        ...editingDept.value,
        name: name.value 
      });
    } else {
      await appStore.saveEntity('departments', 'CREATE', { 
        name: name.value, 
        is_deleted: 0 
      });
    }
    name.value = '';
    editingDept.value = null;
    isModalOpen.value = false;
  } catch (err) {
    console.error('Error saving department:', err);
  } finally {
    loading.value = false;
  }
};

const remove = async (id: string) => {
  if (!confirm('Xóa phòng ban này?') || loading.value) return;
  loading.value = true;
  try {
    const dept = appStore.departments.find(d => d.id === id);
    if (dept) {
      await appStore.saveEntity('departments', 'UPDATE', { 
        ...dept,
        is_deleted: 1 
      });
    }
  } catch (err) {
    console.error('Error removing department:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight uppercase">Phòng ban</h1>
        <p class="text-neutral-500 mt-2">Cơ cấu tổ chức trong công ty</p>
      </div>
      <button @click="isModalOpen = true" class="px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg">
        <Plus :size="16" />
        <span>Thêm phòng ban</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="dept in appStore.departments" :key="dept.id" class="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex items-center justify-between group">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 :size="20" />
          </div>
          <span class="font-bold text-neutral-900">{{ dept.name }}</span>
        </div>
        <div class="flex gap-2">
          <button @click="editingDept = dept; name = dept.name; isModalOpen = true;" class="p-2 text-neutral-300 hover:text-blue-600 transition-colors">
            <Edit2 :size="16" />
          </button>
          <button @click="remove(dept.id)" class="p-2 text-neutral-300 hover:text-red-500 transition-colors">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div @click="isModalOpen = false; editingDept = null; name = '';" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300">
        <h2 class="text-xl font-black text-neutral-900 uppercase mb-6">{{ editingDept ? 'Sửa' : 'Thêm' }} Phòng ban</h2>
        <input v-model="name" type="text" placeholder="Tên phòng ban..." class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold mb-6 outline-none focus:border-blue-500" />
        <button 
          @click="save" 
          :disabled="loading"
          class="w-full h-12 bg-neutral-900 text-white font-black rounded-xl uppercase tracking-widest text-xs disabled:opacity-50"
        >
          {{ loading ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>
  </div>
</template>
