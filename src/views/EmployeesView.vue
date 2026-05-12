<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAppStore } from '@/stores/app';
import { Search, UserCog, Check, X, Shield, Lock } from 'lucide-vue-next';

const appStore = useAppStore();
const searchQuery = ref('');
const loading = ref(false);

onMounted(async () => {
  await appStore.refreshAll();
});

const updateRole = async (empId: string, role: string) => {
  if (loading.value) return;
  loading.value = true;
  try {
    const emp = appStore.employees.find(e => e.id === empId);
    if (emp) {
      await appStore.saveEntity('employees', 'UPDATE', {
        ...emp,
        system_role: role
      });
    }
  } catch (err) {
    console.error('Error updating employee role:', err);
  } finally {
    loading.value = false;
  }
};

const toggleActive = async (empId: string) => {
  if (loading.value) return;
  const emp = appStore.employees.find(e => e.id === empId);
  if (!emp) return;
  
  const actionText = emp.is_active ? 'vô hiệu hóa (nghỉ việc)' : 'kích hoạt lại';
  if (!confirm(`Bạn có chắc chắn muốn ${actionText} nhân sự này?`)) return;

  loading.value = true;
  try {
    await appStore.saveEntity('employees', 'UPDATE', {
      ...emp,
      is_active: emp.is_active ? 0 : 1
    });
  } catch (err) {
    console.error('Error toggling employee status:', err);
  } finally {
    loading.value = false;
  }
};

const getDeptName = (id: string) => {
  return appStore.departments.find(d => d.id === id)?.name || 'Chưa phân bổ';
};

const filteredEmployees = computed(() => {
  return appStore.employees.filter(e => {
    const name = e.name || '';
    return name.toLowerCase().includes(searchQuery.value.toLowerCase());
  });
});

</script>

<template>
  <div v-if="appStore.isInitialLoad" class="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
    <div class="text-center">
       <p class="text-xs font-black text-neutral-400 uppercase tracking-widest">Đang tải danh sách nhân sự...</p>
       <p class="text-[10px] text-neutral-400 mt-1 uppercase font-bold">Dữ liệu đang được đồng bộ</p>
    </div>
  </div>

  <div v-else class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 tracking-tight uppercase">Nhân sự hệ thống</h1>
        <p class="text-neutral-500 mt-2 font-medium">Quản lý người dùng & Phân quyền truy cập</p>
      </div>
    </div>

    <div class="relative">
      <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" :size="20" />
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Tìm kiếm nhân viên..." 
        class="w-full h-14 pl-12 pr-4 bg-white border border-neutral-100 rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-bold"
      />
    </div>

    <div class="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-neutral-50/50">
          <tr class="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] border-b border-neutral-100">
            <th class="px-8 py-5">Nhân sự</th>
            <th class="px-8 py-5">Phòng ban</th>
            <th class="px-8 py-5">Vai trò hệ thống</th>
            <th class="px-8 py-5 text-right">Trạng thái</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-50">
          <tr v-for="emp in filteredEmployees" :key="emp.id" class="group hover:bg-neutral-50/50 transition-colors">
            <td class="px-8 py-5">
              <div class="flex items-center gap-3">
                <img v-if="emp.photo_url" :src="emp.photo_url" class="w-10 h-10 rounded-xl" referrerpolicy="no-referrer" />
                <div v-else class="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-bold text-neutral-400">{{ emp.name.charAt(0) }}</div>
                <div>
                  <p class="font-bold text-neutral-900">{{ emp.name }}</p>
                  <p class="text-[10px] font-bold text-neutral-400 lowercase">{{ emp.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-8 py-5">
               <span class="px-3 py-1 bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                 {{ getDeptName(emp.department_id) }}
               </span>
            </td>
            <td class="px-8 py-5">
               <select 
                 :value="emp.system_role"
                 @change="updateRole(emp.id, ($event.target as HTMLSelectElement).value)"
                 class="h-9 px-3 bg-white border border-neutral-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 cursor-pointer"
               >
                 <option value="ADMIN">ADMIN</option>
                 <option value="CEO">CEO</option>
                 <option value="LEADER">LEADER</option>
                 <option value="STAFF">STAFF</option>
               </select>
            </td>
            <td class="px-8 py-5 text-right">
              <button 
                @click="toggleActive(emp.id)"
                class="inline-flex items-center gap-2 group/status"
              >
                <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors" :class="emp.is_active ? 'text-emerald-500 group-hover/status:text-red-500' : 'text-neutral-400 group-hover/status:text-emerald-500'">
                  <div class="w-1.5 h-1.5 rounded-full" :class="emp.is_active ? 'bg-emerald-500 group-hover/status:bg-red-500' : 'bg-neutral-400 group-hover/status:bg-emerald-500'"></div>
                  {{ emp.is_active ? 'Đang hoạt động' : 'Nghỉ việc' }}
                </span>
                <Lock v-if="emp.is_active" :size="12" class="text-neutral-300 group-hover/status:text-red-500 transition-colors" />
                <Check v-else :size="12" class="text-neutral-300 group-hover/status:text-emerald-500 transition-colors" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
