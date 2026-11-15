import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { platformRecords } from "@/lib/platform";
import {
  initialRecords,
  type Row,
  type RowInput,
  type Records,
  normalizeRow,
  type DemoAccount,
} from "@/lib/workflow";
type Store = {
  records: Records;
  account: DemoAccount | null;
  ready: boolean;
  login: (a: DemoAccount) => void;
  logout: () => void;
  update: (entity: string, id: string, patch: Partial<Row>) => void;
  add: (entity: string, row: RowInput) => void;
  programmeStatus: string;
  setProgrammeStatus: (s: string) => void;
  policy: { participant: number; beneficiary: number };
  setPolicy: (p: { participant: number; beneficiary: number }) => void;
};
const Context = createContext<Store | undefined>(undefined);
export function DemoStore({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Records>(() => ({
    ...initialRecords,
    ...platformRecords,
  }));
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [programmeStatus, setProgrammeStatus] = useState("Registration open");
  const [policy, setPolicy] = useState({ participant: 60, beneficiary: 40 });
  useEffect(() => {
    try {
      const a = sessionStorage.getItem("qos-demo-account");
      if (a) setAccount(JSON.parse(a));
    } catch {
      sessionStorage.removeItem("qos-demo-account");
    }
    setReady(true);
  }, []);
  function login(a: DemoAccount) {
    sessionStorage.setItem("qos-demo-account", JSON.stringify(a));
    setAccount(a);
  }
  function logout() {
    sessionStorage.removeItem("qos-demo-account");
    setAccount(null);
  }
  function update(entity: string, id: string, patch: Partial<Row>) {
    setRecords((s) => ({
      ...s,
      [entity]: (s[entity] || []).map((r) => (r.id === id ? normalizeRow({ ...r, ...patch }) : r)),
    }));
  }
  function add(entity: string, row: RowInput) {
    setRecords((s) => ({ ...s, [entity]: [normalizeRow(row), ...(s[entity] || [])] }));
  }
  return (
    <Context.Provider
      value={{
        records,
        account,
        ready,
        login,
        logout,
        update,
        add,
        programmeStatus,
        setProgrammeStatus,
        policy,
        setPolicy,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const c = useContext(Context);
  if (!c) throw new Error("DemoStore is missing");
  return c;
}
