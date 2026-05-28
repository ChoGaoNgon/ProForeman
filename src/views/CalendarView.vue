<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Users, 
  MapPin, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Repeat, 
  Check,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-vue-next';

const authStore = useAuthStore();

// Calendar state
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth()); // 0-indexed
const selectedDate = ref<Date | null>(new Date());
const events = ref<any[]>([]);
const loading = ref(false);
const errorMsg = ref('');

// Modal state
const isCreateModalOpen = ref(false);
const submitLoading = ref(false);

const initialForm = {
  summary: '',
  location: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
  recurrenceFreq: 'NONE', // NONE, DAILY, WEEKLY, MONTHLY
  recurrenceCount: 10,
  attendeesRaw: '' // Comma or newline separated guest emails
};

const form = reactive({ ...initialForm });

// Month names in Vietnamese
const monthNames = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Authenticate via Google popup
const connectGoogle = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.loginWithGoogleCalendar();
    fetchEvents();
  } catch (err: any) {
    console.error('Lỗi login Google Calendar:', err);
    errorMsg.value = err.message || 'Xác thực tài khoản Google thất bại.';
  } finally {
    loading.value = false;
  }
};

// Fetch calendar events
const fetchEvents = async () => {
  if (!authStore.googleAccessToken) return;
  loading.value = true;
  errorMsg.value = '';
  
  // Calculate first second of month and last second of month in UTC
  const timeMin = new Date(currentYear.value, currentMonth.value, 1, 0, 0, 0).toISOString();
  // Get last day of month
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);
  const timeMax = new Date(currentYear.value, currentMonth.value, lastDay.getDate(), 23, 59, 59).toISOString();

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authStore.googleAccessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired, clear it
      authStore.googleAccessToken = null;
      errorMsg.value = 'Phiên làm việc Google đã hết hạn. Vui lòng kết nối lại.';
      return;
    }

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    events.value = data.items || [];
  } catch (err: any) {
    console.error('Lỗi lấy sự kiện:', err);
    errorMsg.value = 'Không thể tải sự kiện lịch. Hãy thử đồng bộ lại.';
  } finally {
    loading.value = false;
  }
};

// Year and Month navigation
const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const goToToday = () => {
  currentYear.value = new Date().getFullYear();
  currentMonth.value = new Date().getMonth();
  selectedDate.value = new Date();
};

// Dynamic calendar grid calculations
const calendarGrid = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  
  // First day of current month (0: CN, 1: T2, etc)
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  // Number of days in current month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Number of days in previous month
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: any[] = [];

  // Previous month placeholder days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateObj = new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, day);
    cells.push({
      day,
      isCurrentMonth: false,
      date: dateObj,
      key: `prev-${day}`
    });
  }

  // Current month active days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    cells.push({
      day,
      isCurrentMonth: true,
      isToday: isSameDate(dateObj, new Date()),
      date: dateObj,
      key: `curr-${day}`
    });
  }

  // Next month placeholder days to fill the 42 cells grid
  const remainingCells = 42 - cells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const dateObj = new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, day);
    cells.push({
      day,
      isCurrentMonth: false,
      date: dateObj,
      key: `next-${day}`
    });
  }

  return cells;
});

// Helper: compare dates safely
const isSameDate = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Find calendar events mapped to a specific cell
const getEventsForDay = (date: Date) => {
  return events.value.filter(event => {
    const startStr = event.start.dateTime || event.start.date;
    if (!startStr) return false;
    const startObj = new Date(startStr);
    return isSameDate(startObj, date);
  });
};

// List of events for the currently clicked/selected day
const selectedDayEvents = computed(() => {
  if (!selectedDate.value) return [];
  return getEventsForDay(selectedDate.value);
});

// Format time range for displaying event
const formatEventTime = (event: any) => {
  if (event.start.date) {
    return 'Cả ngày';
  }
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
};

// open event creation modal
const openCreateModal = (date?: Date) => {
  Object.assign(form, initialForm);
  
  let baseDate = date || selectedDate.value || new Date();
  
  // Set default hours: start at next hour, end start + 1 hour
  const now = new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  
  const start = new Date(year, month, day, now.getHours() + 1, 0, 0);
  const end = new Date(year, month, day, now.getHours() + 2, 0, 0);

  const formatToLocalValue = (d: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  form.startDateTime = formatToLocalValue(start);
  form.endDateTime = formatToLocalValue(end);
  isCreateModalOpen.value = true;
};

// Save a new Google Calendar event
const createEvent = async () => {
  if (!form.summary.trim() || !form.startDateTime || !form.endDateTime || submitLoading.value) return;

  submitLoading.value = true;
  try {
    const token = authStore.googleAccessToken;
    if (!token) throw new Error('Cần xác thực Google.');

    // Build attendees array
    const attendeesList = form.attendeesRaw
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => {
        // Simple regex verification
        return email.length > 5 && email.includes('@');
      })
      .map(email => ({ email }));

    // Core body parameters
    const startUTCStr = new Date(form.startDateTime).toISOString();
    const endUTCStr = new Date(form.endDateTime).toISOString();

    const body: any = {
      summary: form.summary.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      start: {
        dateTime: startUTCStr,
        timeZone: 'Asia/Ho_Chi_Minh'
      },
      end: {
        dateTime: endUTCStr,
        timeZone: 'Asia/Ho_Chi_Minh'
      }
    };

    if (attendeesList.length > 0) {
      body.attendees = attendeesList;
    }

    // Recurrence logic via RRULE matching parameters requested
    if (form.recurrenceFreq !== 'NONE') {
      const freq = form.recurrenceFreq; // DAILY, WEEKLY, MONTHLY
      const count = form.recurrenceCount;
      const rrule = `RRULE:FREQ=${freq};COUNT=${count || 10}`;
      body.recurrence = [rrule];
    }

    // append sendUpdates param if attendees are defined, to notify them via email
    const sendUpdatesOption = attendeesList.length > 0 ? '?sendUpdates=all' : '';
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events${sendUpdatesOption}`;

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Lỗi tạo lịch: ${errText || response.statusText}`);
    }

    isCreateModalOpen.value = false;
    fetchEvents();
  } catch (err: any) {
    console.error('Error creating event:', err);
    alert(`Không thể tạo sự kiện: ${err.message || err}`);
  } finally {
    submitLoading.value = false;
  }
};

// Delete Google Calendar event (supports single instance vs the whole recurrence series)
const deleteEvent = async (event: any, deleteAllChain = false) => {
  const actionNoun = deleteAllChain ? 'toàn bộ chuỗi sự kiện lặp lại này' : `sự kiện "${event.summary}"`;
  const confirmMsg = `Bạn có chắc chắn muốn xóa ${actionNoun}? Thao tác này sẽ xóa dữ liệu trực tiếp khỏi Google Calendar và không thể khôi phục.`;
  
  const confirmed = window.confirm(confirmMsg);
  if (!confirmed) return;

  loading.value = true;
  try {
    const token = authStore.googleAccessToken;
    if (!token) throw new Error('Chưa đăng nhập Google.');

    // If deleting the whole chain of a recurring instance, we delete the master recurring ID
    const deleteId = deleteAllChain ? event.recurringEventId : event.id;
    if (!deleteId) {
      throw new Error('Không tìm thấy mã ID sự kiện để thực hiện xóa.');
    }

    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${deleteId}?sendUpdates=all`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }

    // Refresh events after deletion
    await fetchEvents();
  } catch (err: any) {
    console.error('Lỗi khi xóa sự kiện:', err);
    alert(`Lỗi thực hiện xóa sự kiện: ${err.message || err}`);
  } finally {
    loading.value = false;
  }
};

// Refetch events whenever month/year changes
watch([currentYear, currentMonth], () => {
  fetchEvents();
});

onMounted(() => {
  fetchEvents();
});
</script>

<template>
  <div class="space-y-8" id="calendar-view">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-neutral-900 tracking-tight uppercase leading-none">Lịch làm việc</h1>
        <p class="text-neutral-500 mt-2 font-medium">Đồng bộ trực tiếp với tài khoản Google để phân công và theo dõi sự kiện dự án</p>
      </div>
      
      <!-- Connection Status indicator -->
      <div v-if="authStore.googleAccessToken" class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Đã liên kết Google Calendar</span>
        </div>
        <button 
          @click="fetchEvents" 
          :disabled="loading" 
          class="p-2.5 text-neutral-600 hover:text-neutral-900 bg-white rounded-xl border border-neutral-200/70 hover:border-neutral-300 shadow-sm active:scale-95 disabled:opacity-40 transition-all"
          title="Tải lại lịch"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- ONBOARDING - Login prompt when Google authentication is not yet fetched -->
    <div v-if="!authStore.googleAccessToken" class="max-w-3xl mx-auto bg-white border border-neutral-100 rounded-[2.5rem] shadow-xl p-10 md:p-14 text-center mt-6">
      <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <CalendarIcon :size="32" />
      </div>
      <h2 class="text-2xl font-black text-neutral-900 uppercase">Liên kết Google Calendar</h2>
      <p class="text-neutral-500 mt-3 text-sm font-bold max-w-lg mx-auto leading-relaxed">
        Để xem, tạo hoặc xóa các sự kiện & lịch làm việc của dự án, bạn cần liên kết tài khoản Google hiện tại với sự cho phép của người dùng.
      </p>

      <div v-if="errorMsg" class="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold text-xs max-w-md mx-auto flex items-center gap-3 justify-center">
        <AlertCircle :size="16" />
        <span>{{ errorMsg }}</span>
      </div>

      <div class="mt-10 flex flex-col items-center justify-center gap-4">
        <!-- Official styled Google Authentication Button as directed -->
        <button 
          @click="connectGoogle" 
          :disabled="loading"
          class="gsi-material-button min-w-[240px] shadow-md hover:shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          id="btn-connect-google-calendar"
        >
          <div class="gsi-material-button-state"></div>
          <div class="gsi-material-button-content-wrapper">
            <div class="gsi-material-button-icon">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span class="gsi-material-button-contents font-black uppercase text-xs tracking-wider">Đăng nhập tài khoản Google</span>
          </div>
        </button>
        
        <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Bắc buộc có quyền calendar.events để quản lý lịch</p>
      </div>
    </div>

    <!-- CALENDAR ACTIVE INTERFACE -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left side: The monthly calendar grid -->
      <div class="bg-white p-6 md:p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm lg:col-span-8 space-y-6">
        
        <!-- Controls & Month Name -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-xl md:text-2xl font-black text-neutral-900 uppercase tracking-tight">
              {{ monthNames[currentMonth] }}, {{ currentYear }}
            </h2>
          </div>
          
          <div class="flex items-center gap-1.5 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100">
            <button 
              @click="prevMonth" 
              class="p-2 text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-50 rounded-xl transition-all border border-transparent hover:border-neutral-200"
              title="Tháng trước"
            >
              <ChevronLeft :size="16" />
            </button>
            <button 
              @click="goToToday" 
              class="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 rounded-xl transition-all border border-neutral-200 shadow-sm"
            >
              Hôm nay
            </button>
            <button 
              @click="nextMonth" 
              class="p-2 text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-50 rounded-xl transition-all border border-transparent hover:border-neutral-200"
              title="Tháng sau"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="p-4 bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AlertCircle :size="16" />
            <span>{{ errorMsg }}</span>
          </div>
          <button @click="connectGoogle" class="text-[10px] font-black underline uppercase tracking-wider">Đăng nhập lại</button>
        </div>

        <!-- Monthly Grid -->
        <div class="relative">
          <div v-if="loading" class="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-3xl">
            <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
              <Loader2 class="animate-spin" :size="18" />
              <span>Đang đồng bộ...</span>
            </div>
          </div>

          <!-- Day labels -->
          <div class="grid grid-cols-7 gap-1 text-center mb-2">
            <span 
              v-for="day in daysOfWeek" 
              :key="day" 
              class="text-[10px] font-black uppercase tracking-wider"
              :class="day === 'CN' ? 'text-red-500' : 'text-neutral-400'"
            >
              {{ day }}
            </span>
          </div>

          <!-- 42 Cell Grid -->
          <div class="grid grid-cols-7 gap-2">
            <div 
              v-for="cell in calendarGrid" 
              :key="cell.key"
              @click="selectedDate = cell.date"
              class="aspect-square p-2 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none group relative py-3"
              :class="[
                cell.isCurrentMonth ? 'bg-white hover:bg-neutral-50/30' : 'bg-neutral-50/40 text-neutral-300 border-neutral-100 hover:bg-neutral-50',
                selectedDate && isSameDate(cell.date, selectedDate) 
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm bg-blue-50/5' 
                  : 'border-neutral-100 hover:border-blue-300',
                cell.isToday && !(selectedDate && isSameDate(cell.date, selectedDate)) ? 'bg-blue-50/20 border-blue-200' : ''
              ]"
            >
              <!-- Day Number Header Row -->
              <div class="flex items-center justify-between w-full">
                <span 
                  class="text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150"
                  :class="[
                    cell.isToday
                      ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                      : selectedDate && isSameDate(cell.date, selectedDate)
                        ? 'bg-neutral-900 text-white font-extrabold shadow-sm'
                        : 'text-neutral-800 group-hover:bg-neutral-100',
                    cell.key.startsWith('prev') || cell.key.startsWith('next') ? 'opacity-30' : ''
                  ]"
                >
                  {{ cell.day }}
                </span>
                
                <!-- Dot indicator for active event load -->
                <span 
                  v-if="getEventsForDay(cell.date).length > 0" 
                  class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-0.5"
                ></span>
              </div>

              <!-- Live events indicators matching Google Calendar -->
              <div class="flex flex-col gap-1 mt-1.5 overflow-hidden w-full pointer-events-none">
                <div 
                  v-for="(ev, index) in getEventsForDay(cell.date).slice(0, 2)" 
                  :key="ev.id || index"
                  class="rounded px-2 py-0.5 w-full truncate text-[8px] md:text-[9px] font-bold border-l-2 bg-blue-50/80 text-blue-700 border-blue-500 shadow-sm leading-tight block"
                >
                  {{ ev.summary || '(Chưa đặt tiêu đề)' }}
                </div>
                
                <!-- More counter indicators -->
                <span 
                  v-if="getEventsForDay(cell.date).length > 2" 
                  class="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest pl-1 mt-0.5 block"
                >
                  +{{ getEventsForDay(cell.date).length - 2 }} lịch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side: Details & Daily Scheduling events -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- Header status for selection -->
        <div class="bg-white p-6 md:p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b border-neutral-50 pb-4">
            <div>
              <span class="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">Ngày đang chọn</span>
              <h3 class="text-lg font-black text-neutral-900 uppercase">
                {{ selectedDate ? `${selectedDate.getDate()} THG ${selectedDate.getMonth() + 1}` : 'Chưa chọn ngày' }}
              </h3>
            </div>
            
            <button 
              @click="openCreateModal()"
              class="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              id="btn-add-event-drawer"
            >
              <Plus :size="14" />
              <span>Tạo sự kiện</span>
            </button>
          </div>

          <!-- Empty daily state -->
          <div v-if="selectedDayEvents.length === 0" class="text-center py-10 space-y-3">
            <div class="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto border border-dashed border-neutral-200">
              <CalendarIcon :size="20" />
            </div>
            <p class="text-neutral-500 text-xs font-bold">Không có sự kiện nào được lên lịch</p>
            <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Bấm vào nút "Tạo sự kiện" để lên lịch</p>
          </div>

          <!-- Active events roster list -->
          <div v-else class="space-y-4">
            <div 
              v-for="event in selectedDayEvents" 
              :key="event.id" 
              class="p-5 border border-neutral-100 rounded-3xl bg-neutral-50/50 hover:bg-white hover:border-blue-200 hover:shadow-sm duration-200 transition-all flex flex-col justify-between gap-4 group/item"
            >
              <div class="space-y-2">
                <!-- Preset indicators / flags -->
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="px-2 py-0.5 bg-blue-50 border border-blue-100/50 rounded-lg text-[8px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Clock :size="10" />
                    <span>{{ formatEventTime(event) }}</span>
                  </span>
                  
                  <span 
                    v-if="event.recurringEventId || event.recurrence"
                    class="px-2 py-0.5 bg-purple-50 border border-purple-100/50 rounded-lg text-[8px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1"
                  >
                    <Repeat :size="10" />
                    <span>Lặp lại</span>
                  </span>
                </div>

                <!-- Event Title and Description -->
                <h4 class="font-black text-neutral-800 text-sm uppercase leading-snug break-words">
                  {{ event.summary || '(Không có tiêu đề)' }}
                </h4>
                
                <p v-if="event.description" class="text-[11px] text-neutral-500 font-bold leading-relaxed break-words whitespace-pre-line">
                  {{ event.description }}
                </p>

                <!-- Location details if specified -->
                <div v-if="event.location" class="flex items-center gap-1.5 text-neutral-400 mt-1">
                  <MapPin :size="12" class="text-neutral-400" />
                  <span class="text-[10px] font-bold truncate">{{ event.location }}</span>
                </div>

                <!-- Attendees / Invitees list -->
                <div v-if="event.attendees && event.attendees.length > 0" class="pt-3 border-t border-neutral-200/50">
                  <span class="block text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Khách mời đã mời:</span>
                  <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    <span 
                      v-for="at in event.attendees" 
                      :key="at.email" 
                      class="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px] font-bold text-neutral-600 max-w-full truncate block"
                      :title="at.email + ' (' + (at.responseStatus || 'Chưa trả lời') + ')'"
                    >
                      👤 {{ at.displayName || at.email.split('@')[0] }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action button section: explicit deletion conforming to guidelines -->
              <div class="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <a 
                  :href="event.htmlLink" 
                  target="_blank" 
                  class="text-[9px] font-black text-neutral-400 hover:text-neutral-600 uppercase tracking-widest flex items-center gap-1"
                >
                  <span>Mở Google Calendar</span>
                  <ExternalLink :size="10" />
                </a>

                <!-- Custom Delete triggers with user confirmations -->
                <div class="flex gap-2">
                  <!-- Instance delete -->
                  <button 
                    @click="deleteEvent(event, false)" 
                    class="p-2 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-xl transition-colors border border-transparent hover:border-neutral-200"
                    title="Xóa sự kiện này"
                  >
                    <Trash2 :size="13" />
                  </button>

                  <!-- Recurrence whole chain delete option (if applicable) -->
                  <button 
                    v-if="event.recurringEventId"
                    @click="deleteEvent(event, true)" 
                    class="px-2.5 py-1 text-[8px] font-black text-purple-600 bg-purple-50 hover:bg-purple-100 border border-transparent hover:border-purple-200 rounded-lg flex items-center gap-1 uppercase transition-all"
                    title="Xóa toàn bộ chuỗi lặp lại"
                  >
                    <Repeat :size="10" />
                    <span>Xóa chuỗi lặp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- CREATE EVENT MODAL DIALOG CONTAINER -->
    <div v-if="isCreateModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4" id="modal-create-event">
      <div @click="isCreateModalOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 animate-in zoom-in duration-300 overflow-y-auto max-h-[92vh]">
        
        <button 
          @click="isCreateModalOpen = false" 
          class="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <X :size="16" />
        </button>

        <h2 class="text-2xl font-black text-neutral-900 uppercase mb-6 border-b border-neutral-100 pb-4 text-center">
          Tạo sự kiện mới
        </h2>

        <div class="space-y-5">
          <!-- Event Summary -->
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tiêu đề sự kiện *</label>
            <input 
              v-model="form.summary" 
              type="text" 
              placeholder="VD: Họp giao ban tiến độ, Nghiệm thu vật tư..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
              id="input-event-summary"
            />
          </div>

          <!-- Locations -->
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Địa điểm thi công / Tổ chức</label>
            <input 
              v-model="form.location" 
              type="text" 
              placeholder="VD: Phòng họp tâng 3, Công trường Giai Lạc..."
              class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-sm" 
            />
          </div>

          <!-- Dates and Times -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Thời gian bắt đầu *</label>
              <input 
                v-model="form.startDateTime" 
                type="datetime-local" 
                class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-xs" 
              />
            </div>
            <div>
              <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Thời gian kết thúc *</label>
              <input 
                v-model="form.endDateTime" 
                type="datetime-local" 
                class="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-xs" 
              />
            </div>
          </div>

          <!-- Recurrence Rules with custom rrule selection -->
          <div class="p-4 bg-neutral-50/70 border border-neutral-100 rounded-2xl space-y-3">
            <label class="block text-[10px] font-black text-neutral-500 uppercase tracking-widest font-bold">Lặp lại sự kiện</label>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                type="button" 
                v-for="freq in ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']"
                :key="freq"
                @click="form.recurrenceFreq = freq"
                class="py-2.5 rounded-xl border text-[9px] font-black uppercase text-center transition-all"
                :class="[
                  form.recurrenceFreq === freq 
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                ]"
              >
                {{ freq === 'NONE' ? 'Một lần' : freq === 'DAILY' ? 'Hàng ngày' : freq === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng' }}
              </button>
            </div>

            <!-- Limit count choice if recurrence active -->
            <div v-if="form.recurrenceFreq !== 'NONE'" class="pt-2 flex items-center justify-between">
              <label class="text-[9px] font-bold text-neutral-500 uppercase">Số lần lặp tối đa:</label>
              <input 
                v-model.number="form.recurrenceCount"
                type="number" 
                min="1" 
                max="100" 
                class="w-20 h-9 px-2 bg-white border border-neutral-200 rounded-lg text-center font-bold text-xs" 
              />
            </div>
          </div>

          <!-- Guests invitation section allowing mailing alerts -->
          <div>
            <label class="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Mời khách tham dự (Tự động gửi mail)</label>
            <textarea 
              v-model="form.attendeesRaw" 
              rows="2" 
              placeholder="Nhập danh sách email khách, phân cách bằng dấu phẩy hoặc dòng mới..."
              class="w-full p-3 bg-neutral-50 border border-neutral-100 rounded-xl font-bold outline-none focus:border-blue-500 transition-all text-neutral-800 text-xs placeholder:text-neutral-400"
            ></textarea>
            <p class="text-[9px] text-neutral-400 mt-1 italic font-medium leading-tight">
              * Hệ thống sẽ tự động gửi email thông báo trực tiếp từ Google Lịch khi chọn "Lưu sự kiện".
            </p>
          </div>

          <!-- Actions submits -->
          <div class="flex gap-3 pt-4 border-t border-neutral-100">
            <button 
              type="button"
              @click="isCreateModalOpen = false"
              class="flex-1 py-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-600 transition-all active:scale-95"
            >
              Hủy bỏ
            </button>
            <button 
              type="button"
              @click="createEvent"
              :disabled="submitLoading || !form.summary.trim() || !form.startDateTime || !form.endDateTime"
              class="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              id="btn-create-event-submit"
            >
              <Loader2 v-if="submitLoading" class="animate-spin" :size="14" />
              <span>Lưu sự kiện</span>
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* CSS Reset variables override if required */

/* Elegant standard Google Auth button style in alignment with setup guidelines */
.gsi-material-button {
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: WHITE;
  background-image: none;
  border: 1px solid #747775;
  -webkit-border-radius: 2.5rem;
  border-radius: 2.5rem;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  -transition: background-color .218s, border-color .218s, box-shadow .218s;
  transition: background-color .218s, border-color .218s, box-shadow .218s;
  vertical-align: middle;
  white-space: nowrap;
  width: auto;
  clear: both;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gsi-material-button .gsi-material-button-icon {
  height: 20px;
  min-width: 20px;
  width: 20px;
  margin-right: 12px;
}

.gsi-material-button .gsi-material-button-content-wrapper {
  -align-items: center;
  align-items: center;
  display: flex;
  -flex-direction: row;
  flex-direction: row;
  -flex-wrap: nowrap;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: center;
  position: relative;
  width: 100%;
}

.gsi-material-button .gsi-material-button-contents {
  -flex-grow: 1;
  flex-grow: 1;
  font-family: inherit;
  font-weight: 5200;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}

.gsi-material-button .gsi-material-button-state {
  -webkit-transition: opacity .218s;
  transition: opacity .218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.gsi-material-button:hover {
  -webkit-box-shadow: 0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15);
  box-shadow: 0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15);
}

.gsi-material-button:hover .gsi-material-button-state {
  background-color: #303030;
  opacity: 0.04;
}

.gsi-material-button:focus .gsi-material-button-state {
  background-color: #303030;
  opacity: 0.12;
}

.gsi-material-button:active .gsi-material-button-state {
  background-color: #303030;
  opacity: 0.10;
}
</style>
