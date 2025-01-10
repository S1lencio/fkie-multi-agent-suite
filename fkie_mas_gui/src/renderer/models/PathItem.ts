import { generateUniqueId } from "../utils";
/**
 * PathItem models files in a package
 */
export default class PathItem {
  id: string;

  path: string;

  mtime: number;

  size: number;

  type: string;

  host: string;

  // these values are updated in package explorer after the item is received
  name?: string;
  package?: string;
  relativePath?: string;

  constructor(path: string, mtime: number, size: number, type: string, host: string) {
    this.id = generateUniqueId();
    this.path = path;
    this.mtime = mtime;
    this.size = size;
    this.type = type;
    this.host = host;
  }
}
