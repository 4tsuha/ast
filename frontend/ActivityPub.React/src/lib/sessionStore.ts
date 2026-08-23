import { create } from "zustand"
type Viewer = { username: string; actorIri: string; roles: string[] }
type Session = { authenticated: boolean; viewer?: Viewer; csrf: { headerName: string; requestToken: string } }
type State = { session: Session | null; setSession: (s: Session) => void; clear: () => void }
export const useSessionStore = create<State>(set => ({
  session: null,
  setSession: s => set({ session: s }),
  clear: () => set({ session: null }),
}))
