// Derives all the class/function/file names used across generated files
// from a single raw form name string.

function tokenise(raw: string): string[] {
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.split(/[\s\-_]+/).filter(Boolean);
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toCamelCase(raw: string): string {
  const tokens = tokenise(raw);
  return tokens.map((t, i) => (i === 0 ? t.toLowerCase() : capitalise(t))).join("");
}

export function toPascalCase(raw: string): string {
  return tokenise(raw).map(capitalise).join("");
}

export function toKebabCase(raw: string): string {
  return tokenise(raw).map(t => t.toLowerCase()).join("-");
}

export interface FormNames {
  pascal:                string;
  camel:                 string;
  kebab:                 string;
  formValueInterface:    string;
  formRawValueInterface: string;
  formGroupType:         string;
  formGroupFactoryFn:    string;
  factoryFn:             string;
  rawFactoryFn:          string;
  typesFile:             string;
  formGroupFile:         string;
  factoryFile:           string;
  indexFile:             string;
  folderName:            string;
}

export function deriveNames(raw: string, prefix = ""): FormNames {
  const pascal = toPascalCase(raw);
  const camel  = toCamelCase(raw);
  const kebab  = toKebabCase(raw);
  const p      = prefix ? toPascalCase(prefix) : "";
  const base   = p + pascal;

  return {
    pascal,
    camel,
    kebab,
    formValueInterface:    `${base}FormValue`,
    formRawValueInterface: `${base}FormRawValue`,
    formGroupType:         `${base}FormGroup`,
    formGroupFactoryFn:    `create${base}FormGroup`,
    factoryFn:             `create${base}FormValue`,
    rawFactoryFn:          `create${base}FormRawValue`,
    typesFile:             `${kebab}.types.ts`,
    formGroupFile:         `${kebab}.form-group.ts`,
    factoryFile:           `${kebab}.factory.ts`,
    indexFile:             "index.ts",
    folderName:            kebab,
  };
}
