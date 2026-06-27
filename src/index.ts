import { Command } from "./libs/commander";
import { generateCommand } from "./commands/generate";

// ── Version (keep in sync with package.json) ──────────────────────────────────
const VERSION = "1.0.0";

// ── ANSI color codes ──────────────────────────────────────────────────────────
const C1  = "\x1b[95m";  // bright magenta
const C2  = "\x1b[35m";  // magenta
const C3  = "\x1b[34m";  // blue
const C4  = "\x1b[36m";  // cyan
const C5  = "\x1b[96m";  // bright cyan
const DIM = "\x1b[2m";
const RST = "\x1b[0m";

const BANNER = `
${C1} ████████╗███████╗${C2}    ███████╗ ██████╗ ██████╗ ███╗   ███╗${C3}      ██████╗ ███████╗███╗  ██╗
${C1} ╚══██╔══╝██╔════╝${C2}    ██╔════╝██╔═══██╗██╔══██╗████╗ ████║${C3}     ██╔════╝ ██╔════╝████╗ ██║
${C4}    ██║   ███████╗${C2}    █████╗  ██║   ██║██████╔╝██╔████╔██║${C5}     ██║  ███╗█████╗  ██╔██╗██║
${C4}    ██║   ╚════██║${C2}    ██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║${C5}     ██║   ██║██╔══╝  ██║╚████║
${C5}    ██║   ███████║${C2}    ██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║${C1}     ╚██████╔╝███████╗██║ ╚███║
${C5}    ╚═╝   ╚══════╝${C2}    ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝${C1}     ╚═════╝ ╚══════╝╚═╝  ╚══╝${RST}
${DIM}                      angular reactive forms code generator${RST}

${C4}version${RST} ${C5}v${VERSION}${RST}
`;

// ── Program ───────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("ts-form-gen")
  .description("Generate Angular Reactive Form groups, value types, and test factories")
  .version(VERSION)
  .addHelpText("beforeAll", BANNER);

program
  .command("generate <formName>")
  .alias("g")
  .description("Generate form-group, types, and factory files for an Angular reactive form")
  .option(
    "-f, --field <spec>",
    'Field spec "name:type[:validators]" — repeat per field. ' +
    "Validators: required, email, minLength(n), maxLength(n), min(n), max(n), pattern(re), requiredTrue",
    (val: string, prev: string[]) => [...prev, val],
    [] as string[],
  )
  .option("-o, --output <dir>",    "Output base directory",                              ".")
  .option("-p, --prefix <prefix>", "Prefix prepended to all generated type/function names", "")
  .option("--no-strict-types",     "Emit an untyped FormGroup (pre-Angular 14 compat)")
  .option("--flatten",             "Write files directly into output dir (no sub-folder)", false)
  .option("--barrel",              "Also emit an index.ts barrel re-export file",         false)
  .option("-n, --dry-run",         "Print what would be generated without writing files",  false)
  .action(generateCommand);

program.parseAsync(process.argv);
