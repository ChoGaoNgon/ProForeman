# Upload Excel Danh muc Vat tu - Design Spec

## Muc tieu

Them chuc nang upload file Excel vao man hinh **Danh muc Vat tu** (`MaterialItemsView.vue`) de nguoi dung co the nhap hang loat vat tu thay vi them tung item thu cong.

## Luong hoat dong

1. User bam nut **"NHAP TU EXCEL"** (dat canh nut "THEM VAT TU MOI" trong header)
2. Mo modal upload voi 2 khu vuc:
   - Nut **"TAI FILE MAU"** — download file `.xlsx` template co san 4 cot header
   - Khu vuc keo tha / chon file Excel (`.xlsx`, `.xls`)
3. Sau khi chon file:
   - Parse Excel phia client bang thu vien SheetJS
   - Hien thi **bang preview** trong modal
   - Cac dong trung ma/ten voi DB: highlight vang, label "Se ghi de"
   - Cac dong loi (thieu ten, du lieu sai): highlight do
   - Hien thi tong ket: X dong moi, Y dong ghi de, Z dong loi
4. User bam **"XAC NHAN NHAP"** → luu vao Firestore
5. Dong modal, danh sach vat tu tu dong cap nhat

## Cau truc file Excel

| Cot | Ten cot header | Bat buoc | Mo ta |
|-----|---------------|----------|-------|
| A   | Ten vat tu    | Co       | Ten vat tu quy chuan |
| B   | Ma vat tu     | Khong    | Ma SKU / quy uoc |
| C   | Don vi        | Co       | Don vi mac dinh (kg, tan, khoi...) |
| D   | Don gia (VND) | Khong    | Don gia tham khao, mac dinh 0 |

## Xu ly trung lap

- So sanh theo `code` (uu tien) hoac `name` (neu khong co code)
- Dong trung → ghi de toan bo 4 truong (update document hien tai trong Firestore)
- Dong moi → tao document moi

## Validation

- Dong khong co `name` → danh dau loi, khong cho import
- Dong khong co `default_unit` → danh dau loi
- `default_unit_price` khong phai so → danh dau loi
- Dong loi se hien thi trong preview nhung khong duoc import

## Thanh phan ky thuat

### Thu vien
- **SheetJS (`xlsx`)** — parse Excel phia client va generate file template
- Khong can backend, xu ly hoan toan tren browser

### File can thay doi
- `src/views/MaterialItemsView.vue` — them nut "NHAP TU EXCEL", them modal upload/preview
- `package.json` — them dependency `xlsx`

### Template download
- Generate file `.xlsx` bang SheetJS khi user bam "TAI FILE MAU"
- File co 1 sheet voi 4 cot header va 1 dong du lieu mau

### Modal Upload UI
- Reuse style tu modal them vat tu hien tai (rounded-3rem, shadow-2xl, etc.)
- Trang thai modal: `idle` → `previewing` → `importing`
- Bang preview giong bang danh muc chinh, them cot **Trang thai** (Moi / Ghi de / Loi)
- Nut "XAC NHAN NHAP" chi enable khi co it nhat 1 dong hop le
- Hien thi loading + disable nut khi dang import

### Firestore operations
- Dong moi: `appStore.saveEntity('material_items', 'CREATE', payload)`
- Dong ghi de: `appStore.saveEntity('material_items', 'UPDATE', { ...payload, id: existingId })`
- Xu ly tuan tu de tranh rate limit

## Pham vi ngoai scope

- Khong ho tro file CSV (chi Excel)
- Khong ho tro mapping cot dong (cot co dinh theo thu tu A-D)
- Khong ho tro export danh muc ra Excel (co the lam sau)
