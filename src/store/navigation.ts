import { create } from 'zustand'

export type PageKey = 
  | 'dashboard' 
  | 'kendaraan' 
  | 'service' 
  | 'anggaran' 
  | 'bengkel' 
  | 'suku-cadang' 
  | 'riwayat' 
  | 'laporan' 
  | 'pengaturan'
  | 'notifikasi'

interface NavigationState {
  currentPage: PageKey
  setCurrentPage: (page: PageKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
