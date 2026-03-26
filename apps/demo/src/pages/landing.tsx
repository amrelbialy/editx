import {
  Crop,
  History,
  ImagePlus,
  Palette,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Type,
} from "lucide-react";
import { CtaBanner } from "../components/cta-banner";
import { FeatureCard } from "../components/feature-card";
import { Footer } from "../components/footer";
import { InlineDemo } from "../components/inline-demo";
import { QuickStart } from "../components/quick-start";
import { StatsBar } from "../components/stats-bar";

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
  from: string;
  to: string;
}

const FEATURES: Feature[] = [
  {
    icon: Crop,
    title: "Crop & Resize",
    desc: "Aspect ratio presets, free crop, rotate, flip, and social media resize presets.",
    from: "#8b5cf6",
    to: "#3b82f6",
  },
  {
    icon: SlidersHorizontal,
    title: "Adjustments",
    desc: "Brightness, contrast, saturation, exposure, temperature, and more.",
    from: "#f59e0b",
    to: "#f97316",
  },
  {
    icon: Sparkles,
    title: "Filters",
    desc: "Instagram-style filters with adjustable intensity.",
    from: "#ec4899",
    to: "#f43f5e",
  },
  {
    icon: Type,
    title: "Text",
    desc: "Rich text annotations with fonts, colors, and formatting via Lexical.",
    from: "#3b82f6",
    to: "#6366f1",
  },
  {
    icon: Shapes,
    title: "Shapes",
    desc: "Rectangles, ellipses, lines, arrows, polygons, stars — filled or outlined.",
    from: "#10b981",
    to: "#14b8a6",
  },
  {
    icon: ImagePlus,
    title: "Image Overlays",
    desc: "Add image annotations on top of your canvas.",
    from: "#a855f7",
    to: "#8b5cf6",
  },
  {
    icon: History,
    title: "Undo / Redo",
    desc: "Full command-based history with keyboard shortcuts.",
    from: "#06b6d4",
    to: "#3b82f6",
  },
  {
    icon: Palette,
    title: "Themeable",
    desc: "Dark, light, and fully custom color themes with CSS variables.",
    from: "#f59e0b",
    to: "#eab308",
  },
];

export function LandingPage() {
  return (
    <div
      className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <StatsBar />
      <QuickStart />
      <CtaBanner />
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative pt-16 pb-14 px-6 text-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.08), transparent)",
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-5">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-white dark:bg-zinc-900 text-violet-700 dark:text-violet-400 text-sm font-medium shadow-sm">
          <span
            className="w-2 h-2 rounded-full bg-emerald-500"
            style={{ boxShadow: "0 0 6px #34d399" }}
          />
          @creative-editor/image-editor
        </span>
        <h1
          className="text-5xl md:text-7xl font-bold leading-tight tracking-tight animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #10b981 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Creative Editor
        </h1>
        <p
          className="max-w-xl text-lg leading-relaxed text-zinc-500 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          A block-based image editor component for React 19. Crop, adjust, filter, add text & shapes
          — fully themeable and extensible.
        </p>

        <div
          className="flex flex-wrap justify-center gap-3 mt-2 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <a
            href="/docs/image-editor/getting-started"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm no-underline"
          >
            Get Started
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/playground"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all no-underline"
          >
            Playground
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs text-zinc-400">
          <span>React 19</span>
          <span>·</span>
          <span>TypeScript</span>
          <span>·</span>
          <span>Konva 10</span>
          <span>·</span>
          <span>Tailwind CSS 4</span>
          <span>·</span>
          <span>Fully Themeable</span>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="py-14 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold tracking-widest text-violet-600 uppercase">
          Live Demo
        </span>
        <h2 className="text-3xl font-semibold mt-2 mb-2 text-zinc-900 dark:text-zinc-100">
          Try it right here
        </h2>
        <p className="text-zinc-500">
          Edit a real photo with the full Creative Editor. No setup required.
        </p>
      </div>
      <InlineDemo />
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-14 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-widest text-violet-600 uppercase">
          Features
        </span>
        <h2 className="text-3xl font-semibold mt-2 text-zinc-900 dark:text-zinc-100">
          Everything you need
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f, i) => (
          <FeatureCard
            key={f.title}
            icon={f.icon}
            title={f.title}
            desc={f.desc}
            from={f.from}
            to={f.to}
            delay={i * 0.07}
          />
        ))}
      </div>
    </section>
  );
}
