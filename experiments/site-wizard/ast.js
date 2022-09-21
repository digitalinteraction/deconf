import * as es from "@babel/types";
import { CodeGenerator } from "@babel/generator";

//
// Exploring using JavaScript AST to generate sourcecode
//

function generate(...args) {
  const some = new CodeGenerator(...args);
  return some.generate().code;
}

/** @param {string} i */
export function iconName(i) {
  const parts = i
    .split(/-+/)
    .map((p) => p.slice(0, 1).toLocaleUpperCase() + p.slice(1));
  return "fa" + parts.join("");
}

/** @param {Map<string, [string,string]>} faIcons */
export function getIconsJs(faIcons) {
  const importUrls = {
    fas: "@fortawesome/free-solid-svg-icons",
    far: "@fortawesome/free-regular-svg-icons",
    fab: "@fortawesome/free-brands-svg-icons",
  };
  const icons = Array.from(faIcons.values());

  /** @type {Record<string, Set<string>>}  */
  const usage = {
    fas: new Set(),
    far: new Set(),
    fab: new Set(),
  };
  for (const icon of icons) {
    const set = usage[icon[0]];
    if (!set) throw new Error(`Unknown icon set '${icon[0]}'`);
    set.add(icon[1]);
  }

  return generate(
    es.program([
      es.importDeclaration(
        [
          es.importSpecifier(
            es.identifier("library"),
            es.identifier("library")
          ),
        ],
        es.stringLiteral("@fortawesome/fontawesome-svg-core")
      ),

      ...Object.entries(usage)
        .filter((entry) => entry[1].size > 0)
        .map(([kind, icons]) =>
          es.importDeclaration(
            Array.from(icons).map((i) =>
              es.importSpecifier(
                es.identifier(iconName(i)),
                es.identifier(iconName(i))
              )
            ),
            es.stringLiteral(importUrls[kind])
          )
        ),

      es.expressionStatement(
        es.callExpression(
          es.memberExpression(es.identifier("library"), es.identifier("add")),
          Object.values(usage)
            .flatMap((s) => Array.from(s))
            .map((n) => es.identifier(iconName(n)))
        )
      ),
    ])
  );
}

export function getConfigJs(config) {
  return generate(
    es.program([
      es.expressionStatement(
        es.assignmentExpression(
          "=",
          es.memberExpression(
            es.identifier("window"),
            es.identifier("DECONF_CONFIG")
          ),
          es.callExpression(
            es.memberExpression(es.identifier("JSON"), es.identifier("parse")),
            [es.stringLiteral(JSON.stringify(config))]
          )
        )
      ),
    ])
  );
}
