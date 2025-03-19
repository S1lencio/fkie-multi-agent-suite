/* eslint-disable no-template-curly-in-string */

import { Monaco } from "@monaco-editor/react";
import { editor, languages } from "monaco-editor/esm/vs/editor/editor.api";

import { RosPackage } from "@/renderer/models";
import { TFileRange } from "@/types";

function createXMLDependencyProposals(
  monaco: Monaco,
  range: TFileRange,
  lineContent: string,
  clipText: string,
  packages: RosPackage[]
): languages.CompletionItem[] {
  // returning a static list of proposals, valid for ROS launch and XML  files

  // TODO: Unused function. Can it be removed?
  function getParamName(defaultValue: string | undefined): string | undefined {
    const text = clipText?.replace(/(\r\n.*|\n.*|\r.*)/gm, "");
    return text || defaultValue;
  }
  
  // List of suggestions
  return [
    ...createAttributeSuggestionsFromTag(monaco, range, lineContent),
    ...createTagSuggestions(monaco, range),
    ...createPackageList(packages, monaco, range),
  ];
}

function createPackageList(packages: RosPackage[], monaco: Monaco, range: TFileRange): languages.CompletionItem[] {
  const result = packages?.map((item: RosPackage) => {
    console.log(`create package : ${item.name}`);
    return {
      label: `${item.name}`,
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: `${item.name}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    };
  });
  return result ? result : [];
}

function createAttributeSuggestionsFromTag(monaco: Monaco, range: TFileRange, lineContent: string): languages.CompletionItem[] {
  const tags= ["launch", "node", "machine", "remap", "env", "param", "rosparam", "group", "test", "arg"]

  for (const tag in tags) {
    // if a tag is found, add its attributes as suggestions
    if (lineContent.includes("<" + tags[tag])) return createAttributeSuggestions(monaco, range, tags[tag])
  }
  // otherwise return nothing
  return [];
}

function createAttributeSuggestions(monaco: Monaco, range: TFileRange, tag: string): languages.CompletionItem[] {
  // return the valid attributes for each tag
  switch(tag) {
    case "launch":
      return [
        {
          label: "depricated",
          preselect: true,
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: "Add a deprication message to the launch configuration",
          insertText: 'depricated="${1:MESSAGE}"',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        },
      ];
    // or return nothing (which should never happen)
    default: return [];
  }
}

function createTagSuggestions(monaco: Monaco, range: TFileRange) {
  return [
    {
      label: "launch",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Create a new launch configuration",
      insertText: 'launch></launch>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "node",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS node",
      insertText: 'node name="${1:NAME}" pkg="${2:PACKAGE}" type="${3:TYPE}"></node>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "param",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS parameter",
      insertText: 'param name="\${1:${getParamName("NAME")}}" value="\${2:VALUE}" />',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "rosparam",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS parameter",
      insertText: 'rosparam subst_value="true">${1:VALUE}</rosparam>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "rosparam command",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS parameter",
      insertText:
        'rosparam command="load" file="$(find ${1:PACKAGE})/config/${2:FILE}.yaml" subst_value="true" clear_params="true"/>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "arg value",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS argument with value",
      insertText: 'arg name="${1:NAME}" value="${2:VALUE}" />',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "arg default",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new ROS argument with default",
      insertText: 'arg name="${1:NAME}" default="${2:DEFAULT}" />',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "include",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new include statement",
      insertText: 'include file="$(find ${1:PACKAGE})/launch/${2:FILE}"></include>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "group",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new group statement",
      insertText: "group></group>",
      range,
    },
    {
      label: "group ns",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new group statement with namespace",
      insertText: 'group ns="${1:NAMESPACE}"></group>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },

    {
      label: "remap",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Add a new remap statement",
      insertText: 'remap from="${1:FROM}" to="${2:TO}"/>',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },

    {
      label: "GDB Launch Prefix",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "GDB Launch Prefix",
      insertText: 'launch-prefix="gdb -ex run -ex bt -batch --args"',
      range,
    },

    {
      label: "nm/associations",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Associated ROS-Nodes are started before the node itself and stopped after the node.",
      insertText: 'param name="nm/associations" value="NODE1,NODE2" />',
      range,
    },
    {
      label: "nm/kill_on_stop",
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: "Kill the node after defined time in milliseconds",
      insertText: 'param name="nm/kill_on_stop" value="300" />',
      range,
    },
  ];
}

function createDocumentSymbols(model: editor.ITextModel /*, token*/): languages.DocumentSymbol[] {
  const parser = new DOMParser();

  const symbolList: languages.DocumentSymbol[] = [];

  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
    const lineContent = model.getLineContent(lineNumber);

    if (lineContent.length > 0) {
      const xml = parser.parseFromString(lineContent, "text/xml");

      // Add nodes as symbols
      const nodeElement = xml.querySelector("node");
      const nodeName = nodeElement?.getAttribute("name");
      if (nodeName) {
        const packageName = nodeElement?.getAttribute("pkg");
        const typeName = nodeElement?.getAttribute("type");
        symbolList.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
          name: nodeName,
          kind: 5,
          detail: "",
          containerName: `(${typeName}) [${packageName}]`,
          tags: [],
          selectionRange: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
        });
      }

      // Add parameters as symbols
      const parameterElement = xml.querySelector("param");
      const parameterName = parameterElement?.getAttribute("name");
      if (parameterName) {
        const parameterValue = parameterElement?.getAttribute("value");
        symbolList.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
          name: parameterName,
          kind: 6,
          detail: "",
          containerName: `[${parameterValue}]`,
          tags: [],
          selectionRange: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
        });
      }

      // Add arguments as symbols
      const argumentElement = xml.querySelector("arg");
      const argumentName = argumentElement?.getAttribute("name");
      if (argumentName) {
        const argumentValue = argumentElement?.getAttribute("value");
        const defaultValue = argumentElement?.getAttribute("default");
        symbolList.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
          name: argumentName,
          kind: 9,
          detail: "",
          containerName: argumentValue ? `[${argumentValue}]` : `[${defaultValue}]`,
          tags: [],
          selectionRange: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
        });
      }
    }
  }

  return symbolList;
}

export { createDocumentSymbols, createXMLDependencyProposals };
