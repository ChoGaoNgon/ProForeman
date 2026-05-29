<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { Plus, Trash2, Edit2, X, Bell, MessageSquare, ShieldAlert, KeyRound, Radio, Settings, ClipboardList, CreditCard, Briefcase } from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const isModalOpen = ref(false);
const editingConfig = ref<any>(null);
const loading = ref(false);

const defaultNames = ['Kênh Báo cáo', 'Kênh Thanh Toán', 'Kênh Dự Án'];
const selectedPreset = ref('Kênh Báo cáo');
const customNameInput = ref('');

const initialForm = {
  name: '',
  telegram_bot_token: '',
  telegram_chat_id: ''
};

const form = reactive({ ...initialForm });

onMounted(() => {
  if (authStore.isAdmin) {
    appStore.refreshAll();
  }
});

// Access check
const isAllowed = computed(() => authStore.isAdmin);

const openCreateModal = () => {
  editingConfig.value = null;
  Object.assign(form, initialForm);
  selectedPreset.value = 'Kênh Báo cáo';
  customNameInput.value = '';
  isModalOpen.value = true;
};

const openEditModal = (config: any) => {
  editingConfig.value = config;
  Object.assign(form, {
    name: config.name,
    telegram_bot_token: config.telegram_bot_token,
    telegram_chat_id: config.telegram_chat_id
  });
  if (defaultNames.includes(config.name)) {
    selectedPreset.value = config.name;
    customNameInput.value = '';
  } else {
    selectedPreset.value = 'CUSTOM';
    customNameInput.value = config.name;
  }
  isModalOpen.value = true;
};

const save = async () => {
  const finalName = selectedPreset.value === 'CUSTOM' ? customNameInput.value.trim() : selectedPreset.value;
  if (!finalName || !form.telegram_bot_token.trim() || !form.telegram_chat_id.trim() || loading.value) return;

  loading.value = true;
  try {
    const dataToSend = {
      name: finalName,
      telegram_bot_token: form.telegram_bot_token.trim(),
      telegram_chat_id: form.telegram_chat_id.trim()
    };
    
    if (editingConfig.value) {
      await appStore.saveEntity('system_configs', 'UPDATE', {
        ...editingConfig.value,
        ...dataToSend
      });
    } else {
      await appStore.saveEntity('system_configs', 'CREATE', dataToSend);
    }
    
    isModalOpen.value = false;
    Object.assign(form, initialForm);
    editingConfig.value = null;
  } catch (err) {
    console.error('Error saving system config:', err);
    alert('Có lỗi xảy ra khi lưu cấu hình.');
  } finally {
    loading.value = false;
  }
};

const remove = async (config: any) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa cấu hình "${config.name}"?`) || loading.value) return;
  loading.value = true;
  try {
    await appStore.saveEntity('system_configs', 'DELETE', config);
  } catch (err) {
    console.error('Error removing system config:', err);
    alert('Có lỗi xảy ra khi xóa cấu hình.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-8" id="settings-view">
    <!-- Authorization Guard -->
    <div v-if="!isAllowed" class="bg-red-50 border border-red-100 rounded-[2rem] p-12 text-center max-w-2xl mx-auto space-y-6">
      <div class="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
        <ShieldAlert :size="40" />
      </div>
      <div>
        <h2 class="text-2xl font-black text-neutral-900 uppercase">Quyền truy cập bị từ chối</h2>
        <p class="text-neutral-500 mt-2 font-bold text-sm">Chỉ Quản trị viên (ADMIN) mới có quyền truy cập và chỉnh sửa các cấu hình hệ thống.</p>
      </div>
    </div>

    <div v-else class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-neutral-900 tracking-tight uppercase leading-none">Cấu hình hệ thống</h1>
          <p class="text-neutral-500 mt-2 font-medium">Cấu hình BOT Telegram gửi thông báo và các tích hợp thời gian thực</p>
        </div>
        <button 
          @click="openCreateModal" 
          class="px-5 py-3 bg-neutral-900 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-neutral-800 transition-all active:scale-95 self-start md:self-auto"
          id="btn-add-config"
        >
          <Plus :size="16" />
          <span>Thêm cấu hình Telegram</span>
        </button>
      </div>

      <!-- General Info Alert -->
      <div class="bg-blue-50/50 border border-blue-100/70 p-6 rounded-3xl flex items-start gap-4 max-w-4xl">
        <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
          <Radio :size="20" class="animate-pulse" />
        </div>
        <div class="space-y-1">
          <h4 class="font-black text-blue-900 uppercase text-xs tracking-wider">Thông tin bảo mật tích hợp</h4>
          <p class="text-blue-700 font-bold text-xs leading-relaxed">
            Hệ thống hỗ trợ cấu hình Telegram Bot Token & Chat ID để tự động đẩy báo cáo công việc, tiến độ hoặc trạng thái duyệt thanh toán đến nhóm làm việc. Chỉ quản trị viên mới nhìn thấy và quản lý được danh sách cấu hình của các Bot này.
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!appStore.system_configs || appStore.system_configs.length === 0" class="bg-white rounded-3xl p-16 text-center border border-dashed border-neutral-200">
        <div class="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bell :size="32" />
        </div>
        <h3 class="font-bold text-neutral-800 text-lg uppercase mb-1">Chưa có cấu hình Telegram nào</h3>
        <p class="text-neutral-500 text-xs font-bold">Vui lòng nhấp vào nút "Thêm cấu hình Telegram" để cài đặt thông tin kết nối Bot.</p>
      </div>

      <!-- Config Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        <div 
          v-for="config in appStore.system_configs" 
          :key="config.id" 
          class="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex flex-col justify-between relative group hover:border-blue-200 transition-all duration-300"
          :id="'config-card-' + config.id"
        >
          <div class="space-y-6">
            <!-- Title -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-neutral-50 text-neutral-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                <Bell :size="24" />
              </div>
              <div class="space-y-1">
                <span class="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-black text-blue-600 uppercase tracking-wider">TELEGRAM BOT</span>
                <h3 class="font-black text-neutral-900 uppercase tracking-tight text-lg leading-snug">{{ config.name }}</h3>
              </div>
            </div>

            <!-- Parameters (Fully visible and readable as requested) -->
            <div class="space-y-3 bg-neutral-50/70 p-5 rounded-2xl border border-neutral-100/50">
              <div class="space-y-1">
                <label class="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Bot Token</label>
                <div class="flex items-center gap-2">
                  <KeyRound :size="14" class="text-neutral-400 shrink-0" />
                  <code class="text-xs font-mono font-bold text-neutral-700 break-all select-all">{{ config.telegram_bot_token }}</code>
                </div>
              </div>
              <div class="space-y-1 pt-3 border-t border-neutral-100">
                <label class="text-[9px] font-black text-neutral-400 uppercase tracking-widest block font-bold">Chat ID (Group/Channel)</label>
                <div class="flex items-center gap-2">
                  <MessageSquare :size="14" class="text-neutral-400 shrink-0" />
                  <code class="text-xs font-mono font-bold text-neutral-700 select-all">{{ config.telegram_chat_id }}</code>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Edit/Delete Hover Controls -->
          <div class="absolute top-6 right-6 flex gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              @click="openEditModal(config)" 
              class="p-2.5 text-neutral-400 hover:text-blue-600 bg-neutral-50 rounded-xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100" 
              title="Sửa cấu hình"
              :id="'btn-edit-config-' + config.id"
            >
              <Edit2 :size="14" />
            </button>
            <button 
              @click="remove(config)" 
              class="p-2.5 text-neutral-400 hover:text-red-500 bg-neutral-50 rounded-xl hover:bg-red-50 transition-colors border border-transparent hover:border-red-100" 
              title="Xóa cấu hình"
              :id="'btn-delete-config-' + config.id"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Modal (Thêm/Sửa Cấu hình) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4" id="modal-config">
      <div @click="isModalOpen = false; editingConfig = null;" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto p-10 animate-in zoom-in duration-300">
        <button 
          @click="isModalOpen = false; editingConfig = null;" 
          class="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <X :size="16" />
        </button>
        
        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-8 border-b border-neutral-100 pb-4 text-center">
          {{ editingConfig ? 'Sửa' : 'Thêm' }} Cấu hình Telegram
        </h2>
        
        <div class="space-y-5">
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Tên cấu hình / Kênh thông báo *</label>
            
            <!-- Cards Selection Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <button 
                v-for="preset in defaultNames" 
                :key="preset"
                type="button"
                @click="selectedPreset = preset"
                class="flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]"
                :class="selectedPreset === preset ? 'bg-blue-50/70 border-blue-500 text-blue-900 shadow-sm' : 'bg-neutral-50/50 border-neutral-100 text-neutral-600 hover:border-neutral-200'"
              >
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  :class="selectedPreset === preset ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100/70 text-neutral-400'"
                >
                  <ClipboardList v-if="preset === 'Kênh Báo cáo'" :size="18" />
                  <CreditCard v-else-if="preset === 'Kênh Thanh Toán'" :size="18" />
                  <Briefcase v-else-if="preset === 'Kênh Dự Án'" :size="18" />
                </div>
                <div class="space-y-0.5 min-w-0">
                  <p class="font-extrabold text-xs tracking-tight truncate">{{ preset }}</p>
                  <p class="text-[8px] text-neutral-400 font-bold uppercase tracking-wider block">Mặc định</p>
                </div>
              </button>
              
              <button 
                type="button"
                @click="selectedPreset = 'CUSTOM'"
                class="flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]"
                :class="selectedPreset === 'CUSTOM' ? 'bg-blue-50/70 border-blue-500 text-blue-900 shadow-sm' : 'bg-neutral-50/50 border-neutral-100 text-neutral-600 hover:border-neutral-200'"
              >
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0"
                  :class="selectedPreset === 'CUSTOM' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100/70 text-neutral-400'"
                >
                  <Settings :size="18" />
                </div>
                <div class="space-y-0.5 min-w-0">
                  <p class="font-extrabold text-xs tracking-tight truncate">Tùy chọn khác</p>
                  <p class="text-[8px] text-neutral-400 font-bold uppercase tracking-wider block">Tự nhập tên</p>
                </div>
              </button>
            </div>

            <!-- Custom text input if CUSTOM is chosen -->
            <div v-if="selectedPreset === 'CUSTOM'" class="animate-in fade-in slide-in-from-top-2 duration-200">
              <input 
                v-model="customNameInput" 
                type="text" 
                placeholder="Nhập tên đại điện tùy chỉnh..."
                class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
                id="input-config-name-custom"
              />
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Telegram Bot Token *</label>
            <input 
              v-model="form.telegram_bot_token" 
              type="text" 
              placeholder="VD: 123456789:ABCdefGhIJKlmNoPQRsT..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-mono text-xs font-bold outline-none focus:border-blue-500 transition-all text-neutral-800" 
              id="input-telegram-token"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Telegram Chat ID *</label>
            <input 
              v-model="form.telegram_chat_id" 
              type="text" 
              placeholder="VD: -100123456789 hoặc 987654321..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-mono text-xs font-bold outline-none focus:border-blue-500 transition-all text-neutral-800" 
              id="input-telegram-chatid"
            />
          </div>
          
          <button 
            @click="save" 
            :disabled="loading || (selectedPreset === 'CUSTOM' ? !customNameInput.trim() : !selectedPreset) || !form.telegram_bot_token.trim() || !form.telegram_chat_id.trim()"
            class="w-full h-14 bg-neutral-900 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4 shadow-xl hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50"
            id="btn-save-config-submit"
          >
            {{ loading ? 'Đang lưu...' : 'Lưu cấu hình' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
