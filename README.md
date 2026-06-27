# ts-form-gen

A CLI tool that generates Angular Reactive Form boilerplate — typed `FormGroup`, value interfaces, and plain-object test factories — from a single command.

```
 ████████╗███████╗    ███████╗ ██████╗ ██████╗ ███╗   ███╗      ██████╗ ███████╗███╗  ██╗
 ╚══██╔══╝██╔════╝    ██╔════╝██╔═══██╗██╔══██╗████╗ ████║     ██╔════╝ ██╔════╝████╗ ██║
    ██║   ███████╗    █████╗  ██║   ██║██████╔╝██╔████╔██║     ██║  ███╗█████╗  ██╔██╗██║
    ██║   ╚════██║    ██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║     ██║   ██║██╔══╝  ██║╚████║
    ██║   ███████║    ██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║     ╚██████╔╝███████╗██║ ╚███║
    ╚═╝   ╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝     ╚═════╝ ╚══════╝╚═╝  ╚══╝
                      angular reactive forms code generator
```

---

## What it does

Instead of hand-writing the same FormGroup, interface, and factory for every form in your Angular app, you describe the fields once on the command line and `ts-form-gen` writes all three files for you:

| Generated file | What it contains |
|---|---|
| `<name>.types.ts` | `FormValue` and `FormRawValue` TypeScript interfaces |
| `<name>.form-group.ts` | Typed `FormGroup` type alias + `createXxxFormGroup(fb)` factory function |
| `<name>.factory.ts` | `createXxxFormValue()` and `createXxxFormRawValue()` plain-object factories for unit tests |
| `index.ts` *(optional)* | Barrel re-export of everything above |

All output uses the **Angular 14+ typed forms API** (`FormGroup<{ … }>`, `FormControl<T>`) by default.

---

## Installation

### Global install (recommended)

```bash
npm install -g ts-form-gen
```

Then use it anywhere:

```bash
ts-form-gen generate UserProfile -f "email:string:required,email" -o src/forms
```

### Run without installing

```bash
npx ts-form-gen generate UserProfile -f "email:string:required,email" -o src/forms
```

### Local project install

```bash
npm install --save-dev ts-form-gen
npx ts-form-gen generate ...
```

---

## Quick start

```bash
ts-form-gen generate UserProfile \
  -f "firstName:string:required" \
  -f "lastName:string:required" \
  -f "email:string:required,email" \
  -f "age:number:min(0),max(120)" \
  -f "acceptedTerms:boolean:requiredTrue" \
  -f "birthDate:Date" \
  -o src/forms \
  --barrel
```

This creates `src/forms/user-profile/` with four files and prints an import hint:

```
import { createUserProfileFormGroup, createUserProfileFormValue } from './user-profile';
```

---

## Field spec format

Every field is passed with `-f` (repeat the flag for each field):

```
-f "fieldName:type"
-f "fieldName:type:validator"
-f "fieldName:type:validator1,validator2(arg)"
```

### Supported types

| Spec type | TypeScript type | FormControl default |
|---|---|---|
| `string` | `string` | `''` |
| `number` | `number` | `null` |
| `boolean` | `boolean` | `null` |
| `Date` | `Date` | `null` |
| `MyEnum` | `MyEnum` *(pass-through)* | `null` |

> Any type you write that isn't one of the four built-ins is passed through as-is, so custom types and enums work out of the box.

### Supported validators

| Validator spec | Angular output |
|---|---|
| `required` | `Validators.required` |
| `email` | `Validators.email` |
| `minLength(n)` | `Validators.minLength(n)` |
| `maxLength(n)` | `Validators.maxLength(n)` |
| `min(n)` | `Validators.min(n)` |
| `max(n)` | `Validators.max(n)` |
| `pattern(regex)` | `Validators.pattern('regex')` |
| `requiredTrue` | `Validators.requiredTrue` |

Multiple validators are comma-separated: `required,email` or `required,minLength(8),maxLength(64)`.

---

## All options

```
ts-form-gen generate <formName> [options]
ts-form-gen g <formName> [options]          (alias)
```

| Flag | Description | Default |
|---|---|---|
| `-f, --field <spec>` | Field spec — repeat per field | *(required)* |
| `-o, --output <dir>` | Output base directory | `.` |
| `-p, --prefix <name>` | Prefix prepended to all type/function names | `""` |
| `--no-strict-types` | Emit untyped `FormGroup` (pre-Angular 14) | strict types on |
| `--flatten` | Write files directly into output dir, no sub-folder | off |
| `--barrel` | Also emit an `index.ts` barrel re-export | off |
| `-n, --dry-run` | Print generated output without writing files | off |
| `-h, --help` | Show help | |
| `--version` | Print version | |

---

## Examples

### Basic form

```bash
ts-form-gen generate ContactForm \
  -f "name:string:required" \
  -f "email:string:required,email" \
  -f "message:string:required,minLength(10),maxLength(500)" \
  -o src/forms
```

### Form with a custom enum type

```bash
ts-form-gen generate Product \
  -f "name:string:required,minLength(2),maxLength(100)" \
  -f "price:number:required,min(0)" \
  -f "category:ProductCategory:required" \
  -f "description:string" \
  -f "inStock:boolean:required" \
  -o src/forms --barrel
```

### Prefixed names (useful for feature modules)

```bash
ts-form-gen generate Login \
  -f "username:string:required" \
  -f "password:string:required,minLength(8)" \
  -f "rememberMe:boolean" \
  -p "Auth" -o src/auth --flatten
```

Generates `AuthLoginFormGroup`, `createAuthLoginFormGroup()`, `createAuthLoginFormValue()`, etc.

### Preview without writing

```bash
ts-form-gen generate UserProfile \
  -f "firstName:string:required" \
  -f "email:string:required,email" \
  --dry-run
```

---

## Generated file examples

Given:

```bash
ts-form-gen generate UserProfile \
  -f "firstName:string:required" \
  -f "email:string:required,email" \
  -f "age:number:min(0),max(120)"
```

### `user-profile.types.ts`

```typescript
export interface UserProfileFormValue {
  firstName: string;
  email: string;
  age: number | null;
}

export interface UserProfileFormRawValue {
  firstName: string;
  email: string;
  age: number;
}
```

### `user-profile.form-group.ts`

```typescript
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

export type UserProfileFormGroup = FormGroup<{
  firstName: FormControl<string>;
  email: FormControl<string>;
  age: FormControl<number | null>;
}>;

export function createUserProfileFormGroup(fb: FormBuilder): UserProfileFormGroup {
  return fb.group({
    firstName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    age: [null, [Validators.min(0), Validators.max(120)]],
  });
}
```

### `user-profile.factory.ts`

```typescript
export function createUserProfileFormValue(
  overrides?: Partial<UserProfileFormValue>,
): UserProfileFormValue {
  return {
    firstName: '',
    email: '',
    age: null,
    ...overrides,
  };
}

export function createUserProfileFormRawValue(
  overrides?: Partial<UserProfileFormRawValue>,
): UserProfileFormRawValue {
  return {
    firstName: '',
    email: '',
    age: 0,
    ...overrides,
  };
}
```

### Using in a component

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { createUserProfileFormGroup } from './user-profile/user-profile.form-group';

@Component({ ... })
export class UserProfileComponent {
  private readonly fb = inject(FormBuilder);
  readonly form = createUserProfileFormGroup(this.fb);

  onSubmit() {
    const value = this.form.getRawValue(); // fully typed UserProfileFormRawValue
  }
}
```

### Using the factory in a unit test

```typescript
import { createUserProfileFormValue } from './user-profile/user-profile.factory';

it('should mark form invalid when email is missing', () => {
  const value = createUserProfileFormValue({ email: '' });
  component.form.setValue(value);
  expect(component.form.get('email')?.valid).toBe(false);
});
```

---

## How it works

```
ts-form-gen generate <formName> -f "field:type:validators" ...
       │
       ▼
  field.parser.ts        Parses each -f spec into a FieldDef object
       │
       ▼
  naming.ts              Derives PascalCase, camelCase, kebab-case names
       │                 for all generated types and functions
       ▼
  generate.ts (libs)     Four generator functions produce TypeScript
       │                 source strings from the FieldDef list
       ▼
  Prettier (if available) Formats the output before writing
       │
       ▼
  dist/<formName>/       Files written to disk
```

The tool has **zero runtime dependencies**. It ships as a single bundled Node.js file (`dist/index.js`) built with Bun, so it runs anywhere Node ≥ 18 is installed without needing to `npm install` anything in a `node_modules` folder.

---

## Project structure

```
src/
  index.ts              Entry point — ASCII banner + CLI program setup
  commands/
    generate.ts         generate command handler (spinner UI, validation, file writing)
  libs/
    commander.ts        Local Commander.js-compatible argument parser
    ui.ts               Local @clack/prompts-compatible terminal UI (spinner, intro, outro)
    generate.ts         All code generators (types, form-group, factory, barrel)
  helpers/
    field.parser.ts     Parses "name:type:validators" field spec strings
    naming.ts           Derives all names (PascalCase, kebab-case, etc.) from the form name
```

---

## Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- Node.js ≥ 18

### Setup

```bash
git clone https://github.com/rperezcaban/ts-code-gen.git
cd ts-code-gen
bun run build
```

### Run from source

```bash
bun run dev generate UserProfile -f "email:string:required,email"
```

### Build

```bash
bun run build
# outputs dist/index.js — a self-contained Node.js binary
```

### Test locally before publishing

```bash
npm link
ts-form-gen --help
```

### Publish

```bash
npm publish
```

The `prepare` script runs `bun run build` automatically before the package is packed.

---

## License

MIT
