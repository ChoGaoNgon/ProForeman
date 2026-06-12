# Excel Upload Material Items - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel file upload to the Material Items catalog screen so users can bulk-import materials instead of adding them one by one.

**Architecture:** Parse Excel client-side using SheetJS, preview rows with validation/duplicate detection in a modal, then save to Firestore on confirmation. Template download also generated client-side via SheetJS.

**Tech Stack:** SheetJS (`xlsx`), Vue 3 Composition API, Tailwind CSS, Firebase Firestore (via existing `appStore.saveEntity`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add `xlsx` dependency |
| `src/views/MaterialItemsView.vue` | Modify | Add upload button, import modal, template download, preview table, import logic |

This is a single-file feature addition. All logic lives in `MaterialItemsView.vue` since it's a self-contained enhancement to the existing view (consistent with the codebase pattern where each view is one file).

---

### Task 1: Install SheetJS dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install xlsx package**

Run:
```bash
npm install xlsx
```

- [ ] **Step 2: Verify installation**

Run:
```bash
node -e "const XLSX = require('xlsx'); console.log('SheetJS version:', XLSX.version)"
```
Expected: Prints SheetJS version number without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx (SheetJS) dependency for Excel import"
```

---

### Task 2: Add Upload Excel button to header

**Files:**
- Modify: `src/views/MaterialItemsView.vue:1-15` (script imports)
- Modify: `src/views/MaterialItemsView.vue:183-203` (header buttons area)

- [ ] **Step 1: Add new imports and state**

At the top of the `<script setup>` block, add the `FileUp` icon import and new reactive state:

```ts
// Add FileUp to the lucide imports (line 3-15):
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
  RotateCcw,
  FileUp,
  Download,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-vue-next';
```

After the existing `seedLoading` ref (line 23), add:

```ts
// Excel Upload States
const isUploadModalOpen = ref(false);
const uploadStep = ref<'idle' | 'previewing' | 'importing'>('idle');
const uploadFile = ref<File | null>(null);
const previewRows = ref<Array<{
  name: string;
  code: string;
  default_unit: string;
  default_unit_price: number;
  status: 'new' | 'overwrite' | 'error';
  errorMsg?: string;
  existingId?: string;
}>>([]);
const importLoading = ref(false);
```

- [ ] **Step 2: Add the Upload button in the template header**

In the header buttons area (around line 183-203), add a new button between the seed button and the "THEM VAT TU MOI" button:

```html
<!-- Import from Excel button -->
<button
  @click="isUploadModalOpen = true; uploadStep = 'idle'; previewRows = []; uploadFile = null;"
  class="h-14 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
>
  <FileUp :size="16" />
  <span>NHAP TU EXCEL</span>
</button>
```

- [ ] **Step 3: Verify the app compiles**

Run:
```bash
npm run dev
```
Expected: App starts without errors on port 3000. The green "NHAP TU EXCEL" button appears next to "THEM VAT TU MOI".

- [ ] **Step 4: Commit**

```bash
git add src/views/MaterialItemsView.vue
git commit -m "feat(materials): add upload Excel button to header"
```

---

### Task 3: Implement template download function

**Files:**
- Modify: `src/views/MaterialItemsView.vue` (script section)

- [ ] **Step 1: Add xlsx import and template download function**

At the top of the `<script setup>` block, after the lucide imports, add:

```ts
import * as XLSX from 'xlsx';
```

After the `handleSeedSamples` function (around line 163), add:

```ts
// Download Excel template
const handleDownloadTemplate = () => {
  const headers = ['Ten vat tu', 'Ma vat tu', 'Don vi', 'Don gia (VND)'];
  const sampleRow = ['Xi mang Ha Tien PC40', 'XM-HT-PC40', 'bao', 92000];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Ten vat tu
    { wch: 18 }, // Ma vat tu
    { wch: 15 }, // Don vi
    { wch: 18 }, // Don gia
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh muc vat tu');
  XLSX.writeFile(wb, 'mau-danh-muc-vat-tu.xlsx');
};
```

- [ ] **Step 2: Verify the app compiles**

Run:
```bash
npm run dev
```
Expected: No compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/MaterialItemsView.vue
git commit -m "feat(materials): add Excel template download function"
```

---

### Task 4: Implement Excel parsing and validation logic

**Files:**
- Modify: `src/views/MaterialItemsView.vue` (script section)

- [ ] **Step 1: Add file parsing and validation function**

After the `handleDownloadTemplate` function, add:

```ts
// Parse uploaded Excel file
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadFile.value = file;

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Skip header row (first row)
    const dataRows = rawRows.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

    const existingItems = appStore.material_items || [];

    const parsed = dataRows.map(row => {
      const name = String(row[0] || '').trim();
      const code = String(row[1] || '').trim().toUpperCase();
      const default_unit = String(row[2] || '').trim();
      const rawPrice = row[3];
      const default_unit_price = Number(rawPrice) || 0;

      // Validation
      if (!name) {
        return { name, code, default_unit, default_unit_price, status: 'error' as const, errorMsg: 'Thieu ten vat tu' };
      }
      if (!default_unit) {
        return { name, code, default_unit, default_unit_price, status: 'error' as const, errorMsg: 'Thieu don vi' };
      }
      if (rawPrice !== undefined && rawPrice !== '' && isNaN(Number(rawPrice))) {
        return { name, code, default_unit, default_unit_price: 0, status: 'error' as const, errorMsg: 'Don gia khong hop le' };
      }

      // Check duplicates: match by code first, then by name
      let existing: any = null;
      if (code) {
        existing = existingItems.find((item: any) => (item.code || '').toUpperCase() === code);
      }
      if (!existing) {
        existing = existingItems.find((item: any) => (item.name || '').toLowerCase() === name.toLowerCase());
      }

      if (existing) {
        return { name, code, default_unit, default_unit_price, status: 'overwrite' as const, existingId: existing.id };
      }

      return { name, code, default_unit, default_unit_price, status: 'new' as const };
    });

    previewRows.value = parsed;
    uploadStep.value = 'previewing';
  } catch (err) {
    console.error('Loi khi doc file Excel:', err);
    alert('Khong the doc file Excel. Vui long kiem tra lai dinh dang file.');
  }

  // Reset file input so same file can be re-selected
  target.value = '';
};
```

- [ ] **Step 2: Verify the app compiles**

Run:
```bash
npm run dev
```
Expected: No compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/MaterialItemsView.vue
git commit -m "feat(materials): add Excel file parsing and validation logic"
```

---

### Task 5: Implement import-to-Firestore function

**Files:**
- Modify: `src/views/MaterialItemsView.vue` (script section)

- [ ] **Step 1: Add the import confirmation handler**

After the `handleFileUpload` function, add:

```ts
// Import validated rows to Firestore
const handleConfirmImport = async () => {
  const validRows = previewRows.value.filter(r => r.status !== 'error');
  if (validRows.length === 0) return;

  importLoading.value = true;
  uploadStep.value = 'importing';

  try {
    for (const row of validRows) {
      const payload = {
        name: row.name,
        code: row.code,
        default_unit: row.default_unit,
        default_unit_price: row.default_unit_price
      };

      if (row.status === 'overwrite' && row.existingId) {
        await appStore.saveEntity('material_items', 'UPDATE', { ...payload, id: row.existingId });
      } else {
        await appStore.saveEntity('material_items', 'CREATE', payload);
      }
    }

    isUploadModalOpen.value = false;
  } catch (err) {
    console.error('Loi khi nhap vat tu tu Excel:', err);
    alert('Co loi xay ra khi nhap du lieu. Vui long thu lai.');
  } finally {
    importLoading.value = false;
    uploadStep.value = 'idle';
  }
};

// Preview summary counts
const previewSummary = computed(() => {
  const rows = previewRows.value;
  return {
    total: rows.length,
    newCount: rows.filter(r => r.status === 'new').length,
    overwriteCount: rows.filter(r => r.status === 'overwrite').length,
    errorCount: rows.filter(r => r.status === 'error').length,
    validCount: rows.filter(r => r.status !== 'error').length
  };
});
```

- [ ] **Step 2: Verify the app compiles**

Run:
```bash
npm run dev
```
Expected: No compilation errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/MaterialItemsView.vue
git commit -m "feat(materials): add Firestore import handler and preview summary"
```

---

### Task 6: Build the upload modal UI

**Files:**
- Modify: `src/views/MaterialItemsView.vue` (template section)

- [ ] **Step 1: Add the upload modal template**

At the end of the template (before the closing `</div>` of the root element, after the existing edit/create modal around line 440), add:

{% raw %}
```html
<!-- Excel Upload Modal -->
<div v-if="isUploadModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
  <div @click="isUploadModalOpen = false" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"></div>

  <div class="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto p-10 lg:p-12 animate-in zoom-in duration-300">
    <button @click="isUploadModalOpen = false" class="absolute top-8 right-8 p-1.5 hover:bg-neutral-200 rounded-full transition-colors z-10 cursor-pointer">
      <X :size="20" class="text-neutral-400" />
    </button>

    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h2 class="text-3xl font-black text-neutral-900 uppercase leading-none">
          NHAP VAT TU TU EXCEL
        </h2>
        <p class="text-neutral-500 mt-2 font-bold text-xs uppercase tracking-widest">
          Upload file Excel de nhap hang loat vat tu vao danh muc
        </p>
      </div>

      <!-- Step 1: Upload area (idle) -->
      <div v-if="uploadStep === 'idle'" class="space-y-6">
        <!-- Download template -->
        <button
          @click="handleDownloadTemplate"
          class="w-full p-5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex items-center gap-4 transition-all cursor-pointer group"
        >
          <div class="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-all">
            <Download :size="20" class="text-blue-600" />
          </div>
          <div class="text-left">
            <p class="font-black text-sm text-blue-800 uppercase">TAI FILE MAU</p>
            <p class="text-xs font-semibold text-blue-600/70 mt-0.5">Download file Excel mau voi 4 cot: Ten vat tu, Ma vat tu, Don vi, Don gia</p>
          </div>
        </button>

        <!-- Upload area -->
        <label class="block w-full p-12 border-2 border-dashed border-neutral-200 hover:border-blue-400 rounded-2xl text-center cursor-pointer transition-all hover:bg-blue-50/30 group">
          <input
            type="file"
            accept=".xlsx,.xls"
            @change="handleFileUpload"
            class="hidden"
          />
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 bg-neutral-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-all">
              <FileSpreadsheet :size="28" class="text-neutral-400 group-hover:text-blue-500" />
            </div>
            <div>
              <p class="font-black text-sm text-neutral-700 uppercase">Chon file hoac keo tha vao day</p>
              <p class="text-xs font-semibold text-neutral-400 mt-1">Ho tro dinh dang .xlsx, .xls</p>
            </div>
          </div>
        </label>
      </div>

      <!-- Step 2: Preview table -->
      <div v-if="uploadStep === 'previewing' || uploadStep === 'importing'" class="space-y-6">
        <!-- Summary badges -->
        <div class="flex flex-wrap gap-3">
          <span class="px-4 py-2 bg-neutral-100 rounded-xl text-xs font-black uppercase text-neutral-600">
            Tong: {{ previewSummary.total }} dong
          </span>
          <span class="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black uppercase text-emerald-700">
            Moi: {{ previewSummary.newCount }}
          </span>
          <span class="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black uppercase text-amber-700">
            Ghi de: {{ previewSummary.overwriteCount }}
          </span>
          <span v-if="previewSummary.errorCount > 0" class="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-black uppercase text-red-700">
            Loi: {{ previewSummary.errorCount }}
          </span>
        </div>

        <!-- Preview table -->
        <div class="border border-neutral-100 rounded-2xl overflow-hidden">
          <div class="overflow-x-auto max-h-[40vh]">
            <table class="w-full border-collapse text-left">
              <thead class="sticky top-0 bg-white z-10">
                <tr class="border-b border-neutral-100">
                  <th class="px-5 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Trang thai</th>
                  <th class="px-5 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ten vat tu</th>
                  <th class="px-5 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Ma vat tu</th>
                  <th class="px-5 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Don vi</th>
                  <th class="px-5 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Don gia (VND)</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in previewRows"
                  :key="idx"
                  :class="{
                    'bg-amber-50/50': row.status === 'overwrite',
                    'bg-red-50/50': row.status === 'error'
                  }"
                  class="border-b border-neutral-50 last:border-0"
                >
                  <td class="px-5 py-3">
                    <span v-if="row.status === 'new'" class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">Moi</span>
                    <span v-else-if="row.status === 'overwrite'" class="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase">Ghi de</span>
                    <span v-else class="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase" :title="row.errorMsg">Loi</span>
                  </td>
                  <td class="px-5 py-3 text-sm font-extrabold text-neutral-900">{{ row.name || '—' }}</td>
                  <td class="px-5 py-3 text-xs font-bold text-neutral-500 uppercase">{{ row.code || '—' }}</td>
                  <td class="px-5 py-3 text-xs font-bold text-neutral-500">{{ row.default_unit || '—' }}</td>
                  <td class="px-5 py-3 text-right text-sm font-black text-emerald-600">
                    {{ row.default_unit_price ? formatCurrency(row.default_unit_price) : '0 ₫' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Error details -->
        <div v-if="previewSummary.errorCount > 0" class="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
          <AlertTriangle :size="16" class="text-red-500 shrink-0 mt-0.5" />
          <p class="text-xs font-semibold text-red-700">
            {{ previewSummary.errorCount }} dong co loi se bi bo qua khi nhap. Chi cac dong hop le moi duoc luu vao he thong.
          </p>
        </div>

        <!-- Action buttons -->
        <div class="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
          <button
            type="button"
            @click="uploadStep = 'idle'; previewRows = [];"
            :disabled="importLoading"
            class="px-5 py-3 border border-neutral-200 text-neutral-500 rounded-2xl font-bold text-xs uppercase hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50"
          >
            CHON FILE KHAC
          </button>
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="isUploadModalOpen = false"
              :disabled="importLoading"
              class="px-5 py-3 border border-neutral-200 text-neutral-500 rounded-2xl font-bold text-xs uppercase hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50"
            >
              HUY BO
            </button>
            <button
              type="button"
              @click="handleConfirmImport"
              :disabled="importLoading || previewSummary.validCount === 0"
              class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <span v-if="importLoading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
              <span>{{ importLoading ? 'DANG NHAP...' : `XAC NHAN NHAP (${previewSummary.validCount})` }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```
{% endraw %}

- [ ] **Step 2: Verify the app compiles and modal works**

Run:
```bash
npm run dev
```
Expected: Click "NHAP TU EXCEL" opens the upload modal. "TAI FILE MAU" downloads an Excel file. Selecting an Excel file shows preview table.

- [ ] **Step 3: Commit**

```bash
git add src/views/MaterialItemsView.vue
git commit -m "feat(materials): add Excel upload modal with preview and import"
```

---

### Task 7: Manual end-to-end verification

- [ ] **Step 1: Download and fill template**

1. Open the app at `http://localhost:3000`
2. Navigate to "Danh muc Vat tu"
3. Click "NHAP TU EXCEL"
4. Click "TAI FILE MAU" — verify `mau-danh-muc-vat-tu.xlsx` downloads
5. Open the file — verify 4 columns with 1 sample row

- [ ] **Step 2: Test upload with valid data**

1. Add 3-5 rows of material data in the template
2. Upload the file
3. Verify preview table shows all rows with "Moi" status
4. Click "XAC NHAN NHAP"
5. Verify materials appear in the main catalog list

- [ ] **Step 3: Test duplicate detection**

1. Upload the same file again
2. Verify all rows now show "Ghi de" status (yellow highlight)
3. Confirm import — verify existing items are updated (not duplicated)

- [ ] **Step 4: Test validation**

1. Create a file with some rows missing "Ten vat tu" or "Don vi"
2. Upload — verify those rows show "Loi" status (red highlight)
3. Verify the error summary message appears
4. Confirm import — verify only valid rows are imported

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(materials): complete Excel upload feature for material catalog"
```
