export const programme = {
  name: "QurbaniOS",
  eidDate: null,
  announcements: [
    {
      title: "Registration is open",
      text: "Join this year’s Aḍḥiyah programme. Submit your household and participation details for committee review.",
      tag: "Registration",
    },
    {
      title: "Every share. A shared responsibility.",
      text: "Follow the programme from procurement to distribution, with transparent public progress and financial summaries.",
      tag: "Programme",
    },
    {
      title: "Collection details, when confirmed.",
      text: "Your personal collection schedule and allocation will be published after committee confirmation.",
      tag: "Distribution",
    },
  ],
};
export type Participant = {
  name: string;
  email: string;
  activity: string;
  household?: string;
  shares?: number;
  reference?: string;
  status?: string;
};
export function canAccessDashboard(participant: Participant | null) {
  return participant !== null;
}
export function countdownValues(date: string | null) {
  if (date === null) return ["—", "—", "—", "—"];
  const seconds = Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
  return [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ].map((n) => String(n).padStart(2, "0"));
}
export function pageMeta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — QurbaniOS` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — QurbaniOS` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
