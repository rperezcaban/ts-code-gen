// ─────────────────────────────────────────────────────────────────────────────
// Mini Clack UI  –  a local implementation of @clack/prompts public API.
//
// Exports the same surface as @clack/prompts so command files can be written
// identically to the catchUp project:
//
//   import * as p from "../libs/ui";
//   p.intro("ts-form-gen");
//   const s = p.spinner();
//   s.start("Parsing fields...");
//   s.stop("✓ Done");
//   p.outro("Complete!");
// ─────────────────────────────────────────────────────────────────────────────

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const ESC   = '\x1b[';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

const colors = {
  cyan:    (s: string) => `\x1b[36m${s}${RESET}`,
  green:   (s: string) => `\x1b[32m${s}${RESET}`,
  red:     (s: string) => `\x1b[31m${s}${RESET}`,
  yellow:  (s: string) => `\x1b[33m${s}${RESET}`,
  magenta: (s: string) => `\x1b[35m${s}${RESET}`,
  dim:     (s: string) => `${DIM}${s}${RESET}`,
  bold:    (s: string) => `${BOLD}${s}${RESET}`,
  white:   (s: string) => `\x1b[97m${s}${RESET}`,
};

const BAR       = colors.dim('│');
const BAR_START = colors.dim('┌');
const BAR_END   = colors.dim('└');
const TICK      = colors.green('◆');

function write(text: string) {
  process.stdout.write(text);
}

function clearLine() {
  write(`\r${ESC}2K`);
}

// ── intro / outro ─────────────────────────────────────────────────────────────

export function intro(title: string): void {
  write(`\n${BAR_START}  ${colors.bold(colors.cyan(title))}\n${BAR}\n`);
}

export function outro(message: string): void {
  write(`${BAR}\n${BAR_END}  ${colors.green(message)}\n\n`);
}

// ── log helpers ───────────────────────────────────────────────────────────────

export const log = {
  info(msg: string)    { write(`${BAR}  ${colors.cyan('ℹ')}  ${msg}\n`); },
  success(msg: string) { write(`${BAR}  ${colors.green('✓')}  ${msg}\n`); },
  warn(msg: string)    { write(`${BAR}  ${colors.yellow('⚠')}  ${msg}\n`); },
  error(msg: string)   { write(`${BAR}  ${colors.red('✗')}  ${msg}\n`); },
  message(msg: string) { write(`${BAR}  ${colors.dim(msg)}\n`); },
  step(msg: string)    { write(`${BAR}  ${TICK}  ${msg}\n`); },
};

// ── spinner ───────────────────────────────────────────────────────────────────

const SPIN_FRAMES = ['◒', '◐', '◓', '◑'];

export interface Spinner {
  start(msg?: string): void;
  stop(msg?: string): void;
  message(msg: string): void;
}

export function spinner(): Spinner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let frame  = 0;
  let active = false;

  function render(msg: string) {
    clearLine();
    const icon = colors.magenta(SPIN_FRAMES[frame % SPIN_FRAMES.length]);
    write(`${BAR}  ${icon}  ${colors.dim(msg)}`);
    frame++;
  }

  return {
    start(msg = '') {
      active = true;
      frame  = 0;
      write(`${BAR}\n`);
      render(msg);
      timer = setInterval(() => render(msg), 80);
    },

    stop(msg?: string) {
      if (timer) { clearInterval(timer); timer = null; }
      clearLine();
      if (msg) {
        const icon = msg.startsWith('✗') || msg.toLowerCase().startsWith('error')
          ? colors.red('✗')
          : colors.green('✓');
        write(`${BAR}  ${icon}  ${msg}\n`);
      }
      active = false;
    },

    message(msg: string) {
      if (timer) clearInterval(timer);
      render(msg);
      if (active) timer = setInterval(() => render(msg), 80);
    },
  };
}

// ── cancel / isCancel ─────────────────────────────────────────────────────────

const CANCEL = Symbol('cancel');
export function isCancel(val: unknown): val is symbol { return val === CANCEL; }

// ── note ─────────────────────────────────────────────────────────────────────

export function note(message: string, title?: string): void {
  const lines = message.split('\n');
  const width = Math.max(...lines.map(l => l.length), title?.length ?? 0) + 4;
  const hr = colors.dim('─'.repeat(width));

  if (title) write(`${BAR}  ${colors.bold(title)}\n`);
  write(`${BAR}  ${hr}\n`);
  for (const line of lines) {
    write(`${BAR}  ${colors.dim('│')} ${line}\n`);
  }
  write(`${BAR}  ${hr}\n`);
}
