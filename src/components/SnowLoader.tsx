export const SnowLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="size-16 animate-spin-slow border-4 border-cyan-400 border-t-transparent rounded-full" />
      <p className="text-lg font-medium text-cyan-100">Loading...</p>
    </div>
  );
};
