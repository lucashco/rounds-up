// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorkoutAudio } from './workoutAudio';

class FakeSource {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn(); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
  onended: (() => void) | null = null;
}
class FakeContext {
  static instances: FakeContext[] = [];
  state = 'suspended'; currentTime = 0; destination = {};
  sources: FakeSource[] = [];
  constructor() { FakeContext.instances.push(this); }
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createOscillator() { const source = new FakeSource(); this.sources.push(source); return source; }
  createGain() { return { connect: vi.fn(), disconnect: vi.fn(), gain: {
    setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(),
  } }; }
}
afterEach(() => { vi.unstubAllGlobals(); FakeContext.instances = []; });

describe('Web Audio adapter', () => {
  it('não cria contexto antes do unlock e retoma contexto após interação', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const audio = createWorkoutAudio();
    audio.play('exercise');
    expect(FakeContext.instances).toHaveLength(0);
    expect(await audio.unlock()).toBe(true);
    expect(FakeContext.instances).toHaveLength(1);
    expect(FakeContext.instances[0]!.resume).toHaveBeenCalledOnce();
    await audio.unlock();
    expect(FakeContext.instances).toHaveLength(1);
    audio.close();
  });

  it('usa sinais distintos e cancela fontes agendadas ao parar', async () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const audio = createWorkoutAudio(); await audio.unlock();
    const context = FakeContext.instances[0]!;
    const frequencies = () => context.sources.map(source => source.frequency.setValueAtTime.mock.calls[0]?.[0]);
    audio.play('rest'); expect(frequencies()).toEqual([330]);
    audio.play('exercise'); expect(frequencies()).toEqual([330, 660, 880]);
    audio.play('complete'); expect(frequencies()).toEqual([330, 660, 880, 660, 880, 1_100]);
    audio.stop();
    expect(context.sources.every(source => source.disconnect.mock.calls.length > 0)).toBe(true);
    context.state = 'suspended';
    const count = context.sources.length;
    audio.play('countdown');
    expect(context.sources).toHaveLength(count);
    audio.close();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('trata ausência de suporte e falhas de autoplay sem lançar', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = createWorkoutAudio();
    expect(await audio.unlock()).toBe(false);
    expect(() => audio.play('rest')).not.toThrow();
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('Bloqueado'); } });
    expect(await audio.unlock()).toBe(false);
  });
});
