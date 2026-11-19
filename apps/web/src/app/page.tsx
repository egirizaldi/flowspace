import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BackendStatus } from '@/components/backend-status';
import { DEFAULT_PROJECT_STATUSES } from '@flowspace/shared';
import { Kanban, Layers, Users, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-16">
      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-md">
            FS
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">FlowSpace</span>
            <span className="ml-2 text-xs text-muted-foreground font-mono">v1.0.0-mvp</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button variant="default" size="sm">
              Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-16 text-center max-w-3xl">
        <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Linear-inspired UI • Trello Kanban • Jira Workflows
        </Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Organize Work. <span className="text-primary">Move Forward.</span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          Platform manajemen proyek SaaS kolaboratif yang menggabungkan kecepatan, transparansi alur kerja terstruktur, dan pengalaman visual modern.
        </p>

        {/* Quick Search Demonstration */}
        <div className="mt-8 flex items-center max-w-md mx-auto space-x-2">
          <Input placeholder="Cari task, project, atau anggota..." />
          <Button variant="default">Cari</Button>
        </div>
      </section>

      {/* Default Workflow Preview */}
      <section className="w-full max-w-5xl my-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Default Project Workflow Statuses (@flowspace/shared)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {DEFAULT_PROJECT_STATUSES.map((status) => (
            <div
              key={status.name}
              className="p-3.5 rounded-lg border border-border bg-surface flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{status.name}</span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground mt-2 uppercase font-mono">
                Category: {status.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Backend & Database Integration Status */}
      <section className="w-full max-w-5xl my-4">
        <BackendStatus />
      </section>

      {/* Feature Architecture Cards */}
      <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Multi-Tenant Hierarchy</CardTitle>
            <CardDescription>
              Organization → Workspace → Project → Task yang terisolasi secara ketat di backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Organization Boundary</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
              <Kanban className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Interactive Kanban</CardTitle>
            <CardDescription>
              Didukung dnd-kit dan optimistic concurrency control menggunakan version lock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="success">Optimistic Lock (v1)</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-md bg-sky-500/10 text-sky-400 flex items-center justify-center mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Session-based Security</CardTitle>
            <CardDescription>
              Opaque session tokens di HttpOnly cookies dengan Argon2id password hashing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="info">HttpOnly Cookies</Badge>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>© 2026 FlowSpace Platform. All rights reserved.</span>
        <div className="flex items-center space-x-4">
          <span>Next.js 15+</span>
          <span>•</span>
          <span>Tailwind CSS</span>
          <span>•</span>
          <span>shadcn/ui</span>
        </div>
      </footer>
    </main>
  );
}
