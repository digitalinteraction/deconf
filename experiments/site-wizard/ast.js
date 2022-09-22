import path from "path";
import * as es from "@babel/types";
import { CodeGenerator } from "@babel/generator";
import { fontawesomeImports } from "./fontawesome.js";

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

/** @param {[string,string][]} faIcons */
export function getIconsJs(faIcons, config) {
  const usage = {
    fas: new Set(faIcons.filter((i) => i[0] === "fas").map((i) => i[1])),
    far: new Set(faIcons.filter((i) => i[0] === "far").map((i) => i[1])),
    fab: new Set(faIcons.filter((i) => i[0] === "fab").map((i) => i[1])),
  };

  const svgNames = new Map();
  const svgImports = [];
  for (const item of config.navigation) {
    if (svgNames.has(item.icon)) continue;
    const name = `icon${svgNames.size}`;
    svgNames.set(item.icon, name);
    svgImports.push(
      es.importDeclaration(
        [es.importDefaultSpecifier(es.identifier(name))],
        es.stringLiteral(`./${path.join("assets", item.icon)}?raw`)
      )
    );
  }

  const svgExport = es.exportNamedDeclaration(
    es.variableDeclaration("const", [
      es.variableDeclarator(
        es.identifier("navIcons"),
        es.objectExpression(
          Array.from(svgNames).map(([key, value]) =>
            es.objectProperty(es.stringLiteral(key), es.identifier(value))
          )
        )
      ),
    ])
  );

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
            es.stringLiteral(fontawesomeImports[kind])
          )
        ),

      ...svgImports,

      svgExport,

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

export function getConfigJs(appConfig, env) {
  return generate(
    es.program([
      es.importDeclaration(
        [
          es.importSpecifier(
            es.identifier("deepSeal"),
            es.identifier("deepSeal")
          ),
        ],
        es.stringLiteral("@openlab/deconf-ui-toolkit")
      ),

      es.exportNamedDeclaration(
        es.variableDeclaration("const", [
          es.variableDeclarator(
            es.identifier("appConfig"),
            es.callExpression(es.identifier("deepSeal"), [
              es.callExpression(
                es.memberExpression(
                  es.identifier("JSON"),
                  es.identifier("parse")
                ),
                [es.stringLiteral(JSON.stringify(appConfig))]
              ),
            ])
          ),
        ])
      ),

      es.exportNamedDeclaration(
        es.variableDeclaration("const", [
          es.variableDeclarator(
            es.identifier("env"),
            es.callExpression(es.identifier("deepSeal"), [
              es.callExpression(
                es.memberExpression(
                  es.identifier("JSON"),
                  es.identifier("parse")
                ),
                [es.stringLiteral(JSON.stringify(env))]
              ),
            ])
          ),
        ])
      ),
    ])
  );
}
