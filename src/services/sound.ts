// ─────────────────────────────────────────────────────────────────────────────
//  VIVA CITY FOOD COURT — Sound Service
//  Handles restaurant chimes, kitchen bells, payment feedback,
//  and the PERSISTENT food-ready alarm (loops until stopped by user).
// ─────────────────────────────────────────────────────────────────────────────

class SoundService {
  private ctx: AudioContext | null = null;
  private audioInitialized = false;

  // ── Alarm state ────────────────────────────────────────────────────────────
  // A self-rescheduling recursive timeout drives the alarm so it is immune
  // to setInterval drift and can be killed instantly at any point.
  private _alarmRunning = false;
  private _alarmTimer: ReturnType<typeof setTimeout> | null = null;
  // Beat counter lets us alternate tit-tit (two beeps) pattern reliably
  private _alarmBeat = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this._setupUserGestureUnlock();
    }
  }

  // ── AudioContext bootstrap ─────────────────────────────────────────────────

  private _setupUserGestureUnlock() {
    const unlock = () => {
      this._initCtx();
      this.audioInitialized = true;
    };
    window.addEventListener('click',      unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown',    unlock, { once: true, passive: true });
  }

  private _initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    // Resume if suspended — best-effort, errors silently discarded
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Attempt to resume the AudioContext. Returns true if running afterwards. */
  private async _ensureRunning(): Promise<boolean> {
    this._initCtx();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { return false; }
    }
    return this.ctx.state === 'running';
  }

  // ── Mute preference ────────────────────────────────────────────────────────

  isMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('vivacity_sound_muted') === 'true';
  }

  setMuted(muted: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('vivacity_sound_muted', muted ? 'true' : 'false');
  }

  toggleMute(): boolean {
    const next = !this.isMuted();
    this.setMuted(next);
    return next;
  }

  // ── Notification-enable preference ────────────────────────────────────────

  isNotificationsEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('vivacity_notifications_enabled') === 'true';
  }

  /** Called from the "Enable Sound & Vibration" button on the tracking page. */
  async enableNotifications(): Promise<{ ok: boolean; message: string }> {
    try {
      this._initCtx();
      if (!this.ctx) return { ok: false, message: 'Audio not supported in this browser.' };

      if (this.ctx.state === 'suspended') await this.ctx.resume();

      this.audioInitialized = true;
      localStorage.setItem('vivacity_notifications_enabled', 'true');
      if (this.isMuted()) this.setMuted(false);

      // Play a brief test beep so the user hears the unlocked audio
      this._playTit(this.ctx.currentTime, 0.4);
      this.triggerVibration([100, 50, 100]);

      return { ok: true, message: 'Sound & vibration enabled! You will be alerted when your food is ready.' };
    } catch {
      return { ok: false, message: 'Could not enable audio. Please allow audio in your browser settings.' };
    }
  }

  // ── Vibration ──────────────────────────────────────────────────────────────

  triggerVibration(pattern: number[] = [200, 100, 200, 100, 100]) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch { /* unsupported — silently ignore */ }
  }

  /** Stop any active vibration. */
  private _stopVibration() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch { /* ignore */ }
  }

  // ── Deduplication (sessionStorage) ────────────────────────────────────────

  hasNotificationPlayed(eventId: string): boolean {
    if (!eventId || typeof window === 'undefined') return false;
    try {
      const stored = sessionStorage.getItem('vivacity_played_notifications');
      const list: string[] = stored ? JSON.parse(stored) : [];
      return list.includes(eventId);
    } catch { return false; }
  }

  markNotificationPlayed(eventId: string) {
    if (!eventId || typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem('vivacity_played_notifications');
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(eventId)) {
        list.push(eventId);
        sessionStorage.setItem('vivacity_played_notifications', JSON.stringify(list));
      }
    } catch { /* ignore */ }
  }

  // ── Low-level tone primitives ──────────────────────────────────────────────

  /**
   * Plays a single short "tit" beep (sine wave, ~200 ms) at `startTime`.
   * freq: 1047 Hz (C6) — clear, piercing, unmistakable in a noisy food court.
   */
  private _playTit(startTime: number, gain = 0.55, freq = 1047) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Crisp attack, short sustain, quick decay — the classic "tit" beep
      env.gain.setValueAtTime(0.001, startTime);
      env.gain.linearRampToValueAtTime(gain, startTime + 0.010); // 10 ms attack
      env.gain.setValueAtTime(gain,  startTime + 0.080);         // 80 ms sustain
      env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.200); // decay to silence

      osc.connect(env);
      env.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.210);
    } catch { /* ignore */ }
  }

  /**
   * Plays the distinct "tit-tit, tit-tit" double-pair pattern using pre-scheduled
   * Web Audio timing (sample-accurate, zero JS jitter).
   * Total pattern duration: ~680 ms.
   */
  private _playTitTit(startTime: number) {
    // First pair: tit — tit
    this._playTit(startTime,        0.65, 1047); // C6
    this._playTit(startTime + 0.14, 0.65, 1175); // D6
    // Short breath pause, then second pair: tit — tit
    this._playTit(startTime + 0.38, 0.65, 1047); // C6
    this._playTit(startTime + 0.52, 0.65, 1175); // D6
  }

  // ── 3-note premium chime (used for test-sound button & non-alarm plays) ───

  private _playChimeOnce(startTime: number, peakGain = 0.55) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const note = (freq: number, harmFreq: number, harmType: OscillatorType, t: number, dur: number, g: number) => {
      const o  = ctx.createOscillator();
      const oh = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = 'sine';   o.frequency.setValueAtTime(freq, t);
      oh.type = harmType; oh.frequency.setValueAtTime(harmFreq, t);
      gn.gain.setValueAtTime(0.001, t);
      gn.gain.linearRampToValueAtTime(g, t + 0.03);
      gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(gn); oh.connect(gn); gn.connect(ctx.destination);
      o.start(t); oh.start(t); o.stop(t + dur); oh.stop(t + dur);
    };

    note(659.25, 1318.5, 'triangle', startTime,        0.38, peakGain);       // E5
    note(880,   1760,   'sine',     startTime + 0.20,  0.75, peakGain * 1.05); // A5
    note(1108.73, 2217, 'triangle', startTime + 0.45,  1.00, peakGain * 0.9);  // C#6
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PERSISTENT ALARM — starts on counter-confirmed ready event,
  //  loops "tit-tit, tit-tit … pause … tit-tit, tit-tit" until stopAlarm() is called.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start the repeating tit-tit alarm.
   *
   * Returns 'started'  — audio running, alarm active.
   * Returns 'blocked'  — audio context suspended; alarm will auto-start
   *                      once the user next touches the screen (if they do).
   * Returns 'muted'    — user has muted; show visual only.
   */
  startAlarm(): 'started' | 'blocked' | 'muted' {
    // Stop any existing alarm first (no overlaps)
    this._killAlarm();

    if (this.isMuted()) return 'muted';

    this._initCtx();
    if (!this.ctx) return 'blocked';

    this._alarmRunning = true;
    this._alarmBeat    = 0;

    if (this.ctx.state === 'running') {
      // AudioContext is live — start immediately
      this._scheduleNextBeat();
      this.triggerVibration([120, 60, 120, 140, 120, 60, 120]);
      return 'started';
    }

    // Context is suspended (autoplay policy) — try to resume.
    this.ctx.resume().then(() => {
      if (this._alarmRunning && this.ctx?.state === 'running') {
        this._scheduleNextBeat();
        this.triggerVibration([120, 60, 120, 140, 120, 60, 120]);
      }
    }).catch(() => {});

    return 'blocked';
  }

  /**
   * User interaction helper to explicitly unlock and start the alarm audio
   * if it was suspended by browser autoplay policy.
   */
  async unlockAudioAndStartAlarm(): Promise<boolean> {
    this._initCtx();
    if (!this.ctx) return false;
    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.audioInitialized = true;
      if (this.ctx.state === 'running') {
        this._alarmRunning = true;
        this._alarmBeat = 0;
        this._scheduleNextBeat();
        this.triggerVibration([120, 60, 120, 140, 120, 60, 120]);
        return true;
      }
    } catch {}
    return false;
  }

  /** Stop the alarm immediately. Safe to call even if alarm is not running. */
  stopAlarm() {
    this._killAlarm();
    this._stopVibration();
  }

  private _killAlarm() {
    this._alarmRunning = false;
    if (this._alarmTimer !== null) {
      clearTimeout(this._alarmTimer);
      this._alarmTimer = null;
    }
    this._alarmBeat = 0;
  }

  /**
   * Recursive beat scheduler:
   *   Beat 0 → play "tit-tit, tit-tit", schedule beat 1 in 750 ms
   *   Beat 1 → re-vibrate, schedule beat 0 in 1250 ms (silence gap)
   *
   * Pattern: [tit-tit, tit-tit] ─ 1250 ms gap ─ [tit-tit, tit-tit] ─ 1250 ms ─ …
   * Vibration repeats every full cycle (every ~2000 ms).
   */
  private _scheduleNextBeat() {
    if (!this._alarmRunning) return;

    if (this._alarmBeat === 0) {
      // Emit the double-pair "tit-tit, tit-tit" now using Web Audio
      if (this.ctx && this.ctx.state === 'running') {
        this._playTitTit(this.ctx.currentTime);
      }
      this._alarmBeat = 1;
      // Schedule the next step after the pattern finishes (~680 ms + short breath)
      this._alarmTimer = setTimeout(() => this._scheduleNextBeat(), 780);
    } else {
      // Silence gap between patterns — fire vibrating reminder
      this.triggerVibration([100, 50, 100]);
      this._alarmBeat = 0;
      // Consistent pause between patterns
      this._alarmTimer = setTimeout(() => this._scheduleNextBeat(), 1250);
    }
  }

  /** Whether the alarm is currently running. */
  isAlarmRunning(): boolean {
    return this._alarmRunning;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Non-alarm convenience plays
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Premium 3-note chime played TWICE (for admin test button & non-alarm uses).
   * Returns true if played.
   */
  playReadyChime(eventId?: string): boolean {
    if (this.isMuted()) return false;
    if (eventId) {
      if (this.hasNotificationPlayed(eventId)) return false;
      this.markNotificationPlayed(eventId);
    }

    this._initCtx();
    if (!this.ctx) return false;

    const playNow = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this._playChimeOnce(now, 0.55);
      this._playChimeOnce(now + 2.1, 0.5);
      this.triggerVibration([200, 100, 200, 100, 100]);
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => { if (this.ctx?.state === 'running') playNow(); }).catch(() => {});
      return false;
    }

    playNow();
    return true;
  }

  // Soft high-end chime for new incoming order (kitchen KDS)
  playNewOrderChime() {
    if (this.isMuted()) return;
    try {
      this._initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g  = this.ctx.createGain();
      o1.type = 'sine';    o1.frequency.setValueAtTime(587.33, now);
      o1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      o2.type = 'triangle'; o2.frequency.setValueAtTime(880, now + 0.15);
      o2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3);
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.3, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      o1.connect(g); o2.connect(g); g.connect(this.ctx.destination);
      o1.start(now); o2.start(now + 0.15);
      o1.stop(now + 0.4); o2.stop(now + 0.8);
    } catch { /* autoplay restriction */ }
  }

  // Crisp kitchen bell ding
  playKitchenBell() {
    if (this.isMuted()) return;
    try {
      this._initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1760, now);
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + 1.2);
    } catch { /* ignore */ }
  }

  // Success chime for payment confirmation
  playPaymentSuccess() {
    if (this.isMuted()) return;
    try {
      this._initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(freq, now + i * 0.08);
        g.gain.setValueAtTime(0.2, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        o.connect(g); g.connect(this.ctx!.destination);
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.4);
      });
    } catch { /* ignore */ }
  }

  playSuccessChime() {
    this.playPaymentSuccess();
  }

  /**
   * Short, clear alert sound for counter staff when a new pending order arrives.
   * Prevents repeated sounds for the same order by checking if orderId has already been alerted.
   * Handles browser audio restrictions by resuming suspended AudioContext.
   */
  async playPendingOrderAlert(orderId?: string): Promise<boolean> {
    if (this.isMuted()) return false;
    if (orderId) {
      const eventKey = `pending_alert_${orderId}`;
      if (this.hasNotificationPlayed(eventKey)) return false;
      this.markNotificationPlayed(eventKey);
    }

    this._initCtx();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }

    if (this.ctx.state !== 'running') return false;

    try {
      const now = this.ctx.currentTime;
      // High-clarity 2-tone alert chime (F5 698.46 Hz -> A5 880 Hz)
      const playTone = (freq: number, t: number, dur: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
      };

      playTone(698.46, now, 0.22);
      playTone(880.00, now + 0.16, 0.38);
      this.triggerVibration([120, 60, 120]);
      return true;
    } catch {
      return false;
    }
  }
}

export const sound = new SoundService();
