import { visit, DocumentNode, ASTNode } from "graphql";

export const supportedDirectives = (astNode: DocumentNode): void => {
  const supportedDirectives = ["imported", "imports"];
  const unsupportedUsages: string[] = [];

  visit(astNode, {
    enter: {
      Directive: (node) => {
        const name = node.name.value;

        if (!supportedDirectives.includes(name)) {
          unsupportedUsages.push(name);
        }
      },
    },
  });

  if (unsupportedUsages.length) {
    throw new Error(
      `Found the following usages of unsupported directives: \n${unsupportedUsages.map(
        (u) => `\n- @${u}`
      )}`
    );
  }
};

export const importsDirective = (astNode: DocumentNode): void => {
  visit(astNode, {
    enter: {
      ObjectTypeDefinition: (node) => {
        const badUsageLocations: string[] = [];

        const importsAllowedObjectTypes = ["Query", "Mutation"];
        const directives =
          node.directives &&
          node.directives.map((directive) => directive.name.value);

        if (
          directives &&
          directives.includes("imports") &&
          !importsAllowedObjectTypes.includes(node.name.value)
        ) {
          badUsageLocations.push(node.name.value);
        }

        if (badUsageLocations.length) {
          throw new Error(
            `@imports directive should only be used on QUERY or MUTATION type definitions, 
            but it is being used on the following ObjectTypeDefinitions: ${badUsageLocations.map(
              (b) => `\n- ${b}`
            )}`
          );
        }
      },
      Directive: (node) => {
        if (node.name.value !== "imports") {
          return;
        }

        const args = node.arguments || [];
        const typesArgument = args.find((arg) => arg.name.value === "types");

        if (!args.length || !typesArgument) {
          throw new Error(
            `@imports directive requires argument 'types' of type [String!]!`
          );
        }

        if (args.length > 1) {
          throw new Error(
            `@imports directive takes only one argument 'types', but found: ${args
              .filter((arg) => arg.name.value !== "types")
              .map((arg) => `\n- ${arg.name.value}`)}`
          );
        }

        if (typesArgument.value.kind === "ListValue") {
          const values = typesArgument.value.values;

          if (!values.length) {
            throw new Error(
              `@imports directive's 'types' argument of type [String!]! requires at least one value`
            );
          }

          const nonStringValues = values.filter(
            (value) => value.kind !== "StringValue"
          );

          if (nonStringValues.length) {
            throw new Error(
              `@imports directive's 'types' List values must be of type String, but found: \n${nonStringValues.map(
                (nonStringValue) => `\n -${nonStringValue.kind}`
              )}`
            );
          }
        }
      },
    },
  });
};

export const importedDirective = (astNode: ASTNode): void => {
  visit(astNode, {
    enter: {
      Directive: (node) => {
        if (node.name.value !== "imported") {
          return;
        }

        const args = node.arguments || [];
        const expectedArguments = ["namespace", "uri", "type"];
        const actualArguments = args.map((arg) => arg.name.value);

        const missingArguments = expectedArguments.filter(
          (expected) => !actualArguments.includes(expected)
        );

        if (missingArguments.length) {
          throw new Error(`@imported directive requires the following arguments:
          ${missingArguments.map((arg) => `\n- ${arg}`)}`);
        }

        const extraArguments = actualArguments.filter(
          (actual) => !expectedArguments.includes(actual)
        );

        if (extraArguments.length) {
          throw new Error(`@imported directive takes only 3 arguments: "namespace", "uri" and "type". But found:
          ${extraArguments.map((arg) => `\n- ${arg}`)}`);
        }
      },
    },
  });
};
