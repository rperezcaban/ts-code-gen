// ─────────────────────────────────────────────────────────────────────────────
// Mini Commander  –  a local implementation of the Commander.js public API.
//
// Supports the exact subset used in this project:
//   new Command()
//   .name() .description() .version() .alias() .addHelpText()
//   .command(spec)  – parses "<required>" and "[optional]" positional args
//   .option(flags, desc, coerceOrDefault?, default?)
//   .action(fn)
//   .parseAsync(process.argv)
// ─────────────────────────────────────────────────────────────────────────────

const RESET   = '\x1b[0m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const CYAN    = '\x1b[36m';
const YELLOW  = '\x1b[33m';
const GREEN   = '\x1b[32m';

interface OptionDef {
  short:    string | null;   // e.g. "-f"
  long:     string;          // e.g. "--field"
  key:      string;          // camelCase option name, e.g. "field"
  argName:  string | null;   // e.g. "spec" (null = boolean flag)
  required: boolean;         // whether the arg is <required> vs [optional]
  negate:   boolean;         // "--no-xxx" style
  coerce:   ((val: string, prev: unknown) => unknown) | null;
  default:  unknown;
  desc:     string;
}

interface ArgDef {
  name:     string;
  required: boolean;
}

function parseFlagSpec(flags: string): Omit<OptionDef, 'coerce' | 'default' | 'desc'> {
  // e.g. "-f, --field <spec>"  |  "--barrel"  |  "--no-strict-types"  |  "-n, --dry-run"
  const parts = flags.split(/[\s,]+/).filter(Boolean);

  let short: string | null = null;
  let long = '';
  let argName: string | null = null;
  let required = false;
  let negate = false;

  for (const part of parts) {
    if (part.startsWith('--')) {
      const m = part.match(/^--(\[no-\])?(.+?)(?:\s+([<[].+[>\]])?)?$/);
      if (part.startsWith('--no-')) {
        negate = true;
        long = '--' + part.slice(5);
      } else {
        long = part.split(/[\s<[]/)[0];
      }
    } else if (part.startsWith('-')) {
      short = part.replace(/[^-a-zA-Z]/g, '').slice(0, 2);
    } else if (part.startsWith('<')) {
      argName = part.replace(/[<>]/g, '');
      required = true;
    } else if (part.startsWith('[')) {
      argName = part.replace(/[\[\]]/g, '');
      required = false;
    }
  }

  // Also check for <arg> or [arg] embedded in flags string after the long flag
  const argMatch = flags.match(/[<[]([^\]>]+)[>\]]/);
  if (argMatch) {
    argName = argMatch[1];
    required = flags.includes('<' + argMatch[1] + '>');
  }

  // Derive camelCase key from long flag name (strip leading --)
  const rawKey = negate
    ? long.slice(2)                // "--no-" was already stripped above
    : long.slice(2);
  const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  return { short, long, key, argName, required, negate };
}

function parseArgSpec(spec: string): { name: string; args: ArgDef[] } {
  const tokens = spec.trim().split(/\s+/);
  const name = tokens[0];
  const args: ArgDef[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('<')) {
      args.push({ name: t.replace(/[<>]/g, ''), required: true });
    } else if (t.startsWith('[')) {
      args.push({ name: t.replace(/[\[\]]/g, ''), required: false });
    }
  }
  return { name, args };
}

// ─────────────────────────────────────────────────────────────────────────────

export class Command {
  private _name        = '';
  private _description = '';
  private _version     = '';
  private _helpBefore  = '';
  private _aliases: string[]     = [];
  private _options:  OptionDef[] = [];
  private _args:     ArgDef[]    = [];
  private _action?:  (...a: unknown[]) => unknown;
  private _subs:     Command[]   = [];
  private _parent?:  Command;

  // ── Builder methods ─────────────────────────────────────────────────────────

  name(n: string)        { this._name = n;        return this; }
  description(d: string) { this._description = d; return this; }
  version(v: string)     { this._version = v;     return this; }
  alias(a: string)       { this._aliases.push(a); return this; }

  addHelpText(position: 'beforeAll' | 'afterAll' | 'before' | 'after', text: string) {
    if (position === 'beforeAll') this._helpBefore = text;
    return this;
  }

  command(spec: string): Command {
    const { name, args } = parseArgSpec(spec);
    const sub = new Command();
    sub._name   = name;
    sub._args   = args;
    sub._parent = this;
    this._subs.push(sub);
    return sub;
  }

  option(
    flags:            string,
    desc:             string,
    coerceOrDefault?: ((val: string, prev: unknown) => unknown) | unknown,
    defaultVal?:      unknown,
  ): this {
    const parsed = parseFlagSpec(flags);

    let coerce: OptionDef['coerce'] = null;
    let def: unknown;

    if (typeof coerceOrDefault === 'function') {
      coerce = coerceOrDefault as (val: string, prev: unknown) => unknown;
      def    = defaultVal;
    } else if (coerceOrDefault !== undefined) {
      def = coerceOrDefault;
    } else {
      // Boolean flag default
      def = parsed.negate ? true : (parsed.argName ? undefined : false);
    }

    this._options.push({ ...parsed, coerce, default: def, desc });
    return this;
  }

  action(fn: (...args: unknown[]) => unknown): this {
    this._action = fn;
    return this;
  }

  // ── Help text ───────────────────────────────────────────────────────────────

  private helpText(): string {
    const root = this._getRootParent();
    const lines: string[] = [];

    if (root._helpBefore) lines.push(root._helpBefore);

    lines.push(`${BOLD}Usage:${RESET}  ${CYAN}${root._name}${RESET} ${YELLOW}<command>${RESET} [options]\n`);
    lines.push(`${BOLD}Commands:${RESET}`);

    for (const sub of root._subs) {
      const aliases = sub._aliases.length ? ` (${DIM}alias: ${sub._aliases.join(', ')}${RESET})` : '';
      const argStr  = sub._args.map(a => a.required ? `<${a.name}>` : `[${a.name}]`).join(' ');
      lines.push(`  ${GREEN}${sub._name}${RESET} ${YELLOW}${argStr}${RESET}${aliases}`);
      lines.push(`  ${DIM}${sub._description}${RESET}\n`);
    }

    lines.push(`\n${BOLD}Options for ${CYAN}generate${RESET}${BOLD}:${RESET}`);
    const genCmd = root._subs.find(s => s._name === 'generate');
    if (genCmd) {
      for (const o of genCmd._options) {
        const flagStr = [o.short, o.long + (o.argName ? ` <${o.argName}>` : '')].filter(Boolean).join(', ');
        lines.push(`  ${GREEN}${flagStr.padEnd(38)}${RESET} ${o.desc}${o.default !== undefined && o.default !== false ? ` ${DIM}[default: ${o.default}]${RESET}` : ''}`);
      }
    }

    lines.push(`\n  ${GREEN}--version${RESET.padEnd(36)}    Print version`);
    lines.push(`  ${GREEN}-h, --help${RESET.padEnd(34)}    Show this help\n`);

    return lines.join('\n');
  }

  private _getRootParent(): Command {
    return this._parent ? this._parent._getRootParent() : this;
  }

  // ── Arg/option parsing ──────────────────────────────────────────────────────

  private parseOptions(argv: string[]): { opts: Record<string, unknown>; positionals: string[] } {
    // Seed defaults
    const opts: Record<string, unknown> = {};
    for (const o of this._options) {
      if (o.default !== undefined) opts[o.key] = o.default;
    }

    const positionals: string[] = [];
    let i = 0;

    while (i < argv.length) {
      const arg = argv[i];

      // --no-xxx
      if (arg.startsWith('--no-')) {
        const key = arg.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const opt = this._options.find(o => o.key === key || o.negate && o.key === key);
        if (opt) { opts[opt.key] = false; i++; continue; }
      }

      // --long-flag or -s (short)
      const opt = this._options.find(o =>
        o.long === arg || o.short === arg || `${o.long}` === arg
      );

      if (opt) {
        if (opt.argName) {
          const val = argv[++i];
          if (val === undefined) throw new Error(`Option ${arg} requires an argument.`);
          opts[opt.key] = opt.coerce ? opt.coerce(val, opts[opt.key]) : val;
        } else {
          opts[opt.key] = !opt.negate;
        }
        i++;
        continue;
      }

      // --version / -V
      if (arg === '--version' || arg === '-V') {
        const root = this._getRootParent();
        console.log(`${root._name} v${root._version}`);
        process.exit(0);
      }

      // --help / -h
      if (arg === '--help' || arg === '-h') {
        console.log(this._getRootParent().helpText());
        process.exit(0);
      }

      positionals.push(arg);
      i++;
    }

    return { opts, positionals };
  }

  // ── Entry point ─────────────────────────────────────────────────────────────

  async parseAsync(argv: string[]): Promise<void> {
    const args = argv.slice(2);

    // Top-level flags before any subcommand
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      console.log(this.helpText());
      return;
    }
    if (args[0] === '--version' || args[0] === '-V') {
      console.log(`${this._name} v${this._version}`);
      return;
    }

    const cmdName = args[0];
    const sub = this._subs.find(
      s => s._name === cmdName || s._aliases.includes(cmdName)
    );

    if (!sub) {
      console.error(`\nUnknown command: "${cmdName}"\n`);
      console.log(this.helpText());
      process.exit(1);
    }

    const rest = args.slice(1);

    // Show subcommand help
    if (rest[0] === '--help' || rest[0] === '-h') {
      console.log(this.helpText());
      return;
    }

    const { opts, positionals } = sub.parseOptions(rest);

    // Map positionals to declared arg defs
    const callArgs: unknown[] = positionals.slice(0, sub._args.length);

    // Validate required positional args
    for (let i = 0; i < sub._args.length; i++) {
      if (sub._args[i].required && callArgs[i] === undefined) {
        console.error(`\nError: <${sub._args[i].name}> is required.\n`);
        console.log(this.helpText());
        process.exit(1);
      }
    }

    if (sub._action) {
      await sub._action(...callArgs, opts);
    }
  }
}
