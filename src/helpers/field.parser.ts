// ─────────────────────────────────────────────────────────────────────────────
// Field parser
//
// Parses field spec strings into FieldDef objects.
//
// Format:  "name:type"  or  "name:type:validator1,validator2(arg)"
//
// Examples:
//   "firstName:string"
//   "email:string:required,email"
//   "age:number:min(0),max(120)"
//   "birthDate:Date:required"
//   "role:UserRole:required"              ← custom / enum type
//   "password:string:required,minLength(8),maxLength(64)"
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = "string" | "number" | "boolean" | "Date" | (string & {});

export interface ValidatorDef {
  name: string;
  arg?: string;
}

export interface FieldDef {
  fieldName:  string;
  fieldType:  FieldType;
  required:   boolean;
  validators: ValidatorDef[];
}

const KNOWN_VALIDATORS = new Set([
  "required", "email", "minlength", "maxlength",
  "min", "max", "pattern", "nullvalidator", "requiredtrue",
]);

function parseValidator(token: string): ValidatorDef {
  token = token.trim();
  const open = token.indexOf("(");
  if (open === -1) return { name: token };
  return {
    name: token.slice(0, open).trim(),
    arg:  token.slice(open + 1, token.lastIndexOf(")")).trim(),
  };
}

function splitValidators(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of raw) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;

    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function parseField(spec: string): FieldDef {
  const firstColon = spec.indexOf(":");
  if (firstColon === -1) {
    throw new Error(
      `Invalid field spec "${spec}". Expected: "name:type" or "name:type:validators"`,
    );
  }

  const fieldName   = spec.slice(0, firstColon).trim();
  const rest        = spec.slice(firstColon + 1);
  const secondColon = rest.indexOf(":");
  const fieldType   = (secondColon === -1 ? rest : rest.slice(0, secondColon)).trim() as FieldType;
  const validatorStr = secondColon === -1 ? "" : rest.slice(secondColon + 1).trim();

  if (!fieldName) throw new Error(`Field name is empty in spec: "${spec}"`);
  if (!fieldType) throw new Error(`Field type is empty in spec: "${spec}"`);

  const validators = validatorStr.length > 0
    ? splitValidators(validatorStr).map(parseValidator)
    : [];

  const required = validators.some(v => v.name.toLowerCase() === "required");

  return { fieldName, fieldType, required, validators };
}

export function parseFields(specs: string[]): FieldDef[] {
  return specs.map((spec, i) => {
    try {
      return parseField(spec);
    } catch (e) {
      throw new Error(`Error in field #${i + 1} ("${spec}"): ${(e as Error).message}`);
    }
  });
}

export function canonicalValidatorName(name: string): string {
  const map: Record<string, string> = {
    required:      "required",
    email:         "email",
    minlength:     "minLength",
    maxlength:     "maxLength",
    min:           "min",
    max:           "max",
    pattern:       "pattern",
    nullvalidator: "nullValidator",
    requiredtrue:  "requiredTrue",
  };
  return map[name.toLowerCase()] ?? name;
}

export function collectAngularValidators(fields: FieldDef[]): string[] {
  const names = new Set<string>();
  for (const f of fields) {
    for (const v of f.validators) {
      if (KNOWN_VALIDATORS.has(v.name.toLowerCase())) {
        names.add(canonicalValidatorName(v.name));
      }
    }
  }
  return Array.from(names).sort();
}
