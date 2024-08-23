export default class CmdType extends String {
  static CMD = new CmdType("cmd");

  static SCREEN = new CmdType("screen");

  static LOG = new CmdType("log");

  static TERMINAL = new CmdType("terminal");

  static ECHO = new CmdType("echo");
}

export function cmdTypeFromString(type: string | undefined | null) {
  switch (type?.toLocaleLowerCase()) {
    case 'cmd':
      return CmdType.CMD;
    case 'screen':
      return CmdType.SCREEN;
    case 'log':
      return CmdType.LOG;
    case 'echo':
      return CmdType.ECHO;
    case 'terminal':
      return CmdType.TERMINAL;
    default:
      return CmdType.TERMINAL;
  }
}
