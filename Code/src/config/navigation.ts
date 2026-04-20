// config/navigation.ts — defines every page in the app
//
// WHY A SEPARATE CONFIG FILE?
// Both the Sidebar and the Router need to know about your pages.
// Defining them once here means you add a new page in ONE place
// and both the sidebar link and the route appear automatically.
// No duplication, no risk of them getting out of sync.

export interface NavItem {
  label: string
  path:  string
  icon:  string
}

// Each object here creates both a sidebar menu item AND a route
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Live View",
    path: "/live",
    icon: "Radio",           // Lucide icon name — the pulsing broadcast icon
  },
  {
    label: "Playback",
    path: "/playback",
    icon: "PlayCircle",      // Play button icon
  },
  {
    label: "Worker Management",
    path: "/employees",
    icon: "HardHat",         // Construction helmet icon
  },
  {
    label: "Site Progress",
    path: "/progress",
    icon: "BarChart3",       // Chart/progress icon
  },
  {
    label: "Asset Tracking",
    path: "/assets",
    icon: "Truck",           // Vehicle/machinery icon
  },
  {
    label: "Project Advisor",
    path: "/advisor",
    icon: "Bot",             // AI robot icon
  },
];
