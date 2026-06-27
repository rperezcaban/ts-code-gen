// ─────────────────────────────────────────────────────────────────────────────
// Generate command
//
// Orchestrates parsing → name derivation → code generation → file writing.
// ─────────────────────────────────────────────────────────────────────────────

import * as path from 'path';
import { parseFields } from '../parsers/field.parser';
import { deriveNames } from '../utils/naming.utils';
import { generateTypes } from '../generators/types.generator';
import { generateFormGroup } from '../generators/form-group.generator';
import { generateFactory } from '../generators/factory.generator';
import { generateIndex } from '../generators/index.generator';
import { ensureDir, writeTs, resolveOutputDir } from '../utils/file.utils';

export interface GenerateOptions {
  /** Raw field spec strings, e.g. ["firstName:string:required", "age:number"] */
  fields: string[];
  /** Output base directory (default: cwd) */
  output: string;
  /** Optional prefix prepended to all generated type/function names */
  prefix: string;
  /** Emit Angular 14+ typed FormGroup (default: true) */
  strictTypes: boolean;
  /** Flatten files directly into output dir instead of creating a sub-folder */
  flatten: boolean;
  /** Emit an index.ts barrel file */
  barrel: boolean;
  /** Print what would be generated without writing files */
  dryRun: boolean;
}

/** Entry point called by the CLI. */
export async function runGenerate(formName: string, opts: GenerateOptions): Promise<void> {
  // ── 1. Parse fields ────────────────────────────────────────────────────────
  if (opts.fields.length === 0) {
    console.error(
      '\nError: at least one --field (-f) is required.\n' +
      'Example: ts-form-gen generate UserProfile --field "email:string:required,email"\n',
    );
    process.exit(1);
  }

  const fields = parseFields(opts.fields);

  // ── 2. Derive names ────────────────────────────────────────────────────────
  const names = deriveNames(formName, opts.prefix);

  // ── 3. Generate source strings ─────────────────────────────────────────────
  const typesSource     = generateTypes(names, fields);
  const formGroupSource = generateFormGroup(names, fields, { strictTypes: opts.strictTypes });
  const factorySource   = generateFactory(names, fields);
  const indexSource     = opts.barrel ? generateIndex(names) : null;

  // ── 4. Resolve output paths ────────────────────────────────────────────────
  const outDir = resolveOutputDir(opts.output, names.folderName, opts.flatten);

  const files: Array<{ relPath: string; source: string }> = [
    { relPath: names.typesFile,    source: typesSource     },
    { relPath: names.formGroupFile, source: formGroupSource },
    { relPath: names.factoryFile,  source: factorySource   },
  ];
  if (indexSource) {
    files.push({ relPath: names.indexFile, source: indexSource });
  }

  // ── 5. Dry-run or write ────────────────────────────────────────────────────
  if (opts.dryRun) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`DRY RUN — files that would be written to: ${outDir}`);
    console.log('─'.repeat(70));
    for (const { relPath, source } of files) {
      const fullPath = path.join(outDir, relPath);
      console.log(`\n📄 ${fullPath}\n`);
      console.log(source);
      console.log('─'.repeat(70));
    }
    console.log('\nNo files were written (dry run).\n');
    return;
  }

  ensureDir(outDir);

  console.log(`\nGenerating ${names.formGroupType} files in ${outDir}/\n`);

  for (const { relPath, source } of files) {
    const fullPath = path.join(outDir, relPath);
    await writeTs(fullPath, source);
    console.log(`  ✓ ${relPath}`);
  }

  console.log('\nDone!\n');

  // ── 6. Usage hint ──────────────────────────────────────────────────────────
  const importPath = opts.flatten
    ? `./${names.folderName}`
    : `./${path.relative(opts.output, outDir)}`;

  console.log(`Import from your component:\n`);
  if (opts.barrel) {
    console.log(`  import { ${names.formGroupFactoryFn}, ${names.factoryFn} } from '${importPath}';\n`);
  } else {
    console.log(`  import { ${names.formGroupFactoryFn} } from '${importPath}/${names.formGroupFile.replace('.ts', '')}';`);
    console.log(`  import { ${names.factoryFn} } from '${importPath}/${names.factoryFile.replace('.ts', '')}';\n`);
  }
}
