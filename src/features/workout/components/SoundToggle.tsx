export function SoundToggle({ enabled, onChange, unavailable }: { enabled: boolean; onChange: (enabled: boolean) => void; unavailable?: boolean }) {
  return <div>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-stone-300">
      <input type="checkbox" checked={enabled} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-lime-300" />
      Sinais sonoros
    </label>
    {unavailable && enabled && <p className="text-xs text-amber-200" role="status">Áudio indisponível ou bloqueado. O timer continua funcionando.</p>}
  </div>;
}
