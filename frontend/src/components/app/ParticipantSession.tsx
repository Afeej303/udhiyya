import { createContext, useContext, useEffect, useState } from 'react';
import type { Participant } from '@/lib/programme';
const Session = createContext<{ participant: Participant | null; ready: boolean; enter: (p: Participant) => void; leave: () => void }>({ participant: null, ready: false, enter: () => {}, leave: () => {} });
export function ParticipantSession({ children }: { children: React.ReactNode }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const raw = sessionStorage.getItem('eid-demo-participant'); if (raw) { const p = JSON.parse(raw); if (typeof p.name === 'string' && typeof p.email === 'string' && typeof p.activity === 'string') setParticipant(p); } } catch { sessionStorage.removeItem('eid-demo-participant'); } setReady(true); }, []);
  function enter(p: Participant) { sessionStorage.setItem('eid-demo-participant', JSON.stringify(p)); setParticipant(p); }
  function leave() { sessionStorage.removeItem('eid-demo-participant'); setParticipant(null); }
  return <Session.Provider value={{ participant, ready, enter, leave }}>{children}</Session.Provider>;
}
export function useParticipant() { return useContext(Session); }
