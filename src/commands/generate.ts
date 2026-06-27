import * as p from "../libs/ui";
import { parseFields } from "../helpers/field.parser";
import { deriveNames } from "../helpers/naming";
import {
  generateTypes,
  generateFormGroup,
  generateFactory,
  generateBarrel,
  ensureDir,
  writeTs,
  resolveOutputDir,
} from "../libs/generate";
import * as path from "path";

export interface GenerateOptions {
  field:       string[];
  output:      string;
  prefix:      string;
  strictTypes: boolean;
  flatten:     boolean;
  barrel:      boolean;
  dryRun:      boolean;
}

export async function generateCommand(
  formName: string,
  options: GenerateOptions,
): Promise<void> {
  console.clear();
  p.intro("ts-form-gen");

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!options.field || options.field.length === 0) {
    p.log.error(
      'No fields provided. Add at least one field with -f.\n' +
      '  Example: ts-form-gen generate UserProfile -f "email:string:required,email"',
    );
    process.exit(1);
  }

  // ── Parse fields ────────────────────────────────────────────────────────────
  const spinner = p.spinner();

  spinner.start("Parsing field definitions...");

  let fields;
  try {
    fields = parseFields(options.field);
    spinner.stop(`Parsed ${fields.length} field${fields.length !== 1 ? "s" : ""}`);
  } catch (err) {
    spinner.stop(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Derive names ────────────────────────────────────────────────────────────
  const names = deriveNames(formName, options.prefix);

  p.log.info(`Form name   → ${names.pascal}`);
  p.log.info(`FormGroup   → ${names.formGroupType}`);
  p.log.info(`Value type  → ${names.formValueInterface}`);
  p.log.info(`Factory fn  → ${names.factoryFn}()`);
  if (options.prefix) {
    p.log.info(`Prefix applied: "${options.prefix}"`);
  }

  // ── Generate source ─────────────────────────────────────────────────────────
  spinner.start("Generating source files...");

  const typesSource     = generateTypes(names, fields);
  const formGroupSource = generateFormGroup(names, fields, { strictTypes: options.strictTypes });
  const factorySource   = generateFactory(names, fields);
  const indexSource     = options.barrel ? generateBarrel(names) : null;

  spinner.stop("Source generated");

  // ── Resolve output paths ────────────────────────────────────────────────────
  const outDir = resolveOutputDir(options.output, names.folderName, options.flatten);

  const files: { name: string; source: string }[] = [
    { name: names.typesFile,     source: typesSource     },
    { name: names.formGroupFile, source: formGroupSource },
    { name: names.factoryFile,   source: factorySource   },
  ];
  if (indexSource) {
    files.push({ name: names.indexFile, source: indexSource });
  }

  // ── Dry run ─────────────────────────────────────────────────────────────────
  if (options.dryRun) {
    p.log.warn("Dry run — no files will be written");

    for (const f of files) {
      p.note(f.source, `📄 ${path.join(outDir, f.name)}`);
    }

    p.outro("Dry run complete — remove --dry-run to write files");
    return;
  }

  // ── Write files ─────────────────────────────────────────────────────────────
  spinner.start(`Writing to ${outDir}/`);

  try {
    ensureDir(outDir);
    for (const f of files) {
      await writeTs(path.join(outDir, f.name), f.source);
    }
    spinner.stop(`Wrote ${files.length} files to ${outDir}/`);
  } catch (err) {
    spinner.stop(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  for (const f of files) {
    p.log.step(f.name);
  }

  // ── Usage hint ──────────────────────────────────────────────────────────────
  const importPath = options.flatten
    ? `./${names.folderName}`
    : `./${path.relative(options.output, outDir)}`;

  const importHint = options.barrel
    ? `import { ${names.formGroupFactoryFn}, ${names.factoryFn} } from '${importPath}';`
    : [
        `import { ${names.formGroupFactoryFn} } from '${importPath}/${names.formGroupFile.replace(".ts", "")}';`,
        `import { ${names.factoryFn} } from '${importPath}/${names.factoryFile.replace(".ts", "")}';`,
      ].join("\n");

  p.note(importHint, "Import hint");

  p.outro(`${names.formGroupType} is ready!`);
}
