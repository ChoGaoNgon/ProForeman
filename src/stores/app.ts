import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/services/firebase';

import { useAuthStore } from '@/stores/auth';

const ENTITIES = ['departments', 'employees', 'project_roles', 'projects', 'payments', 'project_assignments'];

export const useAppStore = defineStore('app', {
  state: () => ({
    departments: [] as any[],
    employees: [] as any[],
    project_roles: [] as any[],
    projects: [] as any[],
    payments: [] as any[],
    reports: [] as any[],
    project_assignments: [] as any[],
    isInitialLoad: true,
    isLoading: false
  }),
  getters: {
    // Provide backward compatibility for names if needed, or update consumers
    projectRoles: (state) => state.project_roles,
    
    visibleProjects: (state) => {
      const authStore = useAuthStore();
      if (!authStore.user) return [];
      if (authStore.isAdmin) return state.projects;
      
      const myAssignments = state.project_assignments.filter(a => a.employee_id === authStore.user!.id);
      const myProjectIds = myAssignments.map(a => a.project_id);
      return state.projects.filter(p => myProjectIds.includes(p.id));
    },

    visiblePayments: (state) => {
      const authStore = useAuthStore();
      if (!authStore.user) return [];
      if (authStore.isAdmin) return state.payments;
      
      const myAssignments = state.project_assignments.filter(a => a.employee_id === authStore.user!.id);
      
      // Filter project IDs where the user has a management role
      const manageableProjectIds = myAssignments
        .filter(assignment => {
          const role = state.project_roles.find(r => r.id === assignment.project_role_id);
          if (!role) return false;
          const name = (role.name || '').toLowerCase();
          const code = (role.code || '').toLowerCase();
          return name.includes('chỉ huy trưởng') || 
                 name.includes('bch') || 
                 name.includes('kế toán') ||
                 code.includes('cht') ||
                 code.includes('kt');
        })
        .map(a => a.project_id);
        
      return state.payments.filter(p => manageableProjectIds.includes(p.project_id));
    },

    visibleReports: (state) => {
      const authStore = useAuthStore();
      if (!authStore.user) return [];
      if (authStore.isAdmin) return state.reports;
      
      const myAssignments = state.project_assignments.filter(a => a.employee_id === authStore.user!.id);
      const myProjectIds = myAssignments.map(a => a.project_id);
      return state.reports.filter(r => myProjectIds.includes(r.project_id));
    },

    hasAnyPaymentAccess() {
      const authStore = useAuthStore();
      if (authStore.isAdmin) return true;
      
      // Check if user has management role in ANY assigned project
      return this.visibleProjects.some(p => this.canManageProject(p.id));
    }
  },
  actions: {
    canManageProject(projectId: string) {
      const authStore = useAuthStore();
      if (authStore.isAdmin) return true;
      
      const assignment = this.project_assignments.find(a => 
        a.project_id === projectId && a.employee_id === authStore.user?.id
      );
      if (!assignment) return false;
      
      const role = this.project_roles.find(r => r.id === assignment.project_role_id);
      if (!role) return false;
      
      const name = (role.name || '').toLowerCase();
      const code = (role.code || '').toLowerCase();
      
      // CHỈ HUY TRƯỞNG(BCH) or Kế Toán
      return name.includes('chỉ huy trưởng') || 
             name.includes('bch') || 
             name.includes('kế toán') ||
             code.includes('cht') ||
             code.includes('kt');
    },

    async init() {
      await this.refreshAll();
      this.isInitialLoad = false;
    },

    async clearMemory() {
      this.departments = [];
      this.employees = [];
      this.project_roles = [];
      this.projects = [];
      this.payments = [];
      this.reports = [];
      this.isInitialLoad = true;
    },

    async refreshAll() {
      this.isLoading = true;
      try {
        const results = await Promise.all(ENTITIES.map(async (entity) => {
          const q = query(collection(db, entity));
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          return { entity, data };
        }));

        results.forEach(({ entity, data }) => {
          (this as any)[entity] = data;
        });

        // Apply filters
        this.departments = this.departments.filter(d => d.is_deleted !== 1);
        this.employees = this.employees.filter(e => e.is_active !== 0 && e.is_active !== false);
        this.project_roles = this.project_roles.filter(r => r.is_deleted !== 1);
        this.projects = this.projects.filter(p => p.is_deleted !== 1);
        this.project_assignments = this.project_assignments.filter(a => a.is_deleted !== 1);
        this.payments = this.payments.filter(p => p.is_deleted !== 1).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
        this.reports = this.reports.filter(r => r.is_deleted !== 1).sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''));

        // Auto-migrate assignment IDs if Admin is logged in
        const authStore = useAuthStore();
        if (authStore.isAdmin) {
          this.migrateAssignmentIds();
        }
      } catch (err) {
        console.error('Error refreshing data from Firestore:', err);
      } finally {
        this.isLoading = false;
      }
    },

    async migrateAssignmentIds() {
      // Find assignments that don't follow the {employee_id}_{project_id} format
      const legacyAssignments = this.project_assignments.filter(a => a.id !== `${a.employee_id}_${a.project_id}`);
      if (legacyAssignments.length === 0) return;

      console.log(`Migrating ${legacyAssignments.length} legacy assignments...`);
      for (const a of legacyAssignments) {
        try {
          const newId = `${a.employee_id}_${a.project_id}`;
          // 1. Create new document with correct ID
          const { id, ...data } = a;
          await setDoc(doc(db, 'project_assignments', newId), {
            ...data,
            id: newId,
            updated_at: serverTimestamp()
          });
          // 2. Delete old document
          await deleteDoc(doc(db, 'project_assignments', id));
          console.log(`Migrated assignment ${id} -> ${newId}`);
        } catch (err) {
          console.error(`Failed to migrate assignment ${a.id}:`, err);
        }
      }
      // Refresh to update local state after migration
      const q = query(collection(db, 'project_assignments'));
      const snap = await getDocs(q);
      this.project_assignments = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => (a as any).is_deleted !== 1);
    },

    async saveEntity(entity: string, action: 'CREATE' | 'UPDATE' | 'DELETE', data: any) {
      this.isLoading = true;
      const targetId = data.id || (action === 'CREATE' ? doc(collection(db, entity)).id : undefined);
      const path = `${entity}/${targetId || 'new'}`;
      
      try {
        const cleanData = JSON.parse(JSON.stringify(toRaw(data)));

        if (action === 'DELETE') {
          await updateDoc(doc(db, entity, data.id), { 
            is_deleted: 1,
            updated_at: serverTimestamp() 
          });
        } else if (action === 'CREATE') {
          if (!targetId) throw new Error('Could not generate document ID');
          await setDoc(doc(db, entity, targetId), {
            is_deleted: 0,
            ...cleanData,
            id: targetId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        } else if (action === 'UPDATE') {
          const { id, ...updateData } = cleanData;
          if (!id) throw new Error('Document ID is required for update');
          await updateDoc(doc(db, entity, id), {
            ...updateData,
            updated_at: serverTimestamp()
          });
        }
        await this.refreshAll();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchProjects() {
      const q = query(collection(db, 'projects'), where('is_deleted', '!=', 1));
      const snap = await getDocs(q);
      this.projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    
    async fetchPayments() {
       const q = query(collection(db, 'payments'), where('is_deleted', '!=', 1), orderBy('payment_date', 'desc'));
       const snap = await getDocs(q);
       this.payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async fetchReports() {
       const q = query(collection(db, 'reports'), where('is_deleted', '!=', 1), orderBy('report_date', 'desc'));
       const snap = await getDocs(q);
       this.reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async fetchReportsPaginated(limitCount: number = 3, projectId?: string, startAfterDoc?: any) {
      this.isLoading = true;
      try {
        const authStore = useAuthStore();
        
        const baseConstraints: any[] = [
          where('is_deleted', '==', 0),
          orderBy('report_date', 'desc'),
          limit(limitCount)
        ];

        if (projectId) {
          baseConstraints.unshift(where('project_id', '==', projectId));
        } else if (!authStore.isAdmin) {
          const myAssignments = this.project_assignments.filter(a => a.employee_id === authStore.user!.id);
          const myProjectIds = myAssignments.map(a => a.project_id);
          if (myProjectIds.length > 0) {
            baseConstraints.unshift(where('project_id', 'in', myProjectIds.slice(0, 30)));
          } else {
            return { reports: [], lastDoc: null };
          }
        }

        if (startAfterDoc) {
          baseConstraints.push(startAfter(startAfterDoc));
        }

        const q = query(collection(db, 'reports'), ...baseConstraints as any[]);
        const snap = await getDocs(q);
        const newReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const lastDoc = snap.docs[snap.docs.length - 1] || null;

        // Merge into existing reports in store, avoiding duplicates
        newReports.forEach(report => {
          const exists = this.reports.find(r => r.id === report.id);
          if (!exists) {
            this.reports.push(report);
          }
        });

        // re-sort global reports state
        this.reports.sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''));

        return { reports: newReports, lastDoc };
      } catch (err) {
        console.error('Error fetching paginated reports:', err);
        return { reports: [], lastDoc: null };
      } finally {
        this.isLoading = false;
      }
    },

    async calculateProjectSummary(projectId: string) {
      const q = query(collection(db, 'payments'), where('project_id', '==', projectId), where('is_deleted', '!=', 1));
      const snap = await getDocs(q);
      const payments = snap.docs.map(d => d.data());
      
      const summary = {
        project_id: projectId,
        cumulative_completed: payments.reduce((sum: number, p: any) => sum + (p.completed_value || 0), 0),
        cumulative_recovered: payments.reduce((sum: number, p: any) => sum + (p.recovered_amount || 0), 0),
        last_payment_date: payments.length > 0 ? (payments as any[]).sort((a,b) => b.payment_date.localeCompare(a.payment_date))[0].payment_date : ''
      };
      
      // If there was a project_summary collection, we'd update it here
      // But for now we just return it as per previous local logic
      return summary;
    }
  }
});
