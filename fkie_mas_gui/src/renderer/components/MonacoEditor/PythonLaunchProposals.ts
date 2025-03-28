import { Monaco } from "@monaco-editor/react";
import { languages } from "monaco-editor/esm/vs/editor/editor.api";

import { RosPackage } from "@/renderer/models";
import { TFileRange } from "@/types";

// Method,Function,Constructor,Field,Variable,Class,Struct,Interface,Module,Property,Event,Operator,Unit,Value,Constant,Enum,EnumMember,Keyword,Text,Color,File,Reference,Customcolor,Folder,TypeParameter,User,Issue,Snippet

export function createPythonLaunchProposals(
  monaco: Monaco,
  range: TFileRange,
  clipText: string,
  text: string,
  packages: RosPackage[]
): languages.CompletionItem[] {
  // returning a static list of proposals, valid for ROS launch and XML  files

  // List of suggestions
  return [
    ...createFunctionList(text, monaco, range),
    ...createRosList(clipText, monaco, range),
    ...createPackageList(packages, monaco, range),
    ...createWordList(text, monaco, range),
  ];
}

function createRosList(clipText: string, monaco: Monaco, range: TFileRange): languages.CompletionItem[] {
  function getClip(defaultValue: string | undefined): string | undefined {
    const text = clipText?.replace(/(\r\n.*|\n.*|\r.*)/gm, "");
    return text || defaultValue;
  }

  return [
    {
      label: "Node",
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: "Add a new ROS Node",
      insertText:
        "Node(name='${1:NAME}', package='${2:PACKAGE}', executable='${3:TYPE}', output='screen', respawn=use_respawn, respawn_delay=2.0, parameters=[${4:{'autostart': autostart}}], arguments=[${5:'--ros-args', '--log-level', log_level}], remappings=[${6:('topic', 'topic_test')}])",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "DeclareLaunchArgument",
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: "Add a new ROS DeclareLaunchArgument",
      insertText: `declare_\${1:${getClip("NAME")}} = DeclareLaunchArgument('\${2:${getClip("NAME")}}', default_value='\${3:VALUE}', description='')`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "IncludeLaunchDescription (python)",
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: "Add a new include statement",
      insertText:
        "IncludeLaunchDescription(PythonLaunchDescriptionSource(os.path.join(get_package_share_directory('${1:PACKAGE}'), 'launch', '${2:FILE}')), launch_arguments={${3:'namespace': namespace}}.items())",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "from launch.conditions import IfCondition",
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText: "from launch.conditions import IfCondition",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "from launch.actions import IncludeLaunchDescription",
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText: "from launch.actions import IncludeLaunchDescription",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: "from launch.launch_description_sources import PythonLaunchDescriptionSource",
      kind: monaco.languages.CompletionItemKind.Reference,
      insertText: "from launch.launch_description_sources import PythonLaunchDescriptionSource",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
  ];
}

function createFunctionList(text: string, monaco: Monaco, range: TFileRange): languages.CompletionItem[] {
  const functions = text.match(/(\w+\()/gm);
  const result = [...new Set(functions)].map((func) => {
    return {
      label: `${func})`,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: `${func}\${1:})`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    };
  });
  return result ? result : [];
}

function createWordList(text: string, monaco: Monaco, range: TFileRange): languages.CompletionItem[] {
  const words = text.match(/([a-zA-Z_-]+\s)/gm);
  const result = [...new Set(words)].map((word) => {
    return {
      label: `${word}`,
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: `${word}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    };
  });
  return result ? result : [];
}

function createPackageList(packages: RosPackage[], monaco: Monaco, range: TFileRange): languages.CompletionItem[] {
  const result = packages?.map((item: RosPackage) => {
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
