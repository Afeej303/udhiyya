export type Row = {
  id: string;
  name: string;
  address: string;
  contact: string;
  members: string;
  status: string;
  shares: string;
  amount: string;
  paid: string;
  household: string;
  type: string;
  supplier: string;
  group: string;
  stage: string;
  weight: string;
  animal: string;
  capacity: string;
  occupied: string;
  participants: string;
  participant: string;
  method: string;
  date: string;
  category: string;
  description: string;
  department: string;
  team: string;
  activity: string;
  time: string;
  location: string;
  recipient: string;
  pathway: string;
  quantity: string;
  title: string;
  message: string;
  audience: string;
  reference: string;
  review: string;
  notes: string;
  reportedBy: string;
  documentation: string;
  permissions: string;
  locality: string;
  adminName: string;
  adminContact: string;
  plan: string;
  features: string;
  created: string;
  setup: string;
  organisation: string;
  role: string;
  priority: string;
  reply: string;
  registration: string;
  notices: string;
  [key: string]: string;
};
export type RowInput = Partial<Row> & { id: string };
export function normalizeRow(row: RowInput): Row {
  return {
    ...Object.fromEntries(
      [
        "name",
        "address",
        "contact",
        "members",
        "status",
        "shares",
        "amount",
        "paid",
        "household",
        "type",
        "supplier",
        "group",
        "stage",
        "weight",
        "animal",
        "capacity",
        "occupied",
        "participants",
        "participant",
        "method",
        "date",
        "category",
        "description",
        "department",
        "team",
        "activity",
        "time",
        "location",
        "recipient",
        "pathway",
        "quantity",
        "title",
        "message",
        "audience",
        "reference",
        "review",
        "notes",
        "reportedBy",
        "documentation",
        "permissions",
        "locality",
        "adminName",
        "adminContact",
        "plan",
        "features",
        "created",
        "setup",
        "organisation",
        "role",
        "priority",
        "reply",
        "registration",
        "notices",
      ].map((k) => [k, ""]),
    ),
    ...row,
  } as Row;
}
export type Records = {
  households: Row[];
  participants: Row[];
  animals: Row[];
  groups: Row[];
  payments: Row[];
  expenses: Row[];
  volunteers: Row[];
  scheduling: Row[];
  distribution: Row[];
  announcements: Row[];
  tasks: Row[];
  issues: Row[];
  platformOrganisations: Row[];
  platformAdmins: Row[];
  platformSupport: Row[];
  platformActivity: Row[];
  platformNotices: Row[];
  platformSettings: Row[];
  [key: string]: Row[];
};
export const sample = {
  locality: "Demo Mahallu, Kerala",
  year: "2027",
  price: 8500,
  deadline: "20 May 2027",
  opening: "01 May 2027",
  eidDate: null as string | null,
};
export type Department = "Slaughter" | "Processing" | "Distribution" | "Finance";
export type DemoAccount = {
  role: "Committee" | "Volunteer" | "Beneficiary" | "Super Admin";
  name: string;
  department?: Department;
};
export const demoAccounts: DemoAccount[] = [
  { role: "Super Admin", name: "Muhammed Parad" },
  { role: "Committee", name: "Amina Rahman" },
  { role: "Volunteer", name: "Yusuf Ahmed", department: "Processing" },
  { role: "Volunteer", name: "Faisal Ali", department: "Slaughter" },
  { role: "Volunteer", name: "Sara Nizar", department: "Distribution" },
  { role: "Volunteer", name: "Nabeel Hassan", department: "Finance" },
  { role: "Beneficiary", name: "Household QBH-00125" },
];
const rawRecords: Record<string, RowInput[]> = {
  households: [
    {
      id: "QBH-00125",
      name: "Abdul Rahman",
      address: "East Lane, Ward 02",
      contact: "•••• •• 4821",
      members: "5",
      status: "Active",
    },
    {
      id: "QBH-00126",
      name: "Fatima Hassan",
      address: "Mosque Road, Ward 01",
      contact: "•••• •• 1390",
      members: "4",
      status: "Active",
    },
    {
      id: "QBH-00127",
      name: "Ibrahim Ali",
      address: "Hill View, Ward 03",
      contact: "•••• •• 7205",
      members: "6",
      status: "Incomplete",
    },
  ],
  participants: [
    {
      id: "QOS-2027-001",
      name: "Mohammed Ashraf",
      household: "QBH-00125",
      shares: "1",
      amount: "8500",
      paid: "0",
      status: "Pending review",
    },
    {
      id: "QOS-2027-002",
      name: "Fatima Hassan",
      household: "QBH-00126",
      shares: "2",
      amount: "17000",
      paid: "8500",
      status: "Approved",
    },
    {
      id: "QOS-2027-003",
      name: "Ibrahim Ali",
      household: "QBH-00127",
      shares: "1",
      amount: "8500",
      paid: "8500",
      status: "Approved",
    },
  ],
  animals: [
    {
      id: "AN-001",
      type: "Cattle",
      supplier: "Community farm",
      amount: "56000",
      group: "GR-001",
      status: "Verified",
      stage: "Awaiting slaughter",
      weight: "0",
    },
    {
      id: "AN-002",
      type: "Cattle",
      supplier: "Green Valley farm",
      amount: "57000",
      group: "Unassigned",
      status: "Awaiting verification",
      stage: "Registered",
      weight: "0",
    },
    {
      id: "AN-003",
      type: "Cattle",
      supplier: "Community farm",
      amount: "55000",
      group: "Unassigned",
      status: "Verified",
      stage: "Awaiting processing",
      weight: "0",
    },
  ],
  groups: [
    {
      id: "GR-001",
      animal: "AN-001",
      capacity: "7",
      occupied: "0",
      participants: "",
      status: "Draft",
    },
  ],
  payments: [
    {
      id: "PAY-001",
      participant: "QOS-2027-001",
      name: "Mohammed Ashraf",
      amount: "8500",
      method: "Cash",
      date: "12 May 2027",
      status: "Pending verification",
    },
    {
      id: "PAY-002",
      participant: "QOS-2027-002",
      name: "Fatima Hassan",
      amount: "8500",
      method: "Bank transfer",
      date: "10 May 2027",
      status: "Verified",
    },
  ],
  expenses: [
    {
      id: "EXP-001",
      category: "Animal procurement",
      description: "Cattle procurement · AN-001",
      amount: "56000",
      date: "10 May 2027",
      method: "Bank transfer",
      status: "Recorded",
    },
    {
      id: "EXP-002",
      category: "Supplies",
      description: "Packaging materials",
      amount: "2400",
      date: "12 May 2027",
      method: "Cash",
      status: "Recorded",
    },
  ],
  volunteers: demoAccounts
    .filter((a) => a.role === "Volunteer")
    .map((a, i) => ({
      id: `VOL-00${i + 1}`,
      name: a.name,
      department: a.department || "Processing",
      team: "Team 02",
      status: "Active",
    })),
  scheduling: [
    {
      id: "SCH-001",
      activity: "Slaughter · AN-001",
      department: "Slaughter",
      team: "Team 02",
      time: "08:00",
      location: "Community hall",
      status: "Scheduled",
    },
    {
      id: "SCH-002",
      activity: "Processing · AN-003",
      department: "Processing",
      team: "Team 02",
      time: "09:00",
      location: "Processing centre",
      status: "Scheduled",
    },
  ],
  distribution: [
    {
      id: "PKG-001",
      recipient: "QOS-2027-002",
      pathway: "Participant",
      quantity: "4",
      location: "Community hall",
      time: "11:00–13:00",
      status: "Pending allocation",
    },
    {
      id: "PKG-002",
      recipient: "QBH-00125",
      pathway: "Public beneficiary",
      quantity: "3",
      location: "Community hall",
      time: "13:00–15:00",
      status: "Pending allocation",
    },
  ],
  announcements: [
    {
      id: "ANN-001",
      title: "Registration is open",
      message:
        "Submit your household details and participation selection before the sample registration deadline.",
      audience: "All users",
      date: "01 May 2027",
      status: "Published",
    },
    {
      id: "ANN-002",
      title: "A transparent programme, together",
      message:
        "Committee-verified collections and programme milestones are available in the public overview.",
      audience: "All users",
      date: "04 May 2027",
      status: "Published",
    },
    {
      id: "ANN-003",
      title: "Collection arrangements",
      message:
        "Collection dates and personal quantities will appear only after committee confirmation.",
      audience: "All users",
      date: "08 May 2027",
      status: "Published",
    },
  ],
  tasks: [
    {
      id: "TSK-001",
      name: "Process assigned animal AN-003",
      department: "Processing",
      reference: "AN-003",
      status: "Pending",
    },
    {
      id: "TSK-002",
      name: "Check packaging supplies",
      department: "Processing",
      reference: "Team 02",
      status: "In progress",
    },
    {
      id: "TSK-003",
      name: "Complete slaughter AN-001",
      department: "Slaughter",
      reference: "AN-001",
      status: "Pending",
    },
    {
      id: "TSK-004",
      name: "Prepare assigned collection packages",
      department: "Distribution",
      reference: "PKG-002",
      status: "Pending",
    },
    {
      id: "TSK-005",
      name: "Submit cash collection",
      department: "Finance",
      reference: "QOS-2027-001",
      status: "Pending",
    },
  ],
  issues: [],
};
export const initialRecords = Object.fromEntries(
  Object.entries(rawRecords).map(([k, rows]) => [k, rows.map(normalizeRow)]),
) as Records;
export function money(n: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n));
}
export function allocationError(
  participant: RowInput | undefined,
  group: RowInput | undefined,
  groups: RowInput[],
): string | null {
  if (!participant || participant.status !== "Approved")
    return "Only approved participants can be allocated.";
  if (!group) return "Select a group.";
  if (groups.some((g) => (g.participants || "").split(",").includes(participant.id)))
    return "This participant is already allocated.";
  if (Number(group.occupied) + Number(participant.shares) > Number(group.capacity))
    return "The selected group does not have enough available shares.";
  return null;
}
export function canAllocateQuantity(available: number, allocated: number, requested: number) {
  return requested > 0 && allocated + requested <= available;
}
export function verifiedBalance(payments: Row[], participant: string) {
  return payments
    .filter((p) => p.participant === participant && p.status === "Verified")
    .reduce((n, p) => n + Number(p.amount), 0);
}
export const registrationSteps = [
  "Verify identity",
  "Household",
  "Your details",
  "Participation",
  "Review",
  "Confirmation",
  "Committee review",
];
