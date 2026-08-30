interface Props {
  title: string;
}

export default function Placeholder({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-4xl text-slate-300">🚧</div>
      <p className="text-slate-500 font-medium">{title}</p>
      <p className="text-sm text-slate-400">Full page coming in Phase 9</p>
    </div>
  );
}
