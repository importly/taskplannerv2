
export const HeatmapStrip = () => {
  // 74 cells for the heatmap
  const cells = Array.from({ length: 74 }, (_, i) => i);

  return (
    <div className="w-full h-8 flex items-center gap-1 px-4 overflow-hidden">
      {cells.map(i => (
        <div
          key={i}
          className="flex-1 h-3 rounded-sm bg-white/5 border border-white/5 hover:bg-accent/20 transition-colors"
          title={`Cell ${i}`}
        />
      ))}
    </div>
  );
};
