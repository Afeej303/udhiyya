import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Mail, ArrowRight, Ellipsis, Home, Info, ClipboardList, Megaphone, CircleHelp, LogIn } from "lucide-react";
import { Logo } from "./Logo";
import { Button, btn } from "./Btn";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useParticipant } from "./ParticipantSession";
import { sample } from "@/lib/workflow";
const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/about", label: "About", icon: Info },
  { to: "/guidelines", label: "Guidelines", icon: ClipboardList },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/faq", label: "FAQ", icon: CircleHelp },
  { to: "/contact", label: "Contact", icon: Mail },
] as const;
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { participant } = useParticipant();
  return (
    <div className="min-h-screen">
      <div className="hidden bg-ink px-4 py-2 text-center text-[11px] text-ink-foreground sm:block">
        Aḍḥiyah 2027 <span className="mx-2 text-lime">✦</span> Illustrative programme
      </div>
      <header className="relative z-20 border-b border-border bg-background">
        <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 lg:flex lg:justify-between lg:px-5">
          <Logo className="text-base sm:text-lg" />
          <nav aria-label="Main navigation" className="hidden min-w-0 gap-5 text-xs lg:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: true }}
                className="flex min-h-11 shrink-0 items-center whitespace-nowrap text-muted-foreground"
                activeProps={{ className: "font-semibold text-cobalt" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link to="/login" className={btn({ variant: "ghost", size: "sm", className: "hidden lg:inline-flex" })}>
              Login
            </Link>
            <Link
              to={participant ? "/dashboard" : "/signup"}
              className={btn({ size: "sm", className: "px-2" })}
            >
              {participant ? "Dashboard" : "Register"}
              <ArrowUpRight className="size-3.5" />
            </Link>
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-11 px-0" aria-label="Open navigation menu">
                    <Ellipsis className="size-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} collisionPadding={16} className="w-64 max-w-[calc(100vw-2rem)] rounded-lg border-border bg-card p-2 shadow-soft lg:hidden">
                  <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">QurbaniOS</DropdownMenuLabel>
                  {links.map(l => (
                    <DropdownMenuItem key={l.to} asChild className="min-h-11 cursor-pointer rounded-md px-3">
                      <Link to={l.to} activeOptions={{ exact: true }} activeProps={{ className: "bg-accent font-semibold text-cobalt", "aria-current": "page" }}>
                        <l.icon className="size-4 text-cobalt" />
                        {l.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-md px-3">
                    <Link to="/login"><LogIn className="size-4 text-cobalt" />Login</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-8 border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {sample.locality}
            </p>
          </div>
          <div className="grid content-start gap-4 text-sm">
            <Link to="/programme">Programme</Link>
            <Link to="/distribution">Distribution</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <p className="font-medium">Here to help</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              committee@example.com
            </p>
            <Link
              to="/login"
              className="mt-4 flex items-center gap-2 text-xs font-medium text-cobalt"
            >
              Portal login
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
        <div className="border-t border-border px-5 py-4 text-center text-[11px] text-muted-foreground">
          QurbaniOS © 2027 · Frontend demo · All programme details are illustrative
        </div>
      </footer>
    </div>
  );
}
