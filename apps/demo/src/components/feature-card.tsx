import type React from "react";

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  from: string;
  to: string;
  delay?: number;
}

export function FeatureCard(props: FeatureCardProps) {
  const { icon: Icon, title, desc, from, to, delay = 0 } = props;

  return (
    <div
      className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_-4px_rgba(0,0,0,0.07)] hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(124,58,237,0.06),0_20px_40px_-8px_rgba(124,58,237,0.13)] hover:border-violet-200/60 dark:hover:border-violet-800/60 transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <Icon className="size-5 text-white" />
      </div>
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}
