import { LayoutTabConfig } from '../pages/NodeManager/layout';

export const EVENT_CLOSE_COMPONENT = 'EVENT_CLOSE_COMPONENT' as const;
export const EVENT_OPEN_COMPONENT = 'EVENT_OPEN_COMPONENT' as const;
export const EVENT_OPEN_SETTINGS = 'EVENT_OPEN_SETTINGS' as const;
export const EVENT_OPEN_CONNECT = 'EVENT_OPEN_CONNECT' as const;

export function eventOpenComponent(
  id: string,
  title: string,
  component: any,
  closable: boolean = true,
  panelGroup: string = '', // panel or tab id where to place the new tab
  config: LayoutTabConfig = new LayoutTabConfig(false, panelGroup), // a place to hold json config for the hosted component
) {
  return {
    id: id,
    title,
    closable,
    component,
    panelGroup,
    config,
  };
}

export class SETTING extends String {
  static IDS = {
    INTERFACE: 'interface',
    SSH: 'ssh',
  };
}

export function eventOpenSettings(id: SETTING) {
  return { id };
}

export function eventCloseComponent(id: string) {
  return { id };
}
